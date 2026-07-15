
AI USED DOCUMENTATION IM NOT CREATED THIS! /ДОКУМЕНТАЦИЮ ДЕЛАЛ ИИ НЕ Я!

# 📚 bot.js - Minecraft AFK Bot Documentation

---

## 🇬🇧 ENGLISH VERSION

---

### 📌 Overview

test4.js is a fully-featured Minecraft AFK bot with a real-time web control panel. The bot automatically mines resources (stone and wood) while simulating human-like behavior patterns to avoid detection as a bot.

---

### 🎯 Features

- Automated Resource Mining - Mines stone and oak logs with human-like reaction times
- Human Behavior Simulation - 70% mining, 15% looking around, 11% stretching (jumping/sneaking), 4% AFK pauses
- Web Control Panel - Full-featured dashboard to control the bot
- Real-time Logs - Live console output via Server-Sent Events (SSE)
- Auto-Reconnect - Automatically reconnects with exponential backoff on disconnection
- Statistics Tracking - Tracks stones mined, wood collected, jumps, sneaks, and idle time
- Configuration Management - Update server settings directly from web interface
- Aternos Compatible - Specifically configured to work with Aternos servers

---

### 🚀 Installation & Setup

#### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

#### Installation Steps

# 1. Clone or download the script
# 2. Navigate to the project directory
cd /path/to/test4.js

# 3. Install dependencies
npm install mineflayer express

---

⚙️ Configuration

The bot uses environment variables for configuration:

# Server settings
MC_HOST=MyFlatAnarchy.aternos.me    # Server IP or hostname
MC_PORT=19917                        # Server port
MC_USER=alias162hwpl                 # Bot username

# Web server port (optional)
PORT=8080                            # Web interface port

Default Configuration (hardcoded fallback)


const CONFIG = {
  host: 'MyFlatAnarchy.aternos.me',
  port: 19917,
  username: 'alias162hwpl',
  version: '1.21.10'
};

---

🎮 How to Use

Method 1: Quick Start

# Set environment variables and run
export MC_HOST=your-server-ip
export MC_PORT=25565
export MC_USER=your-bot-name
node test4.js


Method 2: Using .env file (recommended)

Create a .env file in the same directory:

MC_HOST=your-server-ip
MC_PORT=25565
MC_USER=your-bot-name
PORT=8080


Run:

node test4.js

---

🌐 Web Interface

After starting the bot, open your browser at http://localhost:8080 (or your configured PORT).

Dashboard Features:

Button/Action Description
ВКЛЮЧИТЬ (ON) Starts the bot if it's stopped
ОТКЛЮЧИТЬ (OFF) Stops the bot gracefully
ПЕРЕПОДКЛЮЧИТЬ (RECONNECT) Forces an immediate reconnect
Settings Form Update server IP, port, and username
Log Viewer Live console output (auto-scrolling)

---

🤖 Bot Behavior Logic

The bot operates in a continuous loop with weighted random actions:

Action Probability Description
Mining 70% Mines nearby stone or oak logs within 6 blocks
Looking Around 15% Randomly rotates view (human-like scanning)
Stretching 11% Jumps (200ms) or sneaks (600ms)
AFK Pause 4% "Gone for tea" - 8-16 seconds of inactivity

Mining Specifics:

· Human-like reaction delay: 150-300ms before each dig
· Auto-targets blocks within 6 blocks distance
· Looks directly at block center before mining
· Tracks: stats.stone and stats.wood

Behavior Loop Flow:

1. Random decision (70% mining, 15% look, 11% stretch, 4% AFK)
2. Execute action with human-like delays
3. Wait 1-2.5 seconds between actions
4. Repeat

---

📊 Statistics Reporting

Every 60 seconds, the bot sends a summary log:

```
📊 СВОДКА | Камня сломано: 23 | Дерева: 12 | Прыжков: 45 | Приседаний: 8 | Отдыхал: 12 сек.
```

Statistics reset after each report.

---

🔄 Auto-Reconnect System

· Initial delay: 40 seconds
· Exponential backoff: 1.8× multiplier per attempt
· Maximum delay: 15 minutes (900,000ms)
· Resets: After successful connection

---

🛡️ Error Handling

Scenario Behavior
Connection error Logs error, retries with backoff
Block disappears mid-dig Silently recovers, continues loop
Bot entity lost Destroy bot, schedule reconnect
Web client disconnect Removes client from SSE stream

---

📝 Logging System

