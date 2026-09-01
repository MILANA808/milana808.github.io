# ADIA 3.0 — Unified Resonance Decision Engine

**Product algorithm of AKSI Release 1.0+**

## One line
Rank local answers by quality, resonance, and structure — then optionally seal an integrity ledger entry.

## Pipeline
```
query + candidates
  → score each (EQS, QCLI, coherence, trust, memory overlap)
  → AKSI = (A × I × S) × (1 + 0.4√n)
  → rank by EQS → AKSI → QCLI
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

## Quantum block
Deterministic client-side simulation from a text seed. **Not** a physical quantum computer. Used for transparent scoring UX in Lab.

## API
```js
AKSI_ALGORITHM.process(query, candidates, { policy: 'companion', seal: true })
AKSI_ALGORITHM.evaluate(query, answer, opts)  // back-compat
AKSI_ALGORITHM.status()
```

## Honesty
Metrics are **engineering signals** for product decisions — not scientific proof of truth or consciousness.
