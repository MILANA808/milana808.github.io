# Сеть АКСИ — статус и честная дорожная карта

Дата: **28.07.2026**

## Что уже работает (прототип)

| Компонент | Статус | Где |
|-----------|--------|-----|
| Чат + ход мыслей + 🔏 | ✅ | MATRIX + `/api/aksi/chat` + offline brain |
| Identity / DID | ✅ | `/identity` |
| Quantum statevector UI | ✅ | вкладка Quantum |
| ORIGIN agent | ✅ | `/origin`, UI `origin/` |
| WebSocket live | ✅ | `/ws`, UI `live/` |
| Self-mod (sandbox only) | ✅ | `/api/self-mod/*` |
| User profiles | ✅ | `GET/POST /user/status|config` |
| Node registry (bootstrap) | ✅ | `/network/nodes`, `/network/register` |
| Complexity classifier | ✅ | `/network/classify` (классический) |
| Grover-style demo | ✅ | `/network/grover-search` (**симуляция**, не hardware) |
| Globe offline | ✅ | `globe/` |

## Что ещё не готово (и не стоит врать)

- Реальный **libp2p / WebRTC mesh** между узлами
- Hardware quantum speedup (QPU)
- Federated learning / LoRA online
- Полный React+Monaco IDE
- Автопатчи ядра без sandbox

Теоремы (Байес, Нётер, Белл) используются как **рамки проектирования** и эвристики, не как «доказанный AGI».

## Запуск узла

```bash
cd backend
uvicorn main:app --port 8000
# второй узел: --port 8001 и POST /network/register
```

UI: [network/](./network/) · Live WS: [live/](./live/) · MATRIX: [./](./)

## API сети

- `GET /network/nodes`
- `POST /network/register` `{ "name", "endpoint", "skills" }`
- `POST /network/heartbeat` `{ "node_id", "load" }`
- `POST /network/classify` `{ "text" }`
- `POST /network/grover-search` `{ "query", "items"? }`
- `POST /network/route?skill=chat`
- `GET /user/status?user_id=`
- `POST /user/config`
