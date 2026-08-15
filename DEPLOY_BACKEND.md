# Деплой бэкенда АКСИ (Milana-backend)

Чат на Pages **уже отвечает** через offline-ядро (`/aksi/`, `/wake/`).
Ollama + FastAPI нужен только для «большой» LLM на сервере.

## Render.com

1. Fork `MILANA808/Milana-backend`
2. New Web Service → repo → Runtime Python
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Env (без секретов в git):
   - `RESONANCE_SEED=AKSI_DIMAX_v3_2026`
   - `AKSI_DID=did:aksi:ed25519:sovereign-2026`
   - `OLLAMA_URL=` (пусто, если нет Ollama)
6. После деплоя: в `/aksi/` → вкладка Backend → вставить `https://YOUR.onrender.com` → Сохранить → Ping

## Ollama

На бесплатном Render **Ollama обычно не ставят** (нет GPU/места).
Варианты:
- VPS с Ollama + reverse proxy
- Локально: `ollama serve` + `uvicorn main:app --port 8000` + ngrok

## CORS

В FastAPI должно быть:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://milana808.github.io", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Проверка успеха

1. `/aksi/` отвечает без Backend URL
2. С Backend URL — `POST /api/aksi/chat`
3. Подпись: вкладка «Подпись» → Подписать / Проверить
