# AKSI Autonomous Intelligence Runtime v1.1

**Live:** https://milana808.github.io/runtime/  
**Contact:** aksilove@internet.ru

## What it is

```text
GOAL → PLAN → RESEARCH → EXTRACT → MULTI-PATH → CONFLICT → FOLLOW-UP → SELF-CHECK → REPORT → MEMORY → PROOF
```

Not a chatbot. Not AGI.

## Quick start

1. Open https://milana808.github.io/runtime/
2. demo1–demo4 or type a goal → **RUN**
3. Export session JSON for reproducibility

## Files

| Path | Role |
|------|------|
| `core/engine.js` | Orchestrator v1.1 |
| `index.html` | Operator UI |
| `backend/main.py` | Optional FastAPI |
| `eval/benchmark.json` | 20-task suite defs |

## Tools

web_search (Wikipedia) · web_open (wiki REST) · github_read · memory · report · optional llm_complete

## Browser API

```js
await AKSI_RUNTIME.startGoal(goal, { onLive, llm_endpoint, approvals })
AKSI_RUNTIME.exportSession(session)
```

## Server API

```bash
pip install fastapi uvicorn httpx
uvicorn main:app --port 8787
```

POST /runtime/task · GET /runtime/task/{id} · /graph · /evidence · /proof · /memory · approve/reject

## Limitations

CORS on non-Wikipedia URLs · strategy multi-path without API keys · FNV chain (Ed25519 on server proof.py)

Proprietary AKSI · aksilove@internet.ru
