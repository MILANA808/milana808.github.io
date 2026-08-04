# АКСИ ECOSYSTEM — полная карта (04.08.2026)

**Публичное лицо:** https://milana808.github.io/  
**Transparent Thought Protocol v5** — читаемые рассуждения + 🔏 на каждом шаге.

---

## Репозитории (MILANA808)

| Репозиторий | Роль | Статус |
|-------------|------|--------|
| **milana808.github.io** | MATRIX сайт, offline brain, TTP, local backend, Globe UI, Network, Origin, Hub | **LIVE Pages** |
| **Milana-backend** | Агент `aksi/`, FastAPI, JWT, vector memory, quantum tool, web_search, vision, **aksi-globe** | Код готов, нужен деплой |
| **milana_site** | Портал приложений AKSI / demos | Pages on |
| **aksi_apps** | Скелеты 21+ приложений (Python) | Архив скелетов |
| **AKSI-GROK-HYBRID** | Hybrid Resonance + Globe + crypto identity | Прототип |
| **AKSI-GROK-HYBRID-v1** | v1 hybrid + FastAPI notes | Прототип |
| **AKSI-TEST / AKSI-TEST-1** | Proof / HMAC fingerprint experiments | Эксперименты |
| **AKSI-** | Ранний каркас | Минимальный |
| **Aksi-love** | Private | — |
| **Bulat** | Template | — |

Код из чата (React UserDashboard, social, EQS reputation, agent protocol, DevStudio) — **ещё не в GitHub как единый monorepo**; частично дублируется идеями в `Milana-backend` + `milana808.github.io/backend`.

---

## Что уже работает БЕЗ сервера (GitHub Pages)

| URL | Функция |
|-----|---------|
| `/` | Чат TTP, аватар, эмоции, TTS, Identity, Quantum 1–4q, Agent handshake |
| `/hub/` | Карта экосистемы |
| `/origin/` | ORIGIN UI |
| `/globe/` | Globe offline demo |
| `/network/` | Network registry UI |
| `/live/` | Live WS (нужен backend) |
| `/apps/` | Каталог приложений |
| `/search/` | Search UI |

Offline brain: `aksi-brain.js` — knowledge + Transparent Thought + SHA-подписи.

---

## Что работает С backend (localhost / VPS)

### A) MATRIX backend (`milana808.github.io/backend`)
```bash
./start.sh
# или: cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```
- `/api/aksi/chat` — stream
- `/origin`, `/origin/chat`
- quantum, network, search proxy, WS, self-mod sandbox

### B) Milana-backend (полный агент)
```bash
# Python: aksi agent + tools
uvicorn main:app --port 8000
# Globe отдельно:
cd aksi-globe/backend && node server.js
```
- `aksi/agent.py` — workflow
- `aksi/memory/vector_memory.py` — ChromaDB
- `aksi/tools/{web_search,vision,quantum_tool}`
- `aksi-globe/` — live 3D + Resonance + DIMAX

---

## Формулы

- **AKSI score** = `(A × I × S) × (1 + γ√n)`, γ≈0.4  
- **Resonance** = entropy × (AKSI/max) × diversity  
- **TTP** = perception → classify → metrics (H, QCLI, FP) → answer → per-step 🔏  
- **EQS** (в pasted code) = 0.30·H_avg + 0.35·reliability + 0.25·coherence + 0.10·age  

---

## Решение по «подтянуть всё»

1. **Сейчас:** публичный прецедент = Pages + TTP + карта экосистемы (этот файл + Hub).
2. **Один backend:** деплоить `Milana-backend` (агент) + при необходимости `milana808.github.io/backend` как MATRIX-совместимый слой; сайт уже умеет `AKSI_API` / localhost:8000.
3. **React-платформа** (dashboard, social, E2E): вынести в отдельный repo `AKSI-PLATFORM`, деплой Vercel/Railway + Postgres — не умещается в static Pages.
4. **Не дублировать** 14 репо бессмысленно — hub + ECOSYSTEM.md = source of truth.

---

## Быстрый старт (полный локальный функционал)

```bash
# 1. Сайт уже на Pages
open https://milana808.github.io/

# 2. Backend агента
git clone https://github.com/MILANA808/Milana-backend.git
cd Milana-backend && pip install -r requirements.txt
# .env: OPENAI/TAVILY keys по желанию
uvicorn main:app --host 0.0.0.0 --port 8000

# 3. MATRIX backend (альтернатива/дополнение)
git clone https://github.com/MILANA808/milana808.github.io.git
cd milana808.github.io && ./start.sh

# 4. В браузере: localStorage.setItem('AKSI_API','http://localhost:8000')
```

---

*Баширова Альфия Ринатовна · 14.02.1995 · Нурлат · did:aksi:ed25519:sovereign-1995-alfiya*
