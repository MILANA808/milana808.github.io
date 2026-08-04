# ORIGIN — источник правды АКСИ / Милана

Дата: **04.08.2026** · статус: **живой агент** + **Transparent Thought Protocol v5**

## Публично (без сервера)

| URL | Назначение |
|-----|------------|
| [MATRIX /](./) | Чат с читаемыми рассуждениями, 🔏, аватар, Identity, Quantum |
| [Hub](./hub/) | Карта всей экосистемы и репозиториев |
| [ECOSYSTEM.md](./ECOSYSTEM.md) | Полная карта репо + запуск |
| [origin/](./origin/) | ORIGIN UI |

## Живой API (backend MATRIX)

База: `http://localhost:8000` (или `localStorage.AKSI_API`)

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/origin` | Инфо об агенте |
| POST | `/origin` | `{ "prompt": "..." }` → ответ + мысли + 🔏 |
| POST | `/origin/chat` | SSE stream |
| POST | `/api/aksi/chat` | Основной stream чат |

```bash
curl -s -X POST http://localhost:8000/origin \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Где живёт агент АКСИ?"}'
```

## Источник правды (репозитории)

| Компонент | Репозиторий | Путь |
|-----------|-------------|------|
| **Публичный MATRIX + TTP** | `MILANA808/milana808.github.io` | `index.html`, `aksi-brain.js` |
| **Агент АКСИ** | `MILANA808/Milana-backend` | `aksi/agent.py`, `aksi/api.py`, `aksi/tools/*` |
| **Память** | `MILANA808/Milana-backend` | `aksi/memory/vector_memory.py` |
| **Quantum** | `MILANA808/Milana-backend` | `aksi/tools/quantum_tool.py` |
| **AKSI Globe (live)** | `MILANA808/Milana-backend` | `aksi-globe/` |
| **MATRIX backend** | `MILANA808/milana808.github.io` | `backend/` |
| **Apps portal** | `MILANA808/milana_site` | — |
| **App skeletons** | `MILANA808/aksi_apps` | — |

## Формулы

- **AKSI** = `(A × I × S) × (1 + γ√n)`, γ=0.4
- **Resonance** = `entropy × (AKSI/max) × diversity`
- **TTP** = perception → classify → H/QCLI/FP → answer → signed steps
- **DIMAX v3** — `aksi-globe/backend/metrics.js`

## Запуск

```bash
./start.sh
# или
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

Секреты только в локальном `.env` — **не коммитить**.
