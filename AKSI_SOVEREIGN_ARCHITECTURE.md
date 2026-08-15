# АКСИ — Sovereign Cognitive Assistant

## The thesis

АКСИ is not defined by a claim that an AI is conscious, infallible, or magically private. It is defined by a stricter engineering contract:

> **Every important claim made by АКСИ should carry enough provenance for another party to distinguish what was observed, computed, remembered, generated, or not verified.**

## Core pillars

1. **Local-first** — private state and sensitive memory should remain on the user's device whenever technically possible.
2. **Cryptographic integrity** — canonical payloads are hashed; important events can be chained so later tampering is detectable.
3. **Verifiable provenance** — signatures and hashes are separated from truth claims. A valid signature proves origin/integrity, not factual correctness.
4. **Honesty states** — `verified`, `computed`, `observed`, `remembered`, `inferred`, and `unverified` are explicit states, not marketing language.
5. **Human control** — self-modification must be proposed, diffed, tested, and explicitly approved before activation.
6. **Multilingual semantics** — canonical internal records must not depend on the language used by the user.
7. **Fail-closed security** — missing secrets, invalid signatures, broken chains, and unavailable provenance are errors, not green status indicators.

## Trust model

### What cryptography can prove

- a payload has not changed since it was signed;
- a signer possessing a secret produced an HMAC signature;
- a sequence of events has not been altered when the chain verifies.

### What cryptography cannot prove by itself

- that an AI statement is true;
- that a memory is correct;
- that a user identity is real;
- that an external source is trustworthy.

АКСИ must never convert the second list into the first.

## Roadmap

### Phase 1 — Integrity foundation

- deterministic canonical serialization;
- SHA-256 content hashes;
- HMAC signatures;
- tamper-evident event chains;
- automated tests.

### Phase 2 — Sovereign identity

- Ed25519 signing key generated locally;
- public-key verification without sharing private material;
- key rotation and revocation records;
- signed software/release manifests.

### Phase 3 — Private cognition

- encrypted local memory;
- explicit memory permissions;
- local audit ledger;
- export/import with integrity verification;
- deletion that is observable and testable.

### Phase 4 — Truth & provenance engine

Each answer receives structured provenance:

```text
source: user | local_memory | computation | web | model
status: observed | computed | inferred | verified | unverified
confidence: 0..1
content_hash: sha256(...)
signature: signer-specific proof when available
```

### Phase 5 — Safe self-improvement

АКСИ may propose code or behavior changes, but activation follows:

`proposal -> diff -> tests -> security checks -> human approval -> signed release`

No hidden self-modification.

## The public promise

АКСИ should aim to be **auditable rather than mystical**.

If a feature cannot currently be proven, the product should say so plainly.
That is not a weakness of the system. It is the foundation of the trust model.
