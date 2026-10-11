# AKSI repository consolidation map

**Date reviewed:** 2026-10-11  
**Canonical product repository:** `MILANA808/milana808.github.io`  
**Status:** inventory and integration boundary; not every listed module has been independently tested at runtime.

## Executive decision

Do not concatenate all repositories into one directory. That would duplicate entry points, configs, dependencies, keys and incompatible prototypes. Consolidate by **one product surface + one canonical cognitive contract + one execution backend**, with adapters for existing modules and explicit retirement rules for old demos.

- **Control plane / public product:** `MILANA808/milana808.github.io`
- **Execution plane / server-side tools:** `MILANA808/Milana-backend`
- **Research and legacy sources:** retained in their repositories until their behavior, licensing, security and tests have been reviewed.
- **New integration surface in this branch:** `/unified/`, using Core v3 + existing Superpose, Quantum, Neuro/Zero, Knowledge, WebLLM and HRR browser modules where available.

## Repository inventory

| Repository | Observed purpose / useful assets | Consolidation decision |
|---|---|---|
| `milana808.github.io` | Main website; `runtime/`, `math/`, `superpose/`, `quantum/`, `hdc/`, `kernel/`, `agent/`, `proof/`; JS engines including `aksi-superpose.js`, `aksi-quantum.js`, `aksi-hrr.js`, `aksi-neuro.js`, `aksi-webllm.js`, `aksi-decision.js` | Canonical UI, contracts, benchmarks, browser-safe fallback and documentation |
| `Milana-backend` | FastAPI bootstrap; task/agent/browser/search/discovery routers; `QuantumTool`; NumPy/SciPy; optional Quimb/Qiskit; Playwright | Canonical server execution plane. Add/standardize API contracts here rather than copying server code into static Pages |
| `AKSI-` | User-directed agent architecture; explicit permissions, sources, uncertainty and action logs | Use as design input; merge only tested modules into the canonical runtime |
| `aksi_apps` | Separate frontend/backend skeleton, Docker Compose, JWT configuration | Reference for deployment packaging; reconcile auth and CORS before production reuse |
| `AKSI-TEST-1` | FastAPI chatbot, SQLite chat/notes, web lookup, identity endpoint | Legacy prototype, not production-ready as-is; see security notes |
| `AKSI-TEST` | Old ChatGPT plugin quickstart | Archive/reference only; plugin model is obsolete for current product needs |
| `AKSI-GROK-HYBRID` | Visual Matrix demo; current inspected `index.html` returns canned random text, uses `innerHTML` for user/model text, and voice button is a placeholder | Preserve as visual concept, do not treat as working AI runtime; rewrite safely before reuse |
| `AKSI-GROK-HYBRID-v1` | Another hybrid demo branch/repository; root `index.html` was not found on default branch during this check | Inspect tree and history before extracting anything |
| `Agi` | README describes a recursive cognitive core/substrate | Research input only until provenance, license, APIs and tests are audited |
| `Aksi-love` (private) | Virtual companion / supportive conversation app | Keep private by default. Do not copy private source into the public site without an explicit decision |
| `milana_site` | Described as a web portal for AKSI applications | Root README was not found at the expected path; inspect repository tree/history before extraction |
| `Test-site` | Minimal test site | Archive unless a unique tested feature is found |
| `Bulat` | Repository listed, but root README could not be fetched in this pass | Unknown; no code should be assumed reusable until inspected |
| `glorious-potato` | Codespace/GitHub Models starter; README says the history is nearly blank | Not an AKSI core dependency |
| `MILANA808` | GitHub profile/config repository | Profile only |
| `codex` | Codex CLI upstream-style repository | Developer tool, not AKSI runtime code |
| `openai-cookbook` | API examples and guides | Reference material only; respect upstream license |
| `plugins-quickstart` | Plugin starter | Reference material only |
| `gpt-oss-safeguard` | Safety-related repository | Inspect separately before any integration; not imported automatically |
| `SuperAGI` | Agent framework repository | Upstream/reference; do not vendor wholesale |
| `MCP-GitLab-insights-` | MCP server for DevOps metrics | Separate optional tool integration, not part of the cognitive kernel |
| `Aksilove/MILANA808-Milana-backend` | Fork of backend | Do not treat fork as a second source of truth |

## Canonical architecture

