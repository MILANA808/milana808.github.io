# AKSI Decision Receipt Protocol · v0.1

**Not a chatbot. A signed decision record.**

Any answer or agent action can emit a receipt that a third party verifies offline — without trusting the producer, the host, or AKSI servers.

```
query + candidates
  → score (EQS / policy)
  → ALLOWED | DEFERRED
  → Decision Receipt (Ed25519 + prev-hash)
  → offline verify
```

## Why this exists

Models produce fluent text. Agents take actions.
Most systems leave no independent proof of *what was decided, under what gate, from which sources*.

AKSI Decision Receipt fixes that layer only:

- **Gate** — ALLOWED or DEFERRED (right to refuse)
- **Seal** — Ed25519 over canonical payload
- **Chain** — `prev_receipt_hash` detects insertion/deletion
- **Offline verify** — public key + receipt file, no network required

This does **not** claim truth of the world.
It claims: *this decision was made, under this policy, at this time, linked to the previous sealed decision*.

## Receipt schema (JSON)

See live demo: https://milana808.github.io/ask.html
Verify: https://milana808.github.io/verify.html

Fields: protocol, version, receipt_id, query, decision, final_answer, confidence, engine, eqs, mode, n, aksi_score, sources, policy, prev_receipt_hash, public_key, timestamp, signature.

Canonical bytes: stable sorted-key JSON without signature/receipt_id → Ed25519 sign → receipt_id = SHA-256(canonical).

## Contact

aksilove@internet.ru · https://milana808.github.io/ask.html

*AKSI Decision Receipt Protocol v0.1 — 2026-09-13*
