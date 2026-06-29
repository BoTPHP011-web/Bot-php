import { Client } from 'bedrock-protocol';

const config = {
    host: process.env.HOST || 'nur15pve-iweF.aternos.me',
    port: 33829,
    username: process.env.USERNAME || 'RealPlayer_228',
};

console.log('[START] Бот запущен!');
console.log(`[CONFIG] Хост: ${config.host}:${config.port}`);
console.log(`[CONFIG] Игрок: ${config.username}`);

let client;

try {
    client = new Client({
        host: config.host,
        port: config.port,
        username: config.username,
        offline: true,
        timeout: 10000
    });
} catch (err) {
    console.log('[FATAL] Ошибка создания клиента:', err.message);
    process.exit(1);
}

// ===== СОСТОЯНИЕ =====
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
    if (!client.position) return;
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
                client.queue('move_player', {
                    position: client.position,
                    on_ground: true
                });
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

// ===== СОБЫТИЯ =====
client.on('start', () => {
    console.log('[OK] Бот в игре!');
    setTimeout(startLoop, 5000 + Math.random() * 5000);
});

client.on('close', () => {
    console.log('[KICK] Кикнут или дисконнект');
    const delay = 30000 + Math.random() * 60000;
    console.log(`[RECONNECT] через ${(delay/1000).toFixed(0)} сек`);
    setTimeout(() => {
        console.log('[RECONNECT] Попытка подключения...');
        client.connect();
    }, delay);
});

client.on('error', (err) => {
    console.log('[ERROR]', err.message);
    // НЕ ВЫХОДИМ, ПЫТАЕМСЯ ПЕРЕПОДКЛЮЧИТЬСЯ
    setTimeout(() => {
        console.log('[RECONNECT] Попытка переподключения...');
        client.connect();
    }, 30000);
});

// ===== ЗАЩИТА ОТ КРАША =====
process.on('uncaughtException', (err) => {
    console.log('[CRASH]', err.message);
    setTimeout(() => {
        console.log('[RECONNECT] Перезапуск после краша...');
        client.connect();
    }, 30000);
});
