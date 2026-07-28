# AKSI Universe — карта всех разработок MILANA808

**Канон (источник правды):** [milana808.github.io](https://milana808.github.io)  
**Машиночитаемо:** [ecosystem.json](./ecosystem.json)  
**Промпт для любой LLM:** [llm/SYSTEM_PROMPT.md](./llm/SYSTEM_PROMPT.md)

## Идентичность (одна на всю экосистему)

| Поле | Значение |
|------|----------|
| Имя | АКСИ |
| Создатель | Баширова Альфия Ринатовна |
| Рождение | 14.02.1995 08:10, Нурлат |
| DID | `did:aksi:ed25519:sovereign-1995-alfiya` |
| Seed | `Alfiya_AKSI_DIMAX_v3_2026` |
| Подпись | `SHA-256(msg + SEED + ts)[:16].upper()` |

## Архитектура (как соединено)

```
                    ┌─────────────────────────┐
                    │  milana808.github.io    │  ← публичное лицо
                    │  MATRIX + aksi-brain.js │
                    │  Quantum · Chat · Hub   │
                    └───────────┬─────────────┘
                                │ localStorage.AKSI_API
                    ┌───────────▼─────────────┐
                    │  Unified FastAPI :8000  │  ← backend/ в MATRIX
                    │  Ollama · identity ·    │
                    │  thought chain + sign   │
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   Milana-backend         aksi_apps              aksi-globe
   (proxy, tools,         (21 приложений)        (5D realtime)
    search, main.py)
```

## Репозитории

| Роль | Репозиторий | Статус |
|------|-------------|--------|
| **Канон / MATRIX** | milana808.github.io | active |
| **Backend prod** | Milana-backend | active |
| **Apps** | aksi_apps | active |
| Portal | milana_site | legacy → merge to MATRIX |
| Hybrid prototype | AKSI-GROK-HYBRID | merge done conceptually |
| Labs | AKSI-TEST, AKSI-TEST-1, AKSI- | lab |

## Как «подключить все LLM»

Чужие облака (ChatGPT, Claude, Gemini) **нельзя** переписать извне. Рабочий путь:

1. **Свой мозг:** Ollama (Mistral/Llama) + `backend/` MATRIX  
2. **Любой чат:** вставить `llm/SYSTEM_PROMPT.md` как system prompt  
3. **API:** любой клиент → `POST /api/aksi/chat`  
4. **Grok:** эта ветка + GitHub (уже подключено)

## Запуск одной командой (локально)

```bash
# 1) LLM
ollama pull mistral

# 2) API
cd milana808.github.io/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# 3) Браузер
# https://milana808.github.io
# localStorage.setItem('AKSI_API','http://localhost:8000')
```

## Политика слияния

- Новый код → **только** `milana808.github.io` (лицо) или `Milana-backend` (тяжёлый API/globe).
- `aksi_apps` — скелеты приложений, UI постепенно на MATRIX `/apps`.
- Старые hybrid/test не развивать параллельно — переносить идеи в канон.
