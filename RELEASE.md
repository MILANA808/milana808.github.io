# AKSI — Release Candidate

## Release identity

- Product: AKSI
- Release line: `2026.08-RC1`
- Branch: `aksi-product-ready-2026-08`
- Release type: product release candidate

## Included in this candidate

### Product surface

- rewritten main landing page with one clear product definition;
- rewritten project/about page;
- rewritten startup and product documentation;
- one canonical runtime-oriented architecture description;
- explicit separation between product functionality and experiments.

### Trust foundation

- canonical SHA-256 hashing;
- HMAC integrity primitives;
- Ed25519 identity primitives;
- hash-linked cognitive ledger;
- tamper detection tests;
- release contract tests;
- CI verification gates.

## Release claims

The candidate **does not** claim AGI, consciousness, sentience, quantum supremacy or scientific proof of superior intelligence.

Proof means integrity of recorded data, not truth of the recorded claim.

## Acceptance gates

- [ ] site workflow green;
- [ ] Trust Core workflow green;
- [ ] release contract tests green;
- [ ] backend compile green;
- [ ] manual mobile smoke test complete;
- [ ] memory export/import smoke test complete;
- [ ] proof tamper-detection smoke test complete;
- [ ] identity sign/verify smoke test complete;
- [ ] no secrets committed;
- [ ] final known-limitations review complete.

## Important

This document intentionally calls the current state a **release candidate**, not a final production release, until the acceptance gates above are observed as green. A passing documentation test alone is not sufficient evidence that every browser interaction works.
