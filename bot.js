const mineflayer = require('mineflayer');
const express = require('express');

const CONFIG = {
  host: process.env.MC_HOST || 'MyFlatAnarchy.aternos.me',
  port: parseInt(process.env.MC_PORT) || 19917,
  username: process.env.MC_USER || 'alias162hwpl',
  version: '1.21.10'
};

let bot = null;
let isRunning = true; 
let reconnectTimeout = null;
let reconnectAttempts = 0;

// Статистика для красивого минутного отчета
let stats = { stone: 0, wood: 0, jumps: 0, sneaks: 0, idleSecs: 0 };
let statsInterval = null;

const logsBuffer = [];
const logClients = new Set();

function logToWeb(message) {
  const timestamp = new Date().toLocaleTimeString();
  const formattedLog = `[${timestamp}] ${message}`;
  
  console.log(message);
  
  logsBuffer.push(formattedLog);
  if (logsBuffer.length > 50) logsBuffer.shift();
  
  logClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ log: formattedLog })}\n\n`);
  });
}

// Минутный отчет в веб-панель
function startStatsReporter() {
  if (statsInterval) clearInterval(statsInterval);
  statsInterval = setInterval(() => {
    if (bot && bot.entity) {
      logToWeb(`📊 СВОДКА | Камня сломано: ${stats.stone} | Дерева: ${stats.wood} | Прыжков: ${stats.jumps} | Приседаний: ${stats.sneaks} | Отдыхал: ${stats.idleSecs} сек.`);
      // Сбрасываем счетчики на следующую минуту
      stats = { stone: 0, wood: 0, jumps: 0, sneaks: 0, idleSecs: 0 };
    }
  }, 60000);
}

// === ВЕБ ИНТЕРФЕЙС ===
const app = express();
const webPort = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Управление Ботом</title>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; text-align: center; margin-top: 30px; background: #222; color: #fff; }
          button { padding: 12px 24px; font-size: 16px; margin: 5px; cursor: pointer; border-radius: 5px; border: none; font-weight: bold; }
          .btn-on { background: #28a745; color: white; }
          .btn-off { background: #dc3545; color: white; }
          .btn-reconnect { background: #17a2b8; color: white; }
          .status { font-size: 20px; font-weight: bold; color: #ffc107; }
          .panel-container { max-width: 600px; margin: 0 auto; background: #333; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
          .form-group { margin: 15px 0; text-align: left; }
          .form-group label { display: block; margin-bottom: 5px; color: #aaa; }
          .form-group input { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #444; color: #fff; font-size: 16px; box-sizing: border-box; }
          .btn-submit { background: #007bff; color: white; width: 100%; margin-top: 10px; }
          .logs-container { max-width: 600px; margin: 20px auto; background: #111; border: 1px solid #444; border-radius: 5px; padding: 10px; text-align: left; }
          #logBox { height: 200px; overflow-y: auto; font-family: monospace; font-size: 13px; color: #00ff00; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="panel-container">
          <h1>Панель управления AFK-ботом</h1>
          <p>Статус работы: <span class="status">${isRunning ? 'ВКЛЮЧЕН (Пытается копать/подключаться)' : 'ВЫКЛЮЧЕН (Спит)'}</span></p>
          <p>Состояние бота: <span class="status" style="color: #007bff">${bot && bot.entity ? 'В ИГРЕ' : 'ОФФЛАЙН'}</span></p>
          <hr style="border-color: #444;"/>
          
          <button class="btn-on" onclick="location.href='/start'">ВКЛЮЧИТЬ</button>
          <button class="btn-off" onclick="location.href='/stop'">ОТКЛЮЧИТЬ</button>
          <button class="btn-reconnect" onclick="location.href='/reconnect'">ПЕРЕПОДКЛЮЧИТЬ</button>
          
          <hr style="border-color: #444;"/>
          
          <h3>Настройки подключения (Aternos)</h3>
          <form action="/update-config" method="POST">
            <div class="form-group">
              <label>IP Сервера (Host):</label>
              <input type="text" name="host" value="${CONFIG.host}" required>
            </div>
            <div class="form-group">
              <label>Порт (Port):</label>
              <input type="number" name="port" value="${CONFIG.port}" required>
            </div>
            <div class="form-group">
              <label>Ник бота (Username):</label>
              <input type="text" name="username" value="${CONFIG.username}" required>
            </div>
            <button type="submit" class="btn-submit">Сохранить и Перезапустить</button>
          </form>
        </div>

        <div class="logs-container">
          <h3>Консоль бота (В реальном времени)</h3>
          <div id="logBox">${logsBuffer.join('\n')}</div>
        </div>

        <script>
          const logBox = document.getElementById('logBox');
          logBox.scrollTop = logBox.scrollHeight;

          const eventSource = new EventSource('/stream-logs');
          eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            logBox.innerText += '\\n' + data.log;
            logBox.scrollTop = logBox.scrollHeight;
          };
        </script>
      </body>
    </html>
  `);
});

app.get('/start', (req, res) => {
  if (!isRunning) {
    isRunning = true;
    logToWeb('🌐 Веб-интерфейс: Запущена команда ВКЛЮЧИТЬ.');
    initBot();
  }
  res.redirect('/');
});

app.get('/stop', (req, res) => {
  isRunning = false;
  logToWeb('🌐 Веб-интерфейс: Запущена команда ОТКЛЮЧИТЬ.');
  destroyBot('Остановлен пользователем через веб-интерфейс');
  res.redirect('/');
});

