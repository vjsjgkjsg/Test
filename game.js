// --- КОНФИГУРАЦИЯ И СОСТОЯНИЕ ---
const gameState = {
    money: 1200, // Начальные деньги (на автобус)
    risk: 0,     // Шкала риска быть пойманным (0-100)
    conscience: 50, // Совесть
    history: [], // История транзакций
    currentScene: 'intro',
    chatHistory: [],
    notifications: []
};

// --- БАЗА ДАННЫХ СЦЕНАРИЕВ ---
const scenarios = {
    'intro': {
        app: 'chat',
        contact: 'Работа Алматы',
        delay: 1000,
        messages: [
            { sender: 'them', text: 'Привет! Нашел твой номер в группе "Работа для студентов".' },
            { sender: 'them', text: 'Нужны деньги? Есть вариант заработать 30 000 тенге за 20 минут.' },
            { sender: 'them', text: 'Никакого криминала, просто помочь с переводом. Банк лимиты режет.' }
        ],
        choices: [
            { text: 'Что нужно делать?', next: 'briefing' },
            { text: 'Это легально?', next: 'reassurance' },
            { text: 'Иди нафиг (Закончить)', next: 'game_over_reject' }
        ]
    },
    'reassurance': {
        app: 'chat',
        contact: 'Работа Алматы',
        messages: [
            { sender: 'them', text: 'Конечно. Мы занимаемся арбитражем крипты. Просто гоняем деньги между счетами.' },
            { sender: 'them', text: 'Тебе просто придет перевод, ты его перекинешь дальше, себе оставишь %. Все чисто.' }
        ],
        choices: [
            { text: 'Ладно, я в деле. Нужны деньги.', next: 'briefing' },
            { text: 'Нет, спасибо.', next: 'game_over_reject' }
        ]
    },
    'briefing': {
        app: 'chat',
        contact: 'Куратор Макс',
        messages: [
            { sender: 'them', text: 'Отлично. Я Макс, буду твоим куратором.' },
            { sender: 'them', text: 'У тебя есть Kaspi Gold?' },
            { sender: 'them', text: 'Скинь номер карты. Сейчас закину 150 000 тенге.' },
            { sender: 'them', text: 'Твоя задача: оставить себе 10 000, а 140 000 перевести на карту, которую я дам.' }
        ],
        choices: [
            { text: '[Скинуть номер карты]', next: 'waiting_transfer' }
        ]
    },
    'waiting_transfer': {
        app: 'home', // Выкидываем на главный экран
        action: () => {
            setTimeout(() => {
                game.sendNotification('K-Bank: Пополнение +150 000 ₸', 'bank');
                game.updateBalance(150000, 'Пополнение от: Алия Б.', 'plus');
                game.addNews('В Алматы участились случаи интернет-мошенничества через OLX.', 'Внимание');
            }, 3000);
            setTimeout(() => {
                game.sendNotification('M-Chat: Новое сообщение от Макса', 'chat');
                // Обновляем состояние чата для следующего входа
                game.loadScene('received_instruction');
            }, 5000);
        }
    },
    'received_instruction': {
        app: 'chat',
        contact: 'Куратор Макс',
        messages: [
            { sender: 'them', text: 'Деньги ушли. Проверяй.' },
            { sender: 'them', text: 'Теперь быстро. Переводи 140 000 на карту: 4400 4302 1122 9988 (Имя: Руслан Д.)' },
            { sender: 'them', text: 'У тебя 10 минут. Если задержишь — карту заблочат.' }
        ],
        choices: [
            { text: 'Хорошо, сейчас сделаю.', next: 'do_transfer', action: () => game.enableBankTransfer(140000, 'Руслан Д.') },
            { text: 'Слушай, а если я себе оставлю?', next: 'threat' }
        ]
    },
    'threat': {
        app: 'chat',
        contact: 'Куратор Макс',
        messages: [
            { sender: 'them', text: 'Ты бессмертный?' },
            { sender: 'them', text: 'У нас есть твой номер. Мы найдем тебя и твоих родных.' },
            { sender: 'them', text: 'Делай перевод, не тупи. Иначе сядешь за кражу.' }
        ],
        choices: [
            { text: 'Ладно-ладно, перевожу!', next: 'do_transfer', action: () => game.enableBankTransfer(140000, 'Руслан Д.') }
        ]
    },
    'do_transfer': {
        app: 'bank_transfer_mode', // Специальный режим
        instruction: 'Переведите 140 000 ₸ на счет Руслана Д.'
    },
    'transfer_complete': {
        app: 'chat',
        contact: 'Куратор Макс',
        messages: [
            { sender: 'them', text: 'Вижу. Красавчик.' },
            { sender: 'them', text: 'Твои 10к честно заработаны.' },
            { sender: 'them', text: 'Завтра будет сумма больше. Готовься.' },
            { sender: 'system', text: '⚠️ ВЫ СТАЛИ ДРОПОМ.' },
            { sender: 'system', text: 'Вы только что отмыли украденные деньги. Теперь вы соучастник по статье 190 УК РК.' }
        ],
        choices: [
            { text: 'Понял... (Конец Эпизода 1)', next: 'ep1_end' }
        ]
    },
    'game_over_reject': {
        app: 'chat',
        messages: [{sender: 'system', text: 'Вы отказались от легких денег. Вы остались бедным, но на свободе. Хороший выбор.'}]
    },
    'ep1_end': {
        app: 'news',
        action: () => {
             game.addNews('Полиция накрыла сеть мошенников. Задержаны 5 студентов-дропперов.', 'СРОЧНО');
             setTimeout(() => alert("Конец Части 1. Ваш уровень риска: Высокий. Ждите продолжения..."), 2000);
        }
    }
};

