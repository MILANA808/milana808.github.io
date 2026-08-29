# АКСИ (AKSI)

**Local-first offline AI companion** with explicit network consent and verifiable policy.

**Live:** https://milana808.github.io  
**Contact:** aksilove@internet.ru · X [@AKSILOVE](https://x.com/AKSILOVE)

---

## What you get

A working **product in the browser** (no install required):

| Surface | What it does |
|---------|----------------|
| **Chat** | Unified answers: Brain → **Neuro (offline LLM)** → optional Web → Core → Ollama |
| **Memory** | Facts stay in this browser (`запомни: …`) |
| **Photo** | Local OCR / vision path |
| **Home** | Offline proof demo, teach, export proof, PRECEDENT |
| **Lab** | Neuro UI, Mind, Quantum, Trust, DKV, Seal, Web, Ollama |

**Default: offline.** Internet only after the **Сеть / Network** checkbox.

---

## Principles

1. **Local first** — dialogue and memory work without a server.
2. **Consent for network** — search/API only when the user enables it.
3. **Provable policy** — [`PRECEDENT.json`](./PRECEDENT.json) + proof/export session trail.
4. **No private keys on remote servers** — identity stays in the browser.
5. **Honest scope** — not AGI; not a cloud frontier model replacement. A **sovereign companion layer**.

---

## Architecture (runtime)

```text
UI (index.html)
  ├─ Chat / Memory / Photo / Home / Lab
  └─ Orchestration
       AKSI_MIND.think()
         → Quantum shot (optional meta)
         → Brain (local KB)
         → Neuro  (offline LLM / retrieve + learn)   ← local AI
         → Web    (only if consent ON)
         → Core   (wiki/ddg when allowed)
         → LLM    (Ollama / OpenAI-compatible BYOK)
         → Trust  (verify / ledger hooks)
```

Key scripts:

| File | Role |
|------|------|
| `aksi-core.js` | Stable core search / local helpers |
| `aksi-neuro.js` | **Offline local AI** (CPU, pure JS) |
| `aksi-mind.js` | Unified router |
| `aksi-one.js` | Chat runtime / wire |
| `aksi-web.js` | Opt-in internet |
| `aksi-brain.js` | Local knowledge complete |
| `aksi-llm.js` | Optional Ollama / cloud providers |
| `aksi-product-ui.js` | Proof demo, compare, teach, export |
| `PRECEDENT.json` | Machine-readable offline-first policy |

Legacy lab surfaces (`/aksi-matrix/`, system/omega pages) remain reachable; **the product entry is `/`**.

---

## Quick start

1. Open **https://milana808.github.io** and hard-refresh (**Ctrl+F5** / pull-to-refresh).
2. Ask in Chat: `Кто ты?`, `Работает ли без интернета?`
3. Teach: `запомни: мой факт`
4. Optional network: enable **Сеть**, then search-style questions.
5. Optional stronger model:

```bash
ollama run llama3.2
```

Then **Lab → Settings (Ollama)**.

---

## Offline local AI (Neuro)

- Runs **entirely in the browser** (no GPU required).
- Answers from built-in knowledge + facts you teach.
- Learns with `запомни:` / Neuro → Выучить.
- Does **not** replace large cloud models; it is the **always-on offline brain**.

---

## Verify offline policy

1. Leave **Сеть** off.
2. Home → **Докажи offline**.
3. Open [`PRECEDENT.json`](https://milana808.github.io/PRECEDENT.json).
4. Export proof session from Home when available.

---

## Privacy

- No analytics trackers in the product shell.
- Network calls only after consent (or optional local Ollama on your machine).
- Public contact only: **aksilove@internet.ru**.

---

## License

Proprietary — see `LICENSE` / `PROPRIETARY.md`.  
Unauthorized commercial redistribution of the runtime is not allowed without a license from the author.

---

## Repo map

| Path | Notes |
|------|--------|
| `index.html` | Product UI (mobile-first) |
| `aksi-*.js` | Modules |
| `PRECEDENT.json` | Policy attestation |
| `/aksi-matrix/` | MATRIX surface (legacy/lab) |
| `Milana-backend` (separate repo) | Optional API / agent server |

---

*AKSI · offline by default · proof over slogans*
