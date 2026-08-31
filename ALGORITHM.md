# ADIA 2.0 — Resonance Decision Engine

**AKSI Decision Integrity Algorithm**  
**Classification:** Core IP · Sovereign Agent Layer  
**Runtime:** `aksi-algorithm.js` · wired into Mind on every answer  
**Live:** `milana808.github.io`

---

## Purpose

ADIA is an engineering decision layer for local-first AI. It measures candidate outputs, combines available evidence, applies policy gates, and records observable execution metadata.

It does **not** claim to prove truth, consciousness, AGI, or correctness from a single metric.

## Pipeline

1. **Measure** answer signals (Shannon H, QCLI, H_eff)
2. **Score** with multi-factor EQS (source trust · coherence · memory resonance · maturity)
3. **Fuse** multi-engine candidates when available
4. **Gate** weak answers by policy threshold
5. **Expose** uncertainty and provenance
6. **Record** an integrity event

## Integrity model

The legacy FNV1a64 hash is retained only for backwards-compatible diagnostics. It is **not** a cryptographic hash and must not be presented as one.

For new proof records the target is:

`canonical serialization → SHA-256 → Ed25519 signature → hash-linked ledger`

A valid signature establishes authenticity/integrity of the signed bytes under the corresponding public key; it does not establish that the content is factually true.

## Measurement layer

AKSI metrics are engineering telemetry:

- **EQS** — composite answer-quality signal
- **AKSI** — project-specific interaction index
- **Resonance** — project-specific information/retrieval signal
- **DIMAX** — project-specific decision-quality composite
- **QCLI** — information-diversity signal
- **H_eff** — effective entropy signal

Formulas and weights are versioned. Changing them creates a new metric version rather than silently changing historical measurements.

## Observable execution

The UI exposes execution stages such as input, retrieval, context construction, inference, tool execution, verification and completion. It does not expose or claim to expose hidden chain-of-thought.
