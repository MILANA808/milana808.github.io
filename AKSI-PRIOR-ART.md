# AKSI Prior Art — Verifiable AI Line (2025→2026)

**Status:** historical record from public Git commits  
**Contact:** aksilove@internet.ru  
**License:** Proprietary — see [LICENSE](./LICENSE)

This document does **not** claim “first invention of cryptography for AI”.  
It records AKSI’s continuous architecture toward **verifiable AI activity and decisions**.

## Timeline (verified commits)

| Date | Repo | SHA | What |
|------|------|-----|------|
| 2025-10-26 | milana_site | `5c8ee5e…` / `d0bc22a…` | AKSI Proxy — GPT traffic through AKSI layer |
| 2025-10-31 | Milana-backend | `c9dfb905…` | Dashboard + Dialog prototype + Manifest |
| 2025-10-31 | Milana-backend | `5a2f2ff…` | AKSI Proof workflow → PROOF_SHA256.txt |
| 2025-11-01 | Milana-backend | `80400b5…` | FastAPI + EQS/Ψ scaffolding |
| 2025-11-01 | milana_site | `4014121…` | ψ-proof scaffold (manifest + signed workflow) |
| 2025-11-03 | AKSI- | `5d6f2b5…` | Legal & signing kit |
| 2026-01-18 | Milana-backend | `f00d30f…` | Signing infrastructure merge (Ed25519 metadata) |
| 2026-01-18 | Milana-backend | `eaf60f0…` | AI work sessions + crypto key tracking |
| 2026-08-12 | Milana-backend | `fb33225…` | Ed25519 crypto + identity scaffold |
| 2026-09-02 | Milana-backend | `42fb032…` / `2cb4288…` | **AksiSealMiddleware** — seal after AI, before client |

## Product surface (2026)

- **Decision Runtime** `/decision/` — answer · anti · score · gate · seal · verify
- Offline Zero · FIR · Genesis · optional WebLLM
- Proprietary LICENSE (visible source ≠ open source)

## Honest non-claims

| We do **not** claim | We **do** claim |
|---------------------|-----------------|
| Invented Ed25519 / SHA-256 | Continuous architecture since Oct 2025 |
| First AI signature in the world | Seal of **decision/response** as product path |
| Physical quantum computer | Engineering scores (EQS/AKSI) + integrity chain |
| AGI consciousness | Verifiable offline-capable decision packet |

## Relation to 2026 landscape

IETF drafts and products on **Agent Action Receipts** (tool/action logs) appeared widely in 2026.  
AKSI’s line emphasizes **decision/intelligence event** (score + gate + seal), complementary to action receipts.

## Links

- Product: https://milana808.github.io/decision/
- Hub: https://milana808.github.io/
- Backend seal: `app/middleware/aksi_seal.py` in Milana-backend

© AKSI Project
