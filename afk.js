import { Client } from 'bedrock-protocol';
import http from 'http';

// ===== НАСТРОЙКИ =====
const config = {
    host: process.env.HOST || 'nur15pve-iweF.aternos.me',
    port: 33829, // ЖЁСТКИЙ ПОРТ ДЛЯ ATERNOS
    username: process.env.USERNAME || 'RealPlayer_228',
};

console.log('[START] Бот запущен!');
console.log(`[CONFIG] Хост: ${config.host}:${config.port}`);
console.log(`[CONFIG] Игрок: ${config.username}`);
console.log('[INFO] Бот запущен, ожидаем подключения...');

// ===== ФАКОВЫЙ ВЕБ-СЕРВЕР ДЛЯ RAILWAY =====
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Bot is running!\nHost: ${config.host}:${config.port}\nPlayer: ${config.username}\n`);
});

const WEB_PORT = process.env.PORT || 8080;
server.listen(WEB_PORT, '0.0.0.0', () => {
    console.log(`[WEB] Фейковый сервер запущен на порту ${WEB_PORT}`);
});

// ===== СОЗДАНИЕ КЛИЕНТА =====
let client;
let isConnecting = false;

function createClient() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        client = new Client({
            host: config.host,
            port: config.port,
            username: config.username,
            offline: true,
            timeout: 15000
        });

        client.on('start', () => {
            isConnecting = false;
            console.log('[OK] Бот в игре!');
            setTimeout(startLoop, 5000 + Math.random() * 5000);
        });

        client.on('close', () => {
            isConnecting = false;
            console.log('[KICK] Кикнут или дисконнект');
            const delay = 30000 + Math.random() * 60000;
            console.log(`[RECONNECT] через ${(delay/1000).toFixed(0)} сек`);
            setTimeout(() => {
                console.log('[RECONNECT] Попытка подключения...');
                createClient();
            }, delay);
        });

        client.on('error', (err) => {
            isConnecting = false;
            console.log('[ERROR]', err.message);
            setTimeout(() => {
                console.log('[RECONNECT] Попытка переподключения...');
                createClient();
            }, 30000);
        });

    } catch (err) {
        isConnecting = false;
        console.log('[FATAL] Ошибка создания клиента:', err.message);
        setTimeout(() => {
            console.log('[RECONNECT] Перезапуск после фатальной ошибки...');
            createClient();
        }, 30000);
    }
}

// ===== ДЕЙСТВИЯ =====
let lastAction = null;
const actions = ['move', 'jump', 'look'];

function getHumanDelay() {
    return 30000 + Math.random() * 120000;
}

function getRandomAction() {
    let action;
    do {
        action = actions[Math.floor(Math.random() * actions.length)];
    } while (action === lastAction);
    lastAction = action;
    return action;
}

function performAction(action) {
    if (!client || !client.position) {
        console.log('[WARN] Клиент не готов, пропускаем действие');
        return;
    }
    
    console.log(`[ACTION] ${action}`);

    switch(action) {
        case 'move': {
            const angle = Math.random() * 2 * Math.PI;
            const dist = 5 + Math.floor(Math.random() * 15);
            const x = client.position.x + Math.cos(angle) * dist;
            const z = client.position.z + Math.sin(angle) * dist;
            client.queue('move_player', {
                position: { x, y: client.position.y, z },
                on_ground: true
            });
            break;
        }
        case 'jump': {
            client.queue('move_player', {
                position: client.position,
                on_ground: false
            });
            setTimeout(() => {
                if (client) {
                    client.queue('move_player', {
                        position: client.position,
                        on_ground: true
                    });
                }
            }, 300);
            break;
        }
        case 'look': {
            client.queue('move_player', {
                position: client.position,
                pitch: (Math.random() - 0.5) * 0.3,
                yaw: (Math.random() - 0.5) * Math.PI,
                on_ground: true
            });
            break;
        }
    }
}

function startLoop() {
    const delay = getHumanDelay();
    console.log(`[LOOP] След. действие через ${(delay/1000).toFixed(0)} сек`);
    setTimeout(() => {
        const action = getRandomAction();
        performAction(action);
        startLoop();
    }, delay);
}

// ===== ЗАЩИТА ОТ КРАША =====
process.on('uncaughtException', (err) => {
    console.log('[CRASH]', err.message);
    setTimeout(() => {
        console.log('[RECONNECT] Перезапуск после краша...');
        createClient();
    }, 30000);
});

process.on('unhandledRejection', (err) => {
    console.log('[REJECTION]', err.message || err);
    setTimeout(() => {
        console.log('[RECONNECT] Перезапуск после rejection...');
        createClient();
    }, 30000);
});

// ===== ЗАПУСК =====
createClient();

console.log('[INFO] Бот полностью запущен, ожидаем события...');