```text
Human intent + constraints
        |
        v
Task envelope / permissions / success criteria
        |
        v
Candidate providers
  - local Knowledge / Neuro / Zero
  - Superpose candidate generator
  - optional browser WebLLM
  - optional server model and web research
        |
        v
AKSI Core v3 decision layer
  - candidate labels and provenance
  - classical baseline + quantum-like calibration
  - uncertainty / abstention gate
  - deterministic replay seed
        |
        v
Optional quantum-circuit simulation (separate capability)
        |
        v
Verifier + tests + evidence
        |
        v
Outcome receipt (SHA-256; signature only with managed keys)
        |
        v
Human-readable answer + machine-readable task state
        |
        v
Explicitly approved backend actions, if needed
```

### Non-negotiable distinctions

1. A quantum-like probability layer is a mathematical decision model, not a physical quantum computer.
2. A classical circuit simulator is not quantum hardware and does not establish quantum advantage.
3. A candidate-selection probability is not the probability that a claim is true.
4. SHA-256 establishes a digest match, not authorship, truth, trusted time or action completion.
5. A loaded module or link is not proof that the end-to-end path works.
6. Tool output, a completed action and an independently verified outcome are separate states.

## Current integration surface

The new `/unified/` page is an adapter, not a wholesale rewrite. It:
- checks whether the browser modules loaded;
- asks existing Superpose for candidate answers, with local Knowledge/Neuro/Zero fallback;
- optionally computes per-candidate quantum simulator diagnostics;
- passes candidate data into `AKSICoreV3.run()`;
- displays the internal candidate distribution and abstention decision;
- exports the Core receipt JSON;
- writes only to local browser storage when the user explicitly presses Save.

It does not claim that the backend is connected, that the browser model is loaded, or that a candidate is factually correct merely because it won selection.

## Security and correctness issues found in this pass

- **Legacy XSS risk:** inspected `AKSI-GROK-HYBRID/index.html` interpolates text into `innerHTML`. Do not reuse that rendering pattern for user or model text; use `textContent` or safe DOM construction.
- **Personal data in defaults:** `AKSI-TEST-1/aksi_site/backend/app.py` contains a full-name/date/place-of-birth identity string as a default. Remove personal identity from general defaults and keep it in private configuration only if truly required.
- **Permissive CORS in prototype:** the same prototype uses wildcard origins together with credentials. Do not copy that configuration into production; use explicit trusted origins and a tested auth model.
- **Cryptographic semantics:** FNV hashes used in older browser modules are not cryptographic integrity proofs. Label them as non-cryptographic checksums/metrics or replace them with Web Crypto SHA-256 where a security claim is made.
- **Quantum scale claims:** the backend QuantumTool documentation says MPS can handle up to 1000 qubits. Treat this as a configurable/theoretical limit, not a blanket capability guarantee. Runtime depends on circuit structure, entanglement/bond dimension, backend and memory; benchmark before advertising a scale.
- **Secrets:** do not persist provider API keys in browser localStorage or public source. Server-side model access must use secret storage. Do not export private signing keys to the browser's persistent storage without a reviewed key lifecycle.
- **Old receipts:** unsigned browser JSON receipts are editable. They are useful for reproducibility/integrity checks only when compared with a trusted digest; do not market them as signed proof.

## Merge policy

1. Preserve original repositories and commit history.
2. Port behavior through adapters, not blind file copying.
3. Add a test before promoting a module to the canonical runtime.
4. Keep public demo, backend execution, private companion and research code separated by explicit interfaces.
5. Require benchmark evidence before claims of accuracy gains, quantum advantage, AGI or consciousness.
6. Record failed experiments and unavailable providers; never silently substitute canned text for a real model.

## Next engineering stages

1. Merge the Core v3 scientific foundation only after its CI and manual browser tests pass.
2. Add unit tests for deterministic seed/replay, normalization, abstention, receipt hash verification and empty candidate handling.
3. Add an API contract test between the browser control plane and backend execution plane.
4. Add a benchmark set with labeled answers and compare: lexical/classical baseline, weighted candidates, Core without interference, Core with quantum-like calibration, and ablations.
5. Audit every root navigation link and each advertised capability against an automated smoke test.
6. Decide which legacy repositories become archived references and which unique features are ported.

## What is not yet proven

- That AKSI outperforms classical baselines.
- That the backend's optional quantum libraries are installed and working in the current deployment.
- That all UI routes on GitHub Pages load and behave correctly on mobile.
- That every repository in the inventory has been exhaustively scanned. This is a first evidence-based consolidation pass; the remaining unknown trees are explicitly marked above.
