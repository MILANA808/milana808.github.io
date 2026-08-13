# AKSI UNIVERSE — MONOREPO ARCHITECTURE

> One repository. One source of truth. Many runtime surfaces.

## Goal

Consolidate the AKSI/Milana product family into a single engineering workspace without destroying the original repositories. The originals remain immutable source archives until migration is verified.

## Canonical layout

```text
AKSI-UNIVERSE/
├── apps/                    # user-facing products
│   ├── milana/              # Milana / AKSI Chat / Companion
│   ├── love/                # AKSI Love
│   ├── shopping/            # AKSI Shopping / DressUp AR
│   ├── mood-mirror/         # Mood Mirror
│   └── globe/               # AKSI Globe / 5D visualization
├── core/                    # canonical AKSI runtime
│   ├── kernel/
│   ├── memory/
│   ├── knowledge/
│   ├── reasoning/
│   ├── resonance/
│   ├── identity/
│   └── metrics/
├── services/                # server-side capabilities
│   ├── api/
│   ├── world-search/
│   ├── auth/
│   └── jobs/
├── research/                # experimental / research systems
│   ├── agi/
│   ├── quantum/
│   ├── dimax/
│   └── experiments/
├── packages/                # reusable SDKs and UI
├── tests/                   # unit / integration / smoke / e2e
├── docs/                    # architecture, whitepaper, invention record
├── infra/                   # deployment, Docker, CI/CD
└── archive/                 # migration manifests and provenance only
```

## Source repositories mapped

| Repository | Target | Role |
|---|---|---|
| `milana808.github.io` | root + `apps/milana`, `core` | current canonical web/core prototype |
| `Milana-backend` | `services/api`, `services/auth` | FastAPI backend and identity |
| `aksi_apps` | `apps/*`, `tests`, `infra` | product skeleton / backend / Docker / tests |
| `Aksi-love` | `apps/love` | companion product |
| `milana_site` | `apps/milana` | Milana portal |
| `AKSI-TEST` | `tests/legacy/aksi-test` | experiment archive |
| `AKSI-TEST-1` | `tests/legacy/aksi-test-1` | experiment archive |
| `AKSI-` | `research/legacy/aksi` | experimental archive |
| `AKSI-GROK-HYBRID` | `research/hybrid/grok` | hybrid experiment |
| `AKSI-GROK-HYBRID-v1` | `research/hybrid/grok-v1` | hybrid experiment archive |
| `Agi` | `research/agi` | AGI experiments; preserve attribution/provenance |
| `SuperAGI` | `research/superagi` | external/research experiment; do not present as native AKSI code |
| `glorious-potato` | `research/github-models` | GitHub Models/Codespaces experiments |
| `AKSI-UNIVERSE` (this repo) | canonical root | final source of truth |

## Explicit exclusions

`openai-cookbook` is an upstream/open-source cookbook mirror, not AKSI-owned product code. It should remain an external reference rather than being copied into the proprietary monorepo.

`codex`, `plugins-quickstart`, `gpt-oss-safeguard`, `MCP-GitLab-insights-`, and unrelated personal experiments are not silently absorbed into production AKSI. They can be referenced from `archive/` if a later audit proves they contain AKSI-specific work.

## Migration rules

1. Never delete an original repository before parity is verified.
2. Preserve original commit SHAs in `archive/provenance.json`.
3. Secrets, API keys, tokens, private credentials and `.env` files are never migrated.
4. Experimental code is isolated from production code.
5. Every migrated module gets an owner, runtime classification and test status.
6. The root README must distinguish **working**, **experimental**, and **conceptual** functionality.
7. No AGI/quantum/consciousness claim is made merely because a folder or metric has that name.

## Definition of done

The monorepo is complete only when:

- the web application starts from the root;
- the API starts from the root;
- shared AKSI Core is imported by every first-party app;
- Memory, Context Bus, Identity and Metrics have one canonical implementation each;
- CI runs lint, tests and build checks;
- duplicate implementations are removed or marked as legacy;
- every migrated repository has a provenance record;
- production and research boundaries are explicit.
