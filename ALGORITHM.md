# ADIA 4.0.1 — Unified Decision Engine

**Product algorithm of AKSI**

## One line
Rank local answers by quality, then claim-throttle and gate, then optional integrity seal.

## Pipeline
```
query + candidates
  → score each (EQS, QCLI, coherence, trust, memory overlap)
  → AKSI = (A × I × S) × (1 + 0.4√n)
  → rank by EQS → AKSI → QCLI
  → claim-throttle (G / BIND|THROTTLE|VETO)
  → gate ALLOW|DEFER|BLOCK
  → optional FNV integrity seal
```

## Formula
`AKSI = (A × I × S) × (1 + 0.4√n)`

| Symbol | Meaning |
|--------|---------|
| A | Agent presence (~0.9) |
| I | Information quality = EQS/100 |
| S | Structure of the answer |
| n | Depth of sealed history |

## EQS (0–100)
Weighted mix of: normalized entropy, reliability, coherence, source trust, memory resonance (token overlap with query).

## Policies
| Policy | EQS threshold |
|--------|----------------|
| companion | 55 |
| lab | 70 |
| strict | 80 |

## Gate
Companion allows local answers without external evidence. Strict is stricter on overclaim.

## Quantum block
Deterministic client-side simulation from a text seed. **Not** a physical quantum computer.

## API
```js
AKSI_ALGORITHM.process(query, candidates, { policy: 'companion', seal: true })
AKSI_ALGORITHM.evaluate(query, answer, opts)
AKSI_ALGORITHM.status()
```

## Honesty
Metrics are **engineering signals** for product decisions — not scientific proof of truth or consciousness.