· In-memory buffer: Stores last 50 log entries
· Real-time stream: SSE to connected web clients
· Console output: Duplicates to stdout
· Timestamps: Local time (HH:MM:SS format)

---

🔧 Customization Tips

Adjust Behavior Probabilities


// In startLoop() function:
if (decision < 0.70) { // Change 0.70 for mining %
  // Mining logic
} else if (decision < 0.85) { // Change to adjust look %
  // Look around
}
```

Change Mining Distance

```javascript
maxDistance: 6 // Increase for larger range
```

Modify AFK Duration

```javascript
const afkDelay = 8000 + Math.floor(Math.random() * 8000);
// Min: 8000ms (8s), Max: 16000ms (16s)
```

---

🐛 Troubleshooting

Issue Solution
Bot doesn't connect Check server address, port, and username
Web interface not loading Ensure PORT is available (default 8080)
Bot mines nothing Verify bot is in resource-rich area
Bot disconnects frequently Check internet stability, increase timeout
Logs not updating Refresh page, check SSE connection

---

📁 File Structure

```
test4.js          # Main bot script
package.json      # Dependencies (mineflayer, express)
.env              # Environment variables (optional)
```

---

⚠️ Important Notes

1. Minecraft Version: Currently configured for 1.21.10
2. Server Compatibility: Works with Aternos and most survival servers
3. Rate Limiting: Human-like delays prevent anti-bot detection
4. Web Access: Ensure firewall allows port 8080
5. Memory Usage: Lightweight, runs on minimal resources

---

📜 License & Disclaimer

This bot is for educational purposes only. Use responsibly:

· Respect server rules
· Don't overload servers with excessive actions
· Check server TOS before deploying bots

---

🆘 Support

For issues or questions:

· Check console logs for error messages
· Verify network connectivity
· Ensure all dependencies are installed correctly

---

🇷🇺 РУССКАЯ ВЕРСИЯ

---

📌 Обзор

test4.js — это полнофункциональный AFK-бот для Minecraft с веб-панелью управления в реальном времени. Бот автоматически добывает ресурсы (камень и древесину), имитируя поведение человека для избегания обнаружения.

---

🎯 Возможности

· Автоматическая добыча — Камень и дубовая древесина с человеческой задержкой реакции
· Имитация человека — 70% добыча, 15% осмотр, 11% разминка (прыжки/приседания), 4% паузы
· Веб-панель — Полноценный интерфейс для управления ботом
· Логи в реальном времени — Прямая трансляция через Server-Sent Events (SSE)
· Авто-переподключение — Экспоненциальная задержка при обрыве связи
· Статистика — Камень, дерево, прыжки, приседания, время простоя
· Настройка конфигурации — Изменение настроек через веб-интерфейс
· Совместимость с Aternos — Специальная конфигурация для Aternos

---

🚀 Установка и настройка

Требования

· Node.js (версия 14 или выше)
· npm (Node Package Manager)

Шаги установки


# 1. Клонируйте или скачайте скрипт
# 2. Перейдите в директорию проекта
cd /путь/к/test4.js

# 3. Установите зависимости
npm install mineflayer express

---

⚙️ Настройка

Бот использует переменные окружения:


# Настройки сервера
MC_HOST=MyFlatAnarchy.aternos.me    # IP или хост сервера
MC_PORT=19917                        # Порт сервера
MC_USER=alias162hwpl                 # Ник бота

# Порт веб-сервера (опционально)
PORT=8080                            # Порт веб-интерфейса

Стандартная конфигурация (запасной вариант)


const CONFIG = {
  host: 'MyFlatAnarchy.aternos.me',
  port: 19917,
  username: 'alias162hwpl',
  version: '1.21.10'
};

---

🎮 Как использовать

Способ 1: Быстрый старт


# Установите переменные и запустите
export MC_HOST=your-server-ip
export MC_PORT=25565
export MC_USER=your-bot-name
node test4.js


Способ 2: Файл .env (рекомендуется)

Создайте файл .env в той же директории:


MC_HOST=your-server-ip
MC_PORT=25565
MC_USER=your-bot-name
PORT=8080


Запуск:


node bot.js


---

🌐 Веб-интерфейс

После запуска откройте браузер по адресу http://localhost:8080 (или ваш настроенный PORT).

Функции панели:

Кнопка/Действие Описание
ВКЛЮЧИТЬ Запускает бота, если он остановлен
ОТКЛЮЧИТЬ Останавливает бота корректно
ПЕРЕПОДКЛЮЧИТЬ Принудительное переподключение
Форма настроек Изменение IP, порта и ника сервера
Просмотр логов Вывод консоли в реальном времени (авто-скролл)

---

🤖 Логика поведения бота

Бот работает в непрерывном цикле с взвешенными случайными действиями:

Действие Вероятность Описание
Добыча 70% Копает камень или дуб в радиусе 6 блоков
Осмотр 15% Случайно вращает камеру (сканирование)
Разминка 11% Прыжки (200мс) или приседания (600мс)
AFK пауза 4% "Ушел за чаем" — 8-16 секунд бездействия

Особенности добычи:

· Задержка реакции человека: 150-300мс перед ударом
· Авто-поиск блоков в радиусе 6 блоков
· Прицеливание в центр блока перед добычей
· Статистика: stats.stone и stats.wood

Цикл поведения:

```
1. Случайное решение (70% добыча, 15% осмотр, 11% разминка, 4% AFK)
2. Выполнение действия с человеческой задержкой
3. Ожидание 1-2.5 секунд между действиями
4. Повтор
```

---

📊 Отчетность статистики

Каждые 60 секунд бот отправляет сводку в логи:

```
📊 СВОДКА | Камня сломано: 23 | Дерева: 12 | Прыжков: 45 | Приседаний: 8 | Отдыхал: 12 сек.
```

Статистика сбрасывается после каждого отчета.

---

🔄 Система авто-переподключения

· Начальная задержка: 40 секунд
· Экспоненциальный рост: множитель 1.8× за попытку
· Максимальная задержка: 15 минут (900,000мс)
· Сброс: После успешного подключения

---

🛡️ Обработка ошибок

Сценарий Поведение
Ошибка подключения Логирование ошибки, повтор с задержкой
Блок исчез во время копания Тихая обработка, продолжение цикла
Потеря сущности бота Уничтожение бота, переподключение
Отключение веб-клиента Удаление клиента из SSE-потока

---

📝 Система логирования

· Буфер в памяти: Хранит последние 50 записей
· Поток в реальном времени: SSE для веб-клиентов
· Вывод в консоль: Дублируется в stdout
· Временные метки: Локальное время (формат ЧЧ:ММ:СС)

---

🔧 Советы по кастомизации

Изменение вероятностей действий

```javascript
// В функции startLoop():
if (decision < 0.70) { // Измените 0.70 для % добычи
  // Логика добычи
} else if (decision < 0.85) { // Измените для % осмотра
  // Осмотр
}
```

Изменение радиуса добычи

```javascript
maxDistance: 6 // Увеличьте для большего радиуса
```

Изменение длительности AFK

```javascript
const afkDelay = 8000 + Math.floor(Math.random() * 8000);
// Мин: 8000мс (8с), Макс: 16000мс (16с)
```

---

🐛 Устранение неполадок

Проблема Решение
Бот не подключается Проверьте адрес сервера, порт и ник
Веб-интерфейс не загружается Убедитесь, что порт свободен (по умолчанию 8080)
Бот ничего не копает Убедитесь, что бот в месте с ресурсами
Бот часто отключается Проверьте стабильность интернета, увеличьте таймаут
Логи не обновляются Обновите страницу, проверьте SSE-соединение

---

📁 Структура файлов

```
test4.js          # Основной скрипт бота
package.json      # Зависимости (mineflayer, express)
.env              # Переменные окружения (опционально)
```

---

⚠️ Важные примечания

1. Версия Minecraft: Настроена для 1.21.10
2. Совместимость: Работает с Aternos и большинством выживающих серверов
3. Защита от бана: Человеческие задержки предотвращают обнаружение
4. Доступ к вебу: Убедитесь, что брандмауэр разрешает порт 8080
5. Использование ресурсов: Легковесный, работает на минимальных ресурсах

---

📜 Лицензия и отказ от ответственности

Этот бот предназначен только для образовательных целей. Используйте ответственно:

· Соблюдайте правила сервера
· Не перегружайте сервер чрезмерными действиями
· Проверяйте TOS сервера перед развертыванием ботов

---

🆘 Поддержка

По вопросам и проблемам:

· Проверьте логи консоли на наличие ошибок
· Проверьте сетевое подключение
· Убедитесь, что все зависимости установлены корректно

---

🎯 Быстрый старт (Чек-лист)

· Установлен Node.js 14+
· Установлены зависимости (npm install mineflayer express)
· Настроены переменные окружения (или отредактирован CONFIG)
· Запущен скрипт (node test4.js)
· Открыт веб-интерфейс (http://localhost:8080)
· Бот успешно зашел на сервер
· чекаем логи
