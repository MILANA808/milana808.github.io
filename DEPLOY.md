# AKSI MATRIX — Deploy & Internet for AI

## 1. Локально (быстрый старт)

```bash
# Ollama
ollama pull mistral

# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # добавь ключи поиска
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Сайт: открой https://milana808.github.io  
В консоли браузера:
```js
localStorage.setItem('AKSI_API', 'http://localhost:8000')
location.reload()
```

## 2. Docker (продакшен-скелет)

```bash
# из корня milana808.github.io
cp .env.example .env
# заполни AKSI_TAVILY_API_KEY или AKSI_SERPER_API_KEY

docker compose up -d --build
```

Сервисы:
- `http://localhost:8000` — FastAPI (chat, identity, quantum, health)
- docs: `http://localhost:8000/docs`

Ollama на хосте: в `.env` укажи `OLLAMA_HOST=http://host.docker.internal:11434`

## 3. Интернет-поиск для ИИ

Статический GitHub Pages **не** ходит в интернет с API-ключами.

Ключи только на backend:

```env
AKSI_TAVILY_API_KEY=tvly-...
# или
AKSI_SERPER_API_KEY=...
```

Полный agent search: репозиторий **Milana-backend** → `POST /aksi/v2/tools/search`

Упрощённый unified backend (эта папка `backend/`) — chat + metrics; web search подключается через Milana-backend или httpx-прокси.

## 4. Globe5D

- Статический демо-глоб: `/globe/` (Canvas, без сервера)
- Полный realtime (Socket.IO + AI objects): `Milana-backend/aksi-globe` → `npm start` → :3000

## 5. 21 приложение

Список: `APPS.md` и `search.js` (`window.AKSI_APPS`).  
Статусы: live / wip / concept. Реализация UI — поэтапно.

## 6. VPS (кратко)

1. Ubuntu + Docker + Ollama
2. `git clone` этот репо
3. `.env` с ключами
4. `docker compose up -d`
5. Nginx reverse proxy + HTTPS (Caddy/Certbot)
6. `localStorage.AKSI_API = 'https://api.твой-домен'`