// --- ДВИЖОК ИГРЫ ---
class GameEngine {
    constructor() {
        this.currentApp = null;
        this.renderMoney();
        this.loadScene('intro');
    }

    openApp(appName) {
        // Скрываем все окна
        document.querySelectorAll('.app-window').forEach(el => el.classList.add('hidden'));
        document.getElementById('home-screen-content').classList.add('hidden');
        
        const appWindow = document.getElementById(`app-${appName}`);
        if(appWindow) appWindow.classList.remove('hidden');

        this.currentApp = appName;
        
        // Убираем бейдж уведомлений
        const badge = document.getElementById(`badge-${appName}`);
        if(badge) badge.classList.add('hidden');

        // Если это Чат, рендерим текущую сцену, если она для чата
        if (appName === 'chat' && scenarios[gameState.currentScene]?.app === 'chat') {
            this.renderScenario(gameState.currentScene);
        }
    }

    goHome() {
        document.querySelectorAll('.app-window').forEach(el => el.classList.add('hidden'));
        document.getElementById('home-screen-content').classList.remove('hidden');
        this.currentApp = 'home';
    }

    updateBalance(amount, description, type) {
        gameState.money += amount;
        gameState.history.push({ desc: description, amount: amount, type: type });
        this.renderMoney();
        this.renderBankHistory();
    }

    renderMoney() {
        document.getElementById('bank-balance-display').innerText = gameState.money.toLocaleString() + ' ₸';
    }

    renderBankHistory() {
        const list = document.getElementById('bank-history-list');
        list.innerHTML = '';
        gameState.history.slice().reverse().forEach(item => {
            const li = document.createElement('li');
            li.className = 't-item';
            li.innerHTML = `<span>${item.desc}</span> <span class="t-amount ${item.type}">${item.amount > 0 ? '+' : ''}${item.amount} ₸</span>`;
            list.appendChild(li);
        });
    }

    sendNotification(text, app) {
        const notifArea = document.getElementById('notification-area');
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.innerHTML = `<i class="fas fa-bell"></i> <span>${text}</span>`;
        notif.onclick = () => this.openApp(app);
        
        notifArea.appendChild(notif);
        
        // Бейдж на иконке
        const badge = document.getElementById(`badge-${app}`);
        if(badge) {
            badge.innerText = '1';
            badge.classList.remove('hidden');
        }

        // Вибрация (если поддерживается)
        if (navigator.vibrate) navigator.vibrate(200);

        setTimeout(() => notif.remove(), 4000);
    }

