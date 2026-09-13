# AKSI Decision Receipt Protocol · v0.2

**Not a chatbot. Not a model. A signed decision record.**

> Decision without receipt didn’t happen.

```
query + candidates
  → score (EQS / policy)
  → FLY-GATE (optional bio-inspired veto)
  → ALLOWED | DEFERRED
  → Decision Receipt (Ed25519 + prev-hash)
  → offline verify
```

## Jackpot layer

| Primitive | Meaning |
|-----------|---------|
| **Gate** | ALLOWED or DEFERRED — right to refuse |
| **Seal** | Ed25519 over canonical JSON |
| **Chain** | prev_receipt_hash — tamper-evident |
| **Verify** | Offline: public key + file, no network |

Does **not** claim world-truth. Claims: this decision was made under this policy, linked to the previous seal.

## Fly-Gate (honest)

Open science: adult Drosophila connectome ~140k neurons (FlyWire / MaleCNS). Full simulation is research (neuPrint, Codex, flybrain) — **not** claimed in browser.

AKSI borrows **one motif**: bitter veto — strong negative evidence suppresses a go-command. Maps to DEFERRED + gate_trace.

Module: aksi-fly-gate.js

## Live

- Demo: https://milana808.github.io/ask.html
- Verify: https://milana808.github.io/verify.html
- Contact: aksilove@internet.ru

*AKSI Decision Receipt Protocol v0.2 — 2026-09-13*
