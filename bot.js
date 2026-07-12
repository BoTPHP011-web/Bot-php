const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const express = require('express');

const CONFIG = {
  host: process.env.MC_HOST || 'MyFlatAnarchy.aternos.me',
  port: parseInt(process.env.MC_PORT) || 19917,
  username: process.env.MC_USER || 'alias162hwpl',
  version: '1.21.10'
};

let bot = null;
let isRunning = true; // Переключатель из веб-интерфейса
let reconnectTimeout = null;

// === УЛУЧШЕНИЕ 6: ХРАНИЛИЩЕ ДЛЯ ЖИВЫХ ЛОГОВ ===
const logsBuffer = [];
const logClients = new Set();

function logToWeb(message) {
  const timestamp = new Date().toLocaleTimeString();
  const formattedLog = `[${timestamp}] ${message}`;
  
  // Выводим в стандартную консоль Railway
  console.log(message);
  
  // Сохраняем последние 50 логов в буфер
  logsBuffer.push(formattedLog);
  if (logsBuffer.length > 50) logsBuffer.shift();
  
  // Отправляем всем подключенным веб-клиентам
  logClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ log: formattedLog })}\n\n`);
  });
}

// === ВЕБ ИНТЕРФЕЙС ===
const app = express();
const webPort = process.env.PORT || 8080; // Настроенный тобой порт 8080

// Парсинг данных из форм для Улучшения 2
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
          <!-- УЛУЧШЕНИЕ 5: КНОПКА ЭКСТРЕННОГО РЕКОННЕКТА -->
          <button class="btn-reconnect" onclick="location.href='/reconnect'">ПЕРЕПОДКЛЮЧИТЬ</button>
          
          <hr style="border-color: #444;"/>
          
          <!-- УЛУЧШЕНИЕ 2: ИЗМЕНЕНИЕ НАСТРОЕК НА ЛЕТУ -->
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

        <!-- УЛУЧШЕНИЕ 6: ЖИВОЙ ЛОГ КОНСОЛИ -->
        <div class="logs-container">
          <h3>Консоль бота (В реальном времени)</h3>
          <div id="logBox">${logsBuffer.join('\n')}</div>
        </div>

        <script>
          // Скролл логов вниз при загрузке страницы
          const logBox = document.getElementById('logBox');
          logBox.scrollTop = logBox.scrollHeight;

          // Подключение к потоку живых логов (SSE)
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

// УЛУЧШЕНИЕ 5: ЭНДПОИНТ ДЛЯ ЭКСТРЕННОГО РЕКОННЕКТА
app.get('/reconnect', (req, res) => {
  logToWeb('🌐 Веб-интерфейс: Вызвано экстренное переподключение бота.');
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  destroyBot('Экстренный ручной перезапуск');
  initBot();
  res.redirect('/');
});

// УЛУЧШЕНИЕ 2: ЭНДПОИНТ ОБНОВЛЕНИЯ НАСТРОЕК
app.post('/update-config', (req, res) => {
  CONFIG.host = req.body.host.trim();
  CONFIG.port = parseInt(req.body.port) || 25565;
  CONFIG.username = req.body.username.trim();
  
  logToWeb(`🌐 Веб-интерфейс: Конфигурация обновлена. Новый порт: ${CONFIG.port}. Перезапуск...`);
  
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  destroyBot('Изменение конфигурации подключения');
  initBot();
  
  res.redirect('/');
});

// УЛУЧШЕНИЕ 6: ЭНДПОИНТ ДЛЯ СТРИМИНГА ЛОГОВ В БРАУЗЕР
app.get('/stream-logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logClients.add(res);

  req.on('close', () => {
    logClients.delete(res);
  });
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
    checkTimeoutInterval: 15000 // Кикаем зависший сокет через 15 секунд молчания сервера
  });

  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {
    logToWeb(`🤖 Бот [${bot.username}] зашел на server.`);
    if (bot.physicsEnabled === false) bot.physicsEnabled = true;
    startLoop();
  });

  bot.on('error', (err) => {
    logToWeb(`⚠️ Ошибка протокола подключения: ${err.message}`);
  });

  bot.on('end', (reason) => {
    logToWeb(`🔌 Соединение разорвано (${reason}).`);
    destroyBot(reason);
    
    // Бесконечный жесткий реконнект каждые 30-40 секунд при киках или выключении Атерноса
    if (isRunning) {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      logToWeb('⏳ Повторная попытка входа через 40 секунд...');
      reconnectTimeout = setTimeout(initBot, 40000);
    }
  });
}

function destroyBot(reason) {
  if (bot) {
    try {
      bot.physicsEnabled = false; // Отключаем тики физики, чтобы предотвратить Timeout 5250ms
      bot.pathfinder.stop();      // Принудительно гасим pathfinder
      bot.quit(reason);
    } catch (e) {}
    bot = null;
  }
}

// Главный цикл жизнедеятельности
async function startLoop() {
  while (isRunning && bot && bot.entity) {
    try {
      let actionType = Math.random();

      if (actionType < 0.50) {
        await mineBlockWithTimeout('stone', 12000); // 12 секунд лимит на добычу камня
      } else if (actionType < 0.85) {
        await mineBlockWithTimeout('log', 12000);  // 12 секунд лимит на дерево
      } else {
        // Разминка
        bot.setControlState('jump', true);
        await new Promise(r => setTimeout(r, 200));
        bot.setControlState('jump', false);
      }
      
      // Пауза между циклами
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      logToWeb(`🤖 Защита: Ошибка в главном цикле (сброшено): ${err.message}`);
      if (bot) bot.pathfinder.stop();
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

// Защищенная добыча с жестким тайм-аутом, спасающая от багов pathfinder
function mineBlockWithTimeout(blockName, timeoutMs) {
  return new Promise((resolve) => {
    let isDone = false;

    // Внутренний таймер, который прервет копание, если pathfinder зависнет на слишком длинном маршруте
    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        logToWeb(`⏰ Превышен лимит (${timeoutMs}мс) на добычу ${blockName}. Защитный сброс пути.`);
        if (bot) {
          bot.pathfinder.stop();
          bot.physicsEnabled = false; // Предотвращаем ошибку тиков при застревании
          setTimeout(() => { if (bot) bot.physicsEnabled = true; }, 500);
        }
        resolve();
      }
    }, timeoutMs);

    mineBlock(blockName).then(() => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timer);
        resolve();
      }
    }).catch((err) => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timer);
        logToWeb(`🤖 Перехвачена ошибка pathfinder: ${err.message}`);
        resolve();
      }
    });
  });
}

async function mineBlock(blockName) {
  if (!bot || !bot.entity) return;

  const block = bot.findBlock({
    matching: (b) => b.name.includes(blockName) || b.name.includes('cobblestone') || b.name.includes('dirt'),
    maxDistance: 10 // Уменьшили радиус до 10, чтобы избежать слишком длинных путей (too long path)
  });
  
  if (!block) return;

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  
  // Отключаем сложные вычисления паркура, чтобы pathfinder не зависал
  movements.canDig = false; 
  movements.allow1x1Walk = false;
  
  bot.pathfinder.setMovements(movements);
  
  // Направляемся к блоку
  await bot.pathfinder.goto(new GoalLookAtBlock(block.position, bot.world));
  
  if (!bot || !bot.entity) return;

  // Экипируем лучший инструмент
  const tool = bot.pathfinder.bestHarvestTool(block);
  if (tool) await bot.equip(tool, 'hand');
  
  // Копаем
  await bot.dig(block);
}

// Глобальный перехват некритичных ошибок Node.js
process.on('uncaughtException', (err) => {
  logToWeb(`🛡️ Перехвачена системная ошибка: ${err.message}`);
  if (err.message.includes('physics') || err.message.includes('ticks') || err.message.includes('pathfinder')) {
    // Если посыпались ошибки физики/путей — мягко ребутаем бота без падения самого сервера
    destroyBot('Ошибка физики/путей');
    setTimeout(initBot, 10000);
  }
});

// Первый запуск
initBot();
        