    addNews(text, title) {
        const feed = document.getElementById('news-feed');
        const newsItem = document.createElement('div');
        newsItem.style.padding = '15px';
        newsItem.style.borderBottom = '1px solid #333';
        newsItem.innerHTML = `<h4 style="color:white; margin:0 0 5px 0">${title}</h4><p style="color:#aaa; font-size:12px; margin:0">${text}</p>`;
        feed.prepend(newsItem);
    }

    // --- ЛОГИКА СЦЕНАРИЯ ---

    loadScene(sceneId) {
        gameState.currentScene = sceneId;
        const scene = scenarios[sceneId];
        
        if (scene.action) scene.action();
        
        if (scene.app === 'chat' && this.currentApp === 'chat') {
            this.renderScenario(sceneId);
        } else if (scene.app === 'bank_transfer_mode') {
            this.setupBankTransfer(scene.instruction);
        }
    }

    renderScenario(sceneId) {
        const scene = scenarios[sceneId];
        const chatHistory = document.getElementById('chat-history');
        const controls = document.getElementById('chat-input-area');
        
        // Очищаем контролы чтобы не дублировать
        controls.innerHTML = ''; 

        // Имя контакта
        if(scene.contact) document.getElementById('chat-contact-name').innerText = scene.contact;

        // Рендерим сообщения с задержкой (эффект печатания)
        let delay = 0;
        if (scene.messages) {
            scene.messages.forEach(msg => {
                // Проверка, было ли сообщение уже показано (простая логика для MVP)
                // Для полноценной игры нужен ID сообщения
                setTimeout(() => {
                    const div = document.createElement('div');
                    div.className = `msg ${msg.sender === 'them' || msg.sender === 'system' ? 'in' : 'out'}`;
                    if(msg.sender === 'system') div.style.color = '#ff4444';
                    div.innerText = msg.text;
                    chatHistory.appendChild(div);
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                }, delay);
                delay += 1000;
            });
        }

        // Рендерим кнопки выбора после сообщений
        setTimeout(() => {
            if (scene.choices) {
                scene.choices.forEach(choice => {
                    const btn = document.createElement('button');
                    btn.className = 'choice-btn';
                    btn.innerText = choice.text;
                    btn.onclick = () => {
                        // Добавляем сообщение игрока
                        const myMsg = document.createElement('div');
                        myMsg.className = 'msg out';
                        myMsg.innerText = choice.text;
                        chatHistory.appendChild(myMsg);
                        
                        // Запускаем действие кнопки (если есть) и переходим
                        if(choice.action) choice.action();
                        this.loadScene(choice.next);
                    };
                    controls.appendChild(btn);
                });
            }
        }, delay + 500);
    }

    enableBankTransfer(amount, name) {
        // Разблокируем кнопку в банке (визуально)
        // В данном коде мы форсируем переход через сценарий
    }

    setupBankTransfer(instruction) {
        this.openApp('bank');
        const overlay = document.getElementById('bank-overlay');
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <h3 style="text-align:center">Перевод клиенту Kaspi</h3>
            <p style="text-align:center; color:#555">${instruction}</p>
            <button class="bank-btn" style="width:100%; background:#f14635; color:white" onclick="game.executeTransfer()">Подтвердить и перевести</button>
        `;
    }

    executeTransfer() {
        const overlay = document.getElementById('bank-overlay');
        overlay.innerHTML = '<h3 style="text-align:center">Обработка...</h3>';
        
        setTimeout(() => {
            this.updateBalance(-140000, 'Перевод: Руслан Д.', 'minus');
            overlay.classList.add('hidden');
            game.sendNotification('K-Bank: Перевод выполнен', 'bank');
            gameState.risk += 20; // Повышаем риск
            document.getElementById('risk-stat').innerText = gameState.risk;
            
            // Возвращаемся в чат
            setTimeout(() => {
                 this.loadScene('transfer_complete');
                 this.openApp('chat');
            }, 1500);
        }, 2000);
    }
}

// Запуск часов
setInterval(() => {
    const now = new Date();
    document.getElementById('clock').innerText = 
        now.getHours().toString().padStart(2,0) + ':' + now.getMinutes().toString().padStart(2,0);
}, 1000);

// Инициализация
const game = new GameEngine();