app.get('/reconnect', (req, res) => {
  logToWeb('🌐 Веб-интерфейс: Вызвано экстренное переподключение.');
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  destroyBot('Экстренный ручной перезапуск');
  initBot();
  res.redirect('/');
});

app.post('/update-config', (req, res) => {
  CONFIG.host = req.body.host.trim();
  CONFIG.port = parseInt(req.body.port) || 25565;
  CONFIG.username = req.body.username.trim();
  logToWeb(`🌐 Веб-интерфейс: Настройки обновлены. Перезапуск...`);
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  destroyBot('Изменение конфигурации');
  initBot();
  res.redirect('/');
});

app.get('/stream-logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  logClients.add(res);
  req.on('close', () => { logClients.delete(res); });
});

app.listen(webPort, () => {
  logToWeb(`🌐 Веб-интерфейс запущен на порту ${webPort}`);
});


// === ЛОГИКА MINECRAFT БОТА ===
function initBot() {
  if (!isRunning) return;
  if (bot) destroyBot('Перезапуск перед созданием нового подключения');

  logToWeb(`🔌 Попытка подключения к ${CONFIG.host}:${CONFIG.port}...`);
  
  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    checkTimeoutInterval: 15000
  });

  bot.on('spawn', () => {
    logToWeb(`🤖 Бот [${bot.username}] успешно зашел на сервер.`);
    if (bot.physicsEnabled === false) bot.physicsEnabled = true;
    reconnectAttempts = 0;
    startStatsReporter();
    startLoop();
  });

  bot.on('error', (err) => {
    logToWeb(`⚠️ Ошибка подключения: ${err.message}`);
  });

  bot.on('end', (reason) => {
    logToWeb(`🔌 Соединение закрыто: ${reason}`);
    destroyBot(reason);
    
    if (isRunning) {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      
      reconnectAttempts++;
      const baseDelay = 40000;
      const delay = Math.min(baseDelay * Math.pow(1.8, reconnectAttempts - 1), 900000);
      
      logToWeb(`⏳ Повторная попытка входа через ${Math.round(delay / 1000)} сек. (Попытка #${reconnectAttempts})`);
      reconnectTimeout = setTimeout(initBot, delay);
    }
  });
}

function destroyBot(reason) {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
  if (bot) {
    try {
      bot.physicsEnabled = false;
      bot.quit(reason);
    } catch (e) {}
    bot = null;
  }
}

// ГЛАВНЫЙ ЦИКЛ (Скрещенный!)
async function startLoop() {
  while (isRunning && bot && bot.entity) {
    try {
      const decision = Math.random();

      // === 1. РЕШЕНИЕ: Какое действие выполняем? ===

      if (decision < 0.70) {
        // === 70% Шанс: Добыча ресурсов (Твоя 100% рабочая логика) ===
        const block = bot.findBlock({
          matching: (b) => b.name === 'stone' || b.name === 'oak_log',
          maxDistance: 6 // Идеальная дистанция для коробки
        });

        if (block) {
          // Легкая задержка реакции «человека» перед ударом (150-300мс)
          const humanReaction = 150 + Math.floor(Math.random() * 150);
          await new Promise(r => setTimeout(r, humanReaction));

          if (bot && bot.entity) {
            // Наводим взгляд на блок и копаем его напрямую без pathfinder
            await bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true);
            await bot.dig(block);

            // Бесшумно записываем в статистику вместо спама в чат
            if (block.name === 'stone') stats.stone++;
            if (block.name === 'oak_log') stats.wood++;
          }
        }

      } else if (decision < 0.85) {
        // === 15% Шанс: Осмотр окружения ===
        const yaw = (Math.random() * 360 - 180) * (Math.PI / 180);
        const pitch = (Math.random() * 40 - 20) * (Math.PI / 180);
        await bot.look(yaw, pitch, true);
        
        const stareTime = 800 + Math.floor(Math.random() * 1200);
        await new Promise(r => setTimeout(r, stareTime));

      } else if (decision < 0.96) {
        // === 11% Шанс: Разминка (Прыжки и приседания) ===
        if (Math.random() < 0.5) {
          bot.setControlState('jump', true);
          await new Promise(r => setTimeout(r, 200));
          bot.setControlState('jump', false);
          stats.jumps++;
        } else {
          bot.setControlState('sneak', true);
          await new Promise(r => setTimeout(r, 600));
          bot.setControlState('sneak', false);
          stats.sneaks++;
        }
      } else {
        // === 4% Шанс: Глубокий AFK ("ушел за чаем") ===
        const afkDelay = 8000 + Math.floor(Math.random() * 8000); // От 8 до 16 секунд тишины
        stats.idleSecs += Math.round(afkDelay / 1000);
        await new Promise(r => setTimeout(r, afkDelay));
      }

      // === 2. ДЖИТТЕР ПАУЗЫ (Микро-затуп между действиями) ===
      // Пауза от 1 до 2.5 секунд, чтобы бот не молотил без перерыва
      const loopDelay = 1000 + Math.floor(Math.random() * 1500);
      await new Promise(r => setTimeout(r, loopDelay));

    } catch (err) {
      // Молча проглатываем ошибки копания, если блок исчез перед лицом, чтобы бот шел дальше
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Первый запуск
initBot();

                                                          
