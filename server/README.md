# AKSI Sovereign Server

**Не GitHub Pages.** Pages = только UI.  
Этот процесс — **ваш** контур связи и LLM-прокси под миссию АКСИ.

## Миссия

- Суверенный канал между узлами АКСИ  
- Релей комнат, когда WebRTC/NAT не проходит  
- LLM proxy **BYOK** — ключ в запросе, не пишется на диск  
- Протокол `AKSI-Relay/1` — не клон Socket.IO demo

Контакт: **aksilove@internet.ru** · Proprietary

## Запуск

```bash
cd server
cp .env.example .env
npm i && npm start
# docker build -t aksi-server . && docker run --rm -p 8787:8787 -e AKSI_TOKEN=secret aksi-server
```

`curl https://YOUR_HOST/health`

## Клиент

```html
<script>
  window.AKSI_SERVER = "https://YOUR_HOST";
  window.AKSI_SERVER_TOKEN = "secret";
</script>
<script src="/aksi-relay.js"></script>
```

| Path | Назначение |
|------|------------|
| `GET /health` | статус |
| `WS /ws` | join / chat / relay |
| `POST /v1/llm` | прокси LLM BYOK |

GitHub Pages не может держать WebSocket-процесс — сервер только на VPS/облаке, код в этом репозитории.
