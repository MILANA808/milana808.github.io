# AKSI Agent Identity & Continuity Protocol

**Status:** Experimental protocol specification
**Version:** 0.1
**Purpose:** make the identity, lineage and integrity of an AKSI agent independently verifiable without making claims about consciousness or factual correctness.

## 1. The simple idea

AKSI is not protected by hiding its source code. Source code can be copied.

The protocol separates three things:

1. **Code** — reproducible and forkable.
2. **Cryptographic identity** — controlled by a private root key that must never live in the repository.
3. **Continuity history** — a sequence of signed manifests, decisions and outcome receipts linked to the identity.

A fork may run the same code, but it must use a different cryptographic identity unless it possesses the original private root key.

## 2. Trust model

```text
AKSI Root Identity
       |
       +-- signed agent manifest
       |
       +-- signed version/implementation claims
       |
       +-- signed DecisionPacket
       |
       +-- signed Action/Outcome receipt
       |
       +-- key rotation / revocation records
       |
       `-- independent verifier
```

The repository is **not** the root of trust. The protected private key is.

## 3. Identity

The root identity is derived from a public Ed25519 verification key:

`did:aksi:ed25519:<fingerprint>`

The fingerprint is a deterministic hash of the public key. The private key is never committed to GitHub, embedded in browser code, or transmitted to the verifier.

## 4. Continuity record

Every continuity event SHOULD contain:

- `protocol_version`
- `agent_id`
- `event_id`
- `event_type`
- `created_at`
- `previous_event_hash` (null only for genesis)
- `payload_hash`
- `software_version`
- `public_key_id`
- `signature`

Canonical serialization MUST be deterministic before hashing/signing.

The event chain proves that the signed records have not been altered and that the signer controlled the corresponding private key when each record was created.

## 5. Decision and outcome binding

A production implementation SHOULD bind:

`observation -> evidence -> evaluation -> policy -> gate -> decision -> authorization -> action -> outcome`

The `decision_id` and `action_id` MUST be referenced by the outcome receipt so an independent verifier can follow the chain.

## 6. What this proves

If the trust root is securely established, a verifier can establish:

- which public key signed a record;
- whether the signed bytes were changed;
- whether records form the expected continuity chain;
- whether a presented agent identity matches the configured trust root;
- whether a decision/outcome record references the expected predecessor records.

## 7. What this does NOT prove

Cryptographic proof does **not** prove:

- that an AI is conscious or sentient;
- that an observation is true;
- that a model's reasoning is correct;
- that an outcome really occurred merely because an agent claims it occurred;
- that the legal owner of a key is the same person as a GitHub account.

External evidence, authorization systems and legal identity binding are separate layers.

## 8. Fork rule

A fork can reproduce the software and protocol. It cannot legitimately present itself as the original AKSI identity unless it can produce a valid signature under the original trusted root or a valid, authorized key-rotation chain from that root.

Therefore the intended competitive property is **non-impersonability and historical continuity**, not non-reproducibility of source code.

## 9. Key lifecycle — required before production

The implementation MUST eventually support:

- offline/private root storage;
- delegated signing keys;
- explicit key rotation;
- revocation;
- recovery procedure;
- public trust-root publication;
- reproducible interoperability test vectors;
- independent verification outside the originating runtime.

Until these are implemented, AKSI should describe the system as an experimental cryptographic identity/provenance layer, not an unbreakable identity system.

## 10. Competitive moat

The protocol becomes harder to catch up with as the following accumulate:

`trusted identity + signed history + verified outcomes + interoperability + users/integrations + standards/IP`

Cryptography alone is not a moat. The moat is the **trusted history and ecosystem built on top of it**.

## 11. Reference architecture

```text
                  TRUST ROOT
                      |
               +------+------+
               |             |
          Agent ID       Key lifecycle
               |
        +------+------+
        |             |
     Memory        Evidence
        |             |
        +-------> DecisionPacket
                      |
                   Policy
                      |
                     Gate
                      |
               Signed Decision
                      |
                 Authorization
                      |
                    Action
                      |
                Signed Outcome
                      |
             Independent Verify
```

## 12. Design principle

**Copyable software. Non-copyable cryptographic identity. Verifiable continuity.**

That is the property AKSI should build toward.
