# AKSI Autonomous Intelligence Runtime v1.0

**Contact:** aksilove@internet.ru  
**Live:** https://milana808.github.io/runtime/

## What it is

Orchestration layer: GOAL → PLAN → RESEARCH → MULTI-PATH → CONFLICT → REPORT → MEMORY → HASH-CHAIN PROOF.

Not a chatbot. Not AGI. Not quantum consciousness.

## Architecture

| Module | Role |
|--------|------|
| `core/engine.js` | Session, task graph, world state, evidence/claims/conflicts, tools, multi-path, proof chain, main loop |
| `index.html` | Operator UI |
| Tools | web_search (Wikipedia), web_open, github_read, memory, report |

Epistemic types: FACT, CLAIM, EVIDENCE, CONFLICT, UNCERTAINTY.

Permission levels 0–3; level 2–3 require approval flags.

Limits: MAX_ITERATIONS, TIME_LIMIT_MS, ACTION_LIMIT, FAILURE_LIMIT.

Multi-path: A_conservative, B_synthesis, C_skeptical, AKSI_internal (optional llm_endpoint).

Proof: FNV event hash-chain. Backend `proof.py` Ed25519 remains for server deployments.

## Limitations

- Browser CORS blocks many URLs; Wikipedia + GitHub API work.
- Without API keys, multi-path is strategy-based not multi-vendor LLM.
- No headless Chromium in static Pages build.

## License

Proprietary AKSI · aksilove@internet.ru
