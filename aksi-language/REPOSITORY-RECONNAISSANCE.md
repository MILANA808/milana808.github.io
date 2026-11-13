# AKSI Q — repository reconnaissance report

**Date:** 2026-11-14  
**Scope:** GitHub account repository metadata and recursive default-branch trees; selected source and test files in the canonical site and backend.  
**Status:** reconnaissance, not a complete line-by-line audit of every repository.

## Executive findings

- 21 repositories are visible in the connected GitHub account inventory.
- The product architecture already identifies two canonical codebases:
  - MILANA808/milana808.github.io — public product/control plane.
  - MILANA808/Milana-backend — optional FastAPI execution plane.
- The public product tree contains 868 files; the backend tree contains 159 files at the time of this scan.
- The public product already contains a richer JavaScript quantum simulator, semantic concept graph, symbolic inference engine and grounded Russian answer composer. AKSI Q now has a separate native expression parser, reference runtime and generated semantic-data bridge.
- The new language is isolated in a draft PR. It has not been merged into main or connected to the live website.
- All nine workflows for the latest AKSI Q branch commit completed successfully.

## Repository inventory

| Repository | Initial classification | Tree-level note |
|---|---|---|
| milana808.github.io | Canonical public product | 868 files; principal UI, runtime, tests, research and workflows |
| Milana-backend | Canonical execution service | 159 files; FastAPI, agent/task runtime, memory, quantum and tests |
| AKSI-TEST-1 | Test/prototype candidate | Small code tree; inspect history and dependencies before migration |
| AKSI- | Prototype candidate | Small tree with agent entry point |
| aksi_apps | App candidate | Small repository; inspect each app and history |
| AKSI-GROK-HYBRID | Hybrid experiment | Small tree; provenance and purpose need confirmation |
| AKSI-GROK-HYBRID-v1 | Hybrid experiment | Small tree; provenance and purpose need confirmation |
| Bulat | Unclassified | Small repository; workflow-only relevant path surfaced |
| AKSI-TEST | Test/prototype | Small repository; no matching core source paths surfaced |
| milana_site | Site prototype candidate | Very small tree; no matching core source paths surfaced |
| Agi | Unclassified/research candidate | Very small tree; no matching core source paths surfaced |
| Test-site | Test site | Very small tree |
| MILANA808 | Profile repository | Minimal content |
| Aksi-love | Private repository | Kept private; no contents copied or disclosed |
| codex | External/reference codebase | 1,207 files; Rust/Codex codebase, not treated as original AKSI implementation |
| SuperAGI | Upstream/agent reference | 771 files; separate agent framework, not blindly copied |
| glorious-potato | Codespace-derived/reference candidate | 144 files; inspect origin and licensing before reuse |
| openai-cookbook | External/reference mirror | 1,911 files; not treated as proprietary AKSI source |
| gpt-oss-safeguard | Reference/security codebase | Separate project; license/provenance review required |
| plugins-quickstart | Reference/sample | Small repository |
| MCP-GitLab-insights- | Integration/reference sample | Small repository |

This classification is provisional. Repository names and file counts do not establish ownership, licensing, originality, functional quality or suitability for migration. No mass copy, deletion or repository merge was performed.

## Source findings in the canonical product

### Reusable components confirmed by source inspection

- aksi-quantum.js: JavaScript state-vector simulator, up to 10 qubits, single-qubit and controlled gates, Bell-state support, QFT/Grover examples and an optional IBM adapter.
- aksi-semantic-reasoning.js: canonical concept IDs, Russian definitions, aliases, typed parent paths and explicit relation answers.
- aksi-symbolic-inference.js: explicit facts/rules, variable binding, forward chaining, contradiction detection and proof traces.
- aksi-native-language-core.js: intent classification and answer composition bounded by the semantic graph.
- aksi-core-v3.js: decision scoring, abstention and evidence/receipt helpers. Its integrity receipts do not prove truth.
- AKSI-SYSTEM-MAP.md and docs/AKSI_REPOSITORY_UNIFICATION.md: canonical ownership and migration/security rules.

### Product boundary

The canonical system map separates the public site/control plane from the backend execution plane. The backend contract explicitly states that liveness, readiness, module diagnostics and task success are different claims. A green static workflow does not prove a live deployment is reachable.

### Backend findings

Selected backend files confirm an offline knowledge base, optional Ollama generation, a cognitive runtime, semantic sampling, task lifecycle tests and SSRF protections. The backend is not required to run the isolated AKSI Q interpreter. It should be integrated only through a versioned API contract and separate end-to-end tests.

## AKSI Q current state

The draft branch implements:
- native lexer and Pratt expression parser;
- no Python AST or eval/exec for AKSI expression evaluation;
- mathematical vectors and complex amplitudes;
- state-vector simulation up to 10 qubits with H/X/Z, phase, Rx/Ry/Rz and CNOT;
- Bell-state experiment and seeded measurement;
- explicit concept and is_a relation statements;
- generated semantic JSON export from the canonical JavaScript concept graph;
- bounded resource use, language specification, tests and examples.

## Next audit and engineering gates

1. Compare the Python state-vector implementation against aksi-quantum.js using identical circuit fixtures and numerical tolerances.
2. Export and version the semantic graph; preserve aliases and all relevant relation metadata in a stable schema.
3. Port the existing symbolic rule engine with proof-trace compatibility tests.
4. Inspect backend package dependencies, API schemas, test coverage and deployment configuration.
5. Review every candidate repository's license, commit ancestry, secret exposure and unique modules before copying code.
6. Add browser-runtime conformance tests before connecting AKSI Q to the public product.
7. Perform security review and fuzzing of parser and interpreter before accepting untrusted programs.

## Claims not made

This report does not claim that all 21 repositories have been audited line by line, that all legacy modules have been merged, that the live website runs AKSI Q, that the language is a new foundation model, or that the simulator has quantum advantage.
