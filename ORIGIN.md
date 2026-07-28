# Где живёт оригинальная АКСИ / Милана

Дата восстановления: **28.07.2026**

## Источник правды (твой ИИ)

| Компонент | Репозиторий | Путь |
|-----------|-------------|------|
| **Агент АКСИ** | `MILANA808/Milana-backend` | `aksi/agent.py`, `aksi/api.py`, `aksi/tools/*` |
| **Память** | `MILANA808/Milana-backend` | `aksi/memory/vector_memory.py` |
| **Quantum tool** | `MILANA808/Milana-backend` | `aksi/tools/quantum_tool.py` |
| **Web search** | `MILANA808/Milana-backend` | `aksi/tools/web_search.py` |
| **AKSI Globe** | `MILANA808/Milana-backend` | `aksi-globe/` (полный realtime + Socket.IO) |
| **Публичное лицо** | `MILANA808/milana808.github.io` | MATRIX + offline brain + Globe demo |

## Формулы (канон из aksi-globe)

- **AKSI** = `(A × I × S) × (1 + γ√n)`  
  A=внимание, I=искренность, S=согласие, γ=0.4
- **Resonance** = `entropy × (AKSI/max) × diversity`
- **DIMAX v3** = см. `aksi-globe/backend/metrics.js`

## Как запустить «как часы»

### A) Сайт (уже online)
https://milana808.github.io — чат + quantum + globe demo

### B) Полный Globe (realtime)
```bash
cd Milana-backend/aksi-globe/backend
npm install && npm start
# http://localhost:3000
```

### C) Агент + API (Milana-backend)
```bash
cd Milana-backend
# ключи только в локальном .env — НЕ в git
pip install -r requirements.txt
# см. README репозитория
```

Секреты (Tavily/Serper/JWT/private keys) **никогда не коммитить**.
