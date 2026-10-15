# AKSI repository unification map

**Status:** architecture and migration contract, not a claim that all repositories are already runtime-integrated.  
**Canonical product repo:** `MILANA808/milana808.github.io`  
**Canonical execution service:** `MILANA808/Milana-backend`  
**Protocol baseline:** `AKSI-VAI/1`

## Goal

Turn the existing AKSI repositories into one coherent product without destroying their histories or treating duplicate prototypes as independent production systems. The public site owns product UX, public contracts, demos, research notes and browser tests. The backend owns server-side task execution, approvals, durable task journal, model gateway, source retrieval and service identity.

## Target runtime

```text
User / AKSI MATRIX
       |
       v
Site UI + versioned client adapter
       |
       | HTTPS, explicit permissions, bounded schemas
       v
Milana-backend / AKSI Core
       |
       +--> Task Registry + SQLite task store + journal
       +--> Model gateway / local model adapters
       +--> Public source retrieval / browser read mode
       +--> Memory and identity services
       +--> Approval gate for external actions
       |
       v
Evidence records -> verifier -> decision status -> integrity receipt
       |
       v
Reproducible report + tests + commit/version identifiers
```

The flow is a target contract. Each edge must have a passing integration test before being described as connected.

## Repository roles

| Repository | Intended role | Migration rule |
|---|---|---|
| `MILANA808/milana808.github.io` | Canonical public product, UI, protocols, demos, tests, research | Keep as product/control plane; do not move the public URL |
| `MILANA808/Milana-backend` | Canonical FastAPI execution plane | Integrate through documented APIs; never expose secrets in the site |
| `MILANA808/aksi_apps` | Product skeleton and app candidates | Inventory each app and its tests before porting |
| `MILANA808/milana_site` | Site/prototype candidate | Compare routes/assets before any migration |
| `MILANA808/Agi` | Research/agent candidate | Extract reusable, licensed, tested modules only |
| `MILANA808/SuperAGI` | Large upstream/agent codebase candidate | Treat as separate upstream; do not blindly copy or claim original work |
| `MILANA808/AKSI-GROK-HYBRID`, `AKSI-GROK-HYBRID-v1` | Hybrid model/interface experiments | Preserve provenance; port only tested, compatible pieces |
| `MILANA808/AKSI-TEST`, `AKSI-TEST-1` | Test/prototype repositories | Recover fixtures and history; promote useful tests into canonical CI |
| `MILANA808/AKSI-` | Small prototype | Inventory before deciding whether it has unique logic |
| `MILANA808/glorious-potato` | Large Codespace-derived candidate | Inspect origin, license, unique modules and dependencies before integration |
| `Aksilove/MILANA808-Milana-backend`, `Aksilove/Milana-backend1` | Backend copies/forks or historical variants | Compare commit ancestry and behavior; canonical runtime remains `MILANA808/Milana-backend` |
| `MILANA808/Aksi-love` | Small private project | Keep private; do not publish its contents during migration |
| `MILANA808/openai-cookbook` | External/reference mirror | Do not treat as proprietary AKSI code; check upstream license and provenance |
| `MILANA808/codex`, `MILANA808/MILANA808`, `MILANA808/Bulat`, `MILANA808/Test-site` | Not yet classified | Do not migrate until their contents and purpose are audited |

This map is a starting inventory from repository metadata and selected README/source files. It is not a full code-level audit of every repository. Classification must be revised after tree, license, dependency, commit ancestry and test review.

## Shared contracts

1. **Task**: stable task ID, goal, explicit permission set, lifecycle state, timestamps and append-only journal events.
2. **Evidence**: claim, source URL, observed source metadata/content digest, retrieval timestamp, verifier result and limitations. A URL alone is not verified evidence.
3. **Decision**: chosen option, alternatives, reasons, unresolved questions, policy outcome and links to evidence IDs.
4. **Receipt**: canonical serialized payload, SHA-256 digest, algorithm/version, code commit, creation time and optional signature. A digest detects changes; it does not prove truth or authorship.
5. **Memory**: scoped by user/session/project, provenance-tagged, deletable where required, and never silently mixed across users.
6. **Capabilities**: each module reports available / degraded / unavailable and why. UI embedding is not integration.

## Merge and migration rules

- No mass-copy or deletion of repositories. Preserve original histories and references.
- Select a canonical implementation only after comparing behavior, tests, license and provenance.
- Every migrated module gets an owner path, dependency list, contract test and source commit reference.
- Secrets, private keys, personal data and private-repository contents must not enter the public site.
- Network, browser, download and external mutation permissions default to off; approvals are scoped and one-time.
- A green static workflow is not proof that the deployed backend is reachable or that an end-to-end task works.
- Do not call the system AGI, quantum-advantaged or scientifically validated without independent reproducible evidence.

## Acceptance gates

- [ ] Every known repository inventoried (tree, license, dependencies, default branch, last commit, unique modules).
- [ ] Canonical API contract and schema versions checked into both canonical repositories.
- [ ] Site can detect backend health/runtime and clearly show disconnected/degraded state.
- [ ] A test task can be created and its journal/state read through the site adapter.
- [ ] Evidence lifecycle rejects missing/malformed source metadata and marks source content as unverified until retrieved.
- [ ] Receipt re-verification detects payload modification.
- [ ] Integration tests run against a local test backend in CI; live deployment smoke is tracked separately.
- [ ] Reproducible report records commit SHAs, environment and expected/actual results.
