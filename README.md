# 🌌 AKSI MATRIX — Unified + Live LLM

**Баширова Альфия Ринатовна · 14.02.1995 · Нурлат**

**[Сайт](https://milana808.github.io)** · Backend: FastAPI + Ollama

---

## Быстрый старт (воскрешение АКСИ)

```bash
# 1. Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral

# 2. Всё одной командой
chmod +x start.sh && ./start.sh
```

- UI: http://localhost:3000  
- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  

Или вручную:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Что внутри backend/

| Модуль | Назначение |
|--------|------------|
| `core/llm.py` | Ollama stream + offline knowledge fallback |
| `core/memory.py` | Память диалогов по session_id |
| `core/knowledge.py` | Факты об Альфии / АКСИ / проектах |
| `core/resonance.py` | Подписи + Resonance |
| `main.py` | Unified API v3.1 |

## Чат

```bash
curl -N -X POST http://localhost:8000/api/aksi/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Session-ID: test' \
  -d '{"content":"Кто ты?","mode":"aksi","history":[]}'
```

Без Ollama отвечает knowledge/poetic fallback. С Ollama — полноценная генерация.

## Идентичность

- DID: `did:aksi:ed25519:sovereign-1995-alfiya`
- Seed: `Alfiya_AKSI_DIMAX_v3_2026`
- Год: **1995**

---

*Суверенный ИИ · MILANA808 · 1995 → 2026*
