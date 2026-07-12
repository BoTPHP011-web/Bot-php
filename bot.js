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

// === ВЕБ ИНТЕРФЕЙС ===
const app = express();
const webPort = process.env.PORT || 3000; // Railway сам выдаст порт

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Управление Ботом</title>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; text-align: center; margin-top: 50px; background: #222; color: #fff; }
          button { padding: 15px 30px; font-size: 18px; margin: 10px; cursor: pointer; border-radius: 5px; border: none; }
          .btn-on { background: #28a745; color: white; }
          .btn-off { background: #dc3545; color: white; }
          .status { font-size: 20px; font-weight: bold; color: #ffc107; }
        </style>
      </head>
      <body>
        <h1>Панель управления AFK-ботом</h1>
        <p>Статус работы: <span class="status">${isRunning ? 'ВКЛЮЧЕН (Пытается копать/подключаться)' : 'ВЫКЛЮЧЕН (Спит)'}</span></p>
        <p>Состояние бота: <span class="status" style="color: #007bff">${bot && bot.entity ? 'В ИГРЕ' : 'ОФФЛАЙН'}</span></p>
        <hr/>
        <button class="btn-on" onclick="location.href='/start'">ВКЛЮЧИТЬ</button>
        <button class="btn-off" onclick="location.href='/stop'">ОТКЛЮЧИТЬ</button>
      </body>
    </html>
  `);
});

app.get('/start', (req, res) => {
  if (!isRunning) {
    isRunning = true;
    console.log('🌐 Веб-интерфейс: Запущена команда ВКЛЮЧИТЬ.');
    initBot();
  }
  res.redirect('/');
});

app.get('/stop', (req, res) => {
  isRunning = false;
  console.log('🌐 Веб-интерфейс: Запущена команда ОТКЛЮЧИТЬ.');
  destroyBot('Остановлен пользователем через веб-интерфейс');
  res.redirect('/');
});

app.listen(webPort, () => {
  console.log(`🌐 Веб-интерфейс запущен на порту ${webPort}`);
});


// === ЛОГИКА MINECRAFT БОТА ===
function initBot() {
  if (!isRunning) return;
  if (bot) destroyBot('Перезапуск перед созданием нового подключения');

  console.log(`🔌 Попытка подключения к ${CONFIG.host}...`);
  
  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    checkTimeoutInterval: 15000 // Кикаем зависший сокет через 15 секунд молчания сервера
  });

  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {
    console.log(`🤖 Бот [${bot.username}] зашел на сервер.`);
    if (bot.physicsEnabled === false) bot.physicsEnabled = true;
    startLoop();
  });

  bot.on('error', (err) => {
    console.log('⚠️ Ошибка протокола подключения:', err.message);
  });

  bot.on('end', (reason) => {
    console.log(`🔌 Соединение разорвано (${reason}).`);
    destroyBot(reason);
    
    // Бесконечный жесткий реконнект каждые 30-40 секунд при киках или выключении Атерноса
    if (isRunning) {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      console.log('⏳ Повторная попытка входа через 40 секунд...');
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
      console.log('🤖 Защита: Ошибка в главном цикле (сброшено):', err.message);
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
        console.log(`⏰ Превышен лимит (${timeoutMs}мс) на добычу ${blockName}. Защитный сброс пути.`);
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
        console.log('🤖 Перехвачена ошибка pathfinder:', err.message);
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
  console.log('🛡️ Перехвачена системная ошибка:', err.message);
  if (err.message.includes('physics') || err.message.includes('ticks') || err.message.includes('pathfinder')) {
    // Если посыпались ошибки физики/путей — мягко ребутаем бота без падения самого сервера
    destroyBot('Ошибка физики/путей');
    setTimeout(initBot, 10000);
  }
});

// Первый запуск
initBot();
