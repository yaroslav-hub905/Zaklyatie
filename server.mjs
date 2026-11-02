// Заклятые — Telegram-бот + мини-приложение. Без зависимостей, нужен Node 20+.
// Переменные окружения:
//   BOT_TOKEN   — токен от @BotFather (без него запускается только сайт с игрой)
//   WEBAPP_URL  — публичный https-адрес игры; на Railway берётся сам из RAILWAY_PUBLIC_DOMAIN
//   PORT        — порт веб-сервера (Railway задаёт сам)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.BOT_TOKEN || '';
const PORT = Number(process.env.PORT) || 3000;
const WEBAPP_URL = (process.env.WEBAPP_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '')).replace(/\/$/, '');

/* ---------------- сайт с игрой ---------------- */
// zaklyatye.html — единственный источник игры; здесь он оборачивается в полноценную страницу
// и получает скрипт Telegram, который включает кнопку «назад», вибрацию и цвета шапки.
async function gamePage() {
  const body = await readFile(path.join(ROOT, 'zaklyatye.html'), 'utf8');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#ecebe5">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      return res.end(await gamePage());
    }
    if (url.pathname === '/cover.png') {
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' });
      return res.end(await readFile(path.join(ROOT, 'bot', 'cover.png')));
    }
    if (url.pathname === '/health') { res.writeHead(200); return res.end('ok'); }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Не найдено');
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('Ошибка сервера');
  }
});
server.listen(PORT, () => console.log(`Игра: http://localhost:${PORT}  ·  публичный адрес: ${WEBAPP_URL || 'не задан'}`));

/* ---------------- бот ---------------- */
const api = async (method, payload, isForm = false) => {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, isForm
    ? { method: 'POST', body: payload }
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload || {}) });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
};

const playButton = (text = 'Открыть колоды') => ({ inline_keyboard: [[{ text, web_app: { url: WEBAPP_URL } }]] });

const WELCOME = `<b>Заклятые</b> · игра для своих

Две колоды на одну компанию.
<b>Клятва</b> — белая: признания, комплименты, тёплые задания.
<b>Проклятие</b> — чёрная: неудобные вопросы и задания, которые понравятся не всем.

Смешайте колоды, впишите имена и передавайте телефон по кругу.`;

const RULES = `<b>Как играть</b>

1. Соберитесь: от 2 до 12 человек, впишите имена.
2. Выберите режим: <i>Мир</i> — только белая, <i>Война</i> — только чёрная, <i>Смесь</i> — обе в одной куче, <i>Выбор</i> — каждый решает сам.
3. В свой ход коснись колоды и прочитай карту вслух.
4. Выполнил: белая +1, чёрная +2. Отказ от белой — тянешь чёрную, отказ от чёрной — минус очко.
5. Стоп-слово «пас» без штрафа, если задание задевает всерьёз.

Побеждает тот, кто первым наберёт выбранное число очков.`;

let coverFileId = null;
async function sendWelcome(chatId) {
  const extra = { caption: WELCOME, parse_mode: 'HTML', reply_markup: playButton() };
  if (coverFileId) return api('sendPhoto', { chat_id: chatId, photo: coverFileId, ...extra });
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('photo', new Blob([await readFile(path.join(ROOT, 'bot', 'cover.png'))], { type: 'image/png' }), 'cover.png');
  for (const [k, v] of Object.entries(extra)) form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  const msg = await api('sendPhoto', form, true);
  coverFileId = msg.photo.at(-1).file_id;
}

async function onUpdate(u) {
  const m = u.message;
  if (!m || !m.text) return;
  const cmd = m.text.split(/[\s@]/)[0];
  if (cmd === '/start' || cmd === '/play') return sendWelcome(m.chat.id);
  if (cmd === '/rules') return api('sendMessage', { chat_id: m.chat.id, text: RULES, parse_mode: 'HTML', reply_markup: playButton('Играть') });
  return api('sendMessage', { chat_id: m.chat.id, text: 'Карты ждут на столе 👇', reply_markup: playButton('Играть') });
}

async function setupBot() {
  await api('deleteWebhook', { drop_pending_updates: false });
  await api('setMyCommands', { commands: [
    { command: 'start', description: 'Открыть игру' },
    { command: 'rules', description: 'Правила' },
  ] });
  await api('setMyShortDescription', { short_description: 'Две колоды на одну компанию: белая сплачивает, чёрная ссорит.' });
  await api('setMyDescription', { description: 'Заклятые — карточная игра для друзей. Белая колода «Клятва» сплачивает, чёрная «Проклятие» проверяет дружбу на прочность. Колоды можно смешивать.' });
  await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Играть', web_app: { url: WEBAPP_URL } } });
}

async function poll() {
  let offset = 0;
  for (;;) {
    try {
      const updates = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        onUpdate(u).catch(e => console.error('update', e.message));
      }
    } catch (e) {
      console.error('poll', e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

if (!TOKEN) {
  console.warn('BOT_TOKEN не задан — работает только сайт с игрой.');
} else if (!WEBAPP_URL.startsWith('https://')) {
  console.warn('WEBAPP_URL должен начинаться с https:// — Telegram открывает мини-приложения только по https. Бот не запущен.');
} else {
  setupBot()
    .then(() => { console.log('Бот запущен'); poll(); })
    .catch(e => { console.error('Не удалось настроить бота:', e.message); process.exit(1); });
}
