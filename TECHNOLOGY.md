# AKSI Bond Protocol v1.0

**Evidence-Bound Sealed Memory** — client-side technology, no server required.

## What is new

Not a new neural network. A **binding layer**:

1. **Evidence** — each source card is SHA-256 hashed (title + url + text).
2. **Evidence root** — sorted hashes combined into one root.
3. **Seal** — facts go into AES-GCM Cortex (existing).
4. **Bond Receipt** — every answer gets a receipt:
   `query · answer_hash · evidence_root · gate · cortex_id · prev_bond · integrity`

You can **verify offline** that a receipt was not altered (`AKSI_BOND.verifyBond`).

## Why it matters

Chatbots give text.
AKSI Bond gives **text + cryptographic trail** of what evidence was in play and what gate decided.

## API

```js
AKSI_BOND.registerEvidence(sources)
AKSI_BOND.createBond({ query, answer, source, gate, evidence_root, ... })
AKSI_BOND.bondFromThink(query, out)
AKSI_BOND.verifyBond(bond)
AKSI_BOND.listBonds()
```

## Stack position

```
Research sources → Bond.registerEvidence
Cortex seal     → AES-GCM vault
Answer          → Bond.createBond (+ optional Ed25519 via AKSI_RECEIPT)
```

## Honesty

- SHA-256 integrity is real Web Crypto.
- Ed25519 optional (browser support varies).
- This does not prove the *truth* of Wikipedia — only the integrity of *what the agent bound*.

© AKSI · aksilove@internet.ru
