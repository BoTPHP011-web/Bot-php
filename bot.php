import ccxt
import pandas as pd
from datetime import datetime
import telegram
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from ta.momentum import RSIIndicator
from ta.volatility import BollingerBands
from ta.trend import SMAIndicator
import asyncio

# ====== Конфигурация =======
TELEGRAM_TOKEN = "8055499750:AAEdJ82x43ZbX3fnxK0lwHOkcu2Nn6v6sWs'""
TELEGRAM_USER_ID = 7831076059   # твой id

# Только пары, которые реально есть на Binance
PAIRS = ["BTC/USDT", "ETH/USDT", "BNB/USDT"]
TIMEFRAME = "1m"

exchange = ccxt.binance({
    "enableRateLimit": True,
    "options": {"defaultType": "spot"},
})

# === Получение данных ===
def fetch_ohlcv(pair, timeframe="1m", limit=100):
    try:
        ohlcv = exchange.fetch_ohlcv(pair, timeframe=timeframe, limit=limit)
        df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        return df
    except Exception as e:
        print(f"Ошибка получения {pair}: {e}")
        return None

# === Индикаторы ===
def calculate_indicators(df):
    df["rsi"] = RSIIndicator(df["close"], window=14).rsi()
    bb = BollingerBands(df["close"], window=20, window_dev=2)
    df["bb_upper"] = bb.bollinger_hband()
    df["bb_lower"] = bb.bollinger_lband()
    df["sma"] = SMAIndicator(df["close"], window=50).sma_indicator()
    return df

# === Логика сигналов ===
def check_signal(df):
    last = df.iloc[-1]
    if last["rsi"] < 30 and last["low"] <= last["bb_lower"] and last["close"] > last["sma"]:
        return "CALL (покупка)"
    elif last["rsi"] > 70 and last["high"] >= last["bb_upper"] and last["close"] < last["sma"]:
        return "PUT (продажа)"
    return None

# === Команда в Telegram ===
async def dai_plus(update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if chat_id != TELEGRAM_USER_ID:
        await context.bot.send_message(chat_id=chat_id, text="Извините, доступ запрещён.")
        return

    messages = []
    for pair in PAIRS:
        df = fetch_ohlcv(pair, timeframe=TIMEFRAME, limit=100)
        if df is None:
            continue
        df = calculate_indicators(df)
        signal = check_signal(df)
        if signal:
            messages.append(f"⚡ {pair}: {signal}")
    
    if not messages:
        await context.bot.send_message(chat_id=chat_id, text="Сигналов нет 🚫")
    else:
        await context.bot.send_message(chat_id=chat_id, text="\n".join(messages))

# === Запуск бота ===
async def main():
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("dai_plus", dai_plus))
    print("Бот запущен ✅. Введи в Telegram /dai_plus")
    await app.run_polling()

if name == "main":
    asyncio.run(main())
