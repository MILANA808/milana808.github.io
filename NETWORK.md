# Сеть АКСИ — статус

**28.07.2026b**

## Работает

| Компонент | API / UI |
|-----------|---------|
| Чат + мысли + 🔏 | `/api/aksi/chat`, offline brain |
| WebSocket | `/ws` · [live/](./live/) |
| ORIGIN | `/origin` · [origin/](./origin/) |
| Self-mod sandbox | `/api/self-mod/*` |
| User config → LLM model/temp/prompt | `/user/config` · `/user/status` |
| Реестр узлов | `/network/nodes` · register · heartbeat |
| Classify / Grover-demo | `/network/classify` · `grover-search` |
| **Peer HTTP relay/forward** | `/network/relay` · `/network/forward` |
| Панель | [network/](./network/) |

## Два узла (локально)

```bash
# терминал 1
cd backend && uvicorn main:app --port 8000

# терминал 2
uvicorn main:app --port 8001

# зарегистрировать второй узел на первом
curl -X POST http://localhost:8000/network/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"node-b","endpoint":"http://localhost:8001","skills":["chat"]}'

# делегировать сложный запрос
curl -X POST http://localhost:8000/network/forward \
  -H 'Content-Type: application/json' \
  -d '{"content":"Спроектируй архитектуру федеративной сети АКСИ с P2P"}'
```

## Ещё не сделано

- libp2p / WebRTC mesh  
- hardware quantum  
- federated learning  

См. [ecosystem.json](./ecosystem.json) · `status`.
