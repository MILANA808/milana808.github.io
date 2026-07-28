# ORIGIN — источник правды АКСИ / Милана

Дата: **28.07.2026** · статус: **живой агент** (не только Markdown)

## Живой API (backend MATRIX)

База: `http://localhost:8000` (или твой `AKSI_API`)

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/origin` | Инфо об агенте |
| POST | `/origin` | JSON: `{ "prompt": "..." }` → ответ + мысли + 🔏 |
| POST | `/origin/chat` | SSE stream (как `/api/aksi/chat`) |

### Пример

```bash
curl -s -X POST http://localhost:8000/origin \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Где живёт агент АКСИ?"}'
```

Ответ содержит: `answer`, `thoughts[]` (text + signature), `signature`, `resonance`, `source`.

UI: [origin/](./origin/) · MATRIX: [index](./) · Hub: [hub/](./hub/)

## Источник правды (репозитории)

| Компонент | Репозиторий | Путь |
|-----------|-------------|------|
| **Агент АКСИ** | `MILANA808/Milana-backend` | `aksi/agent.py`, `aksi/api.py`, `aksi/tools/*` |
| **Память** | `MILANA808/Milana-backend` | `aksi/memory/vector_memory.py` |
| **Quantum** | `MILANA808/Milana-backend` | `aksi/tools/quantum_tool.py` |
| **AKSI Globe** | `MILANA808/Milana-backend` | `aksi-globe/` |
| **MATRIX + ORIGIN API** | `MILANA808/milana808.github.io` | `backend/`, `origin/` |

## Формулы (aksi-globe)

- **AKSI** = `(A × I × S) × (1 + γ√n)`, γ=0.4
- **Resonance** = `entropy × (AKSI/max) × diversity`
- **DIMAX v3** — `aksi-globe/backend/metrics.js`

## Запуск

```bash
# LLM + ORIGIN API
./start.sh
# или
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

Секреты только в локальном `.env` — **не коммитить**.
