# AKSI Unified Migration

The canonical product is `MILANA808/milana808.github.io`.

## Integrated now

- Canonical local-first UI/runtime remains the source of truth.
- Repository registry covers the accessible MILANA808 ecosystem.
- A unified ecosystem panel is available from the main site.
- Optional backend adapter is isolated and network-off by default.
- Existing Trust/Core/Orchestrator/Control Plane remain the runtime foundation.

## Source repositories audited

- `Milana-backend`: FastAPI API, chat, world search, Codex, agents, metrics, logs, crypto-key records.
- `milana_site`: Flask platform, Metacode/Resonance/Memory concepts, 21-app frontend.
- `aksi_apps`: full-stack skeleton with frontend/backend/tests/Docker.
- `Aksi-love`: private companion source; not copied into a public repository.
- `AKSI-TEST-1`: tested FastAPI/static platform with chat, notes, todos, diagnostics and export.
- `AKSI-GROK-HYBRID*`: Matrix prototype; conceptually integrated, not copied as a fake AI implementation.
- `glorious-potato`: crypto signatures, AI notary, SHA/integrity and automation experiments are candidates for the sovereign core.
- `Agi`, `AKSI-`, `gpt-oss-safeguard`, `MCP-GitLab-insights-`, `plugins-quickstart`, `Bulat`: audited as source/experimental modules.
- `codex`, `SuperAGI`, `openai-cookbook`: treated as development/upstream-derived material rather than blindly vendored into the product.

## Important boundary

A GitHub Pages site cannot execute FastAPI/Node/Python server processes by itself. Therefore server functionality is integrated through an explicit adapter and source manifest until a separately deployed backend is connected. The site must never pretend that a backend is live when it is not.

## Security findings

The older backend contains a public README reference to a value described as an identity seed, permissive CORS, and a proof endpoint that reports `verified: true` without an independent verification step. These are tracked separately and must be fixed before the backend is treated as a trusted production authority.
