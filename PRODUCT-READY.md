# AKSI — Product Readiness

This repository is treated as a production candidate only when the checks below pass.

## Product contract

- **Local-first:** the browser core must continue to work without a backend for its local features.
- **Memory:** user-controlled browser memory must survive refresh and support export/import.
- **Integrity:** proof records establish data integrity, not factual truth.
- **Provenance:** every externally derived result should identify its source/method/status when the UI exposes evidence.
- **Identity:** the Ed25519 module provides signing/verification primitives; private keys must stay outside source control.
- **LLM:** remote or local LLMs are optional providers, not the identity of AKSI itself.
- **Honesty:** experimental Quantum/Neuro/Self features must not be presented as AGI, consciousness, or quantum advantage without independent evidence.

## Release gates

1. GitHub Pages loads the primary interface.
2. Chat, teaching and memory smoke tests pass on mobile and desktop.
3. JavaScript syntax verification passes for repository scripts.
4. Backend Python compilation passes.
5. Trust-core tests pass, including tamper detection and Ed25519 verification.
6. No credentials are committed to the repository.
7. Public documentation keeps the integrity-vs-truth boundary explicit.

## Current release candidate

Branch: `aksi-product-ready-2026-08`

This branch integrates the Trust Core from the earlier experimental branch into the current `main` baseline and adds CI verification. It intentionally does **not** silently merge the older visual PRs because those branches are currently reported by GitHub as non-mergeable and require conflict resolution first.
