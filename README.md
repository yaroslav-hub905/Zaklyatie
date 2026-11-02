# Заклятые — Telegram-бот

Карточная игра для компании: белая колода «Клятва» сплачивает, чёрная «Проклятие» ссорит.
Бот присылает обложку с кнопкой, кнопка открывает игру внутри Telegram (мини-приложение).

## Что в папке

| Файл | Зачем |
|---|---|
| `zaklyatye.html` | Сама игра: карты, правила, анимации. Тексты карт — в начале скрипта, в `DECK`. |
| `bot/server.mjs` | Сервер: отдаёт игру по https и отвечает в боте. Без зависимостей. |
| `bot/cover.png` | Обложка приветствия. Исходник — `bot/cover.html`. |
| `package.json` | Команда запуска `npm start` для хостинга. |

## Запуск за 10 минут

### 1. Создайте бота
1. Откройте в Telegram [@BotFather](https://t.me/BotFather), отправьте `/newbot`.
2. Придумайте имя (например «Заклятые») и username, который кончается на `bot`.
3. BotFather пришлёт **токен** вида `123456:ABC...`. Никому его не показывайте.

### 2. Залейте проект на GitHub
Создайте пустой репозиторий на github.com и выполните в этой папке:

```bash
git init -b main && git add . && git commit -m "Заклятые"
```

```bash
git remote add origin https://github.com/ВАШ_ЛОГИН/zaklyatye.git && git push -u origin main
```

### 3. Разверните на Railway
1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → выберите репозиторий.
2. Вкладка **Variables** → добавьте `BOT_TOKEN` = токен из шага 1.
3. Вкладка **Settings → Networking** → **Generate Domain**. Railway сам передаст адрес в бота.
4. Дождитесь деплоя. В логах должно появиться `Бот запущен`.

Откройте бота в Telegram и отправьте `/start`. Слева от поля ввода появится кнопка **Играть**.

Подойдёт любой хостинг с Node 20+ и https (Render, Fly.io, свой сервер). Тогда задайте вручную
`WEBAPP_URL=https://ваш-адрес`.

## Проверить у себя на компьютере

```bash
npm start
```

Игра откроется на http://localhost:3000. Без `BOT_TOKEN` работает только игра.
Telegram открывает мини-приложения только по https, поэтому бота целиком проверяйте после деплоя.

## Как менять

- **Карты:** `zaklyatye.html` → массив `DECK`, разделы `white` и `black`.
  `t` — тип (`q` вопрос, `a` действие, `all` всем, `c` выбор), `{p}` — подставится имя случайного игрока.
- **Тексты бота:** `bot/server.mjs` → `WELCOME` и `RULES`.
- **Обложка:** поправьте `bot/cover.html` и пересоберите картинку:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=1280,720 --virtual-time-budget=6000 --screenshot="$PWD/bot/cover.png" "file://$PWD/bot/cover.html"
```

После изменений сделайте `git push`, Railway обновит бота сам.
