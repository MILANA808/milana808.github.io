# AKSI Trust Fabric v0.1

Identity and authorization primitives for the AKSI Decision Integrity pipeline.

## Flow

`identity → delegation → authorization → decision → action → outcome → revocation`

## Current scope

- Ed25519 identities where browser support exists.
- Stable public identity record and key identifier.
- Explicit capability delegation with scope and optional expiry.
- Authorization check before a capability is considered executable.
- Local revocation registry.
- Local-first storage.

## Security boundary

This is a prototype trust layer, not a production authorization service. Private keys are intentionally not serialized into localStorage by this module. The identity object returned by `createIdentity()` contains the in-memory CryptoKey only for the current runtime. Production requires durable non-exportable key storage, authenticated delegation signatures, anti-replay protection, revocation distribution, policy enforcement outside the model process, and independent authorization gateways.

## Design principle

The model may propose. Policy may evaluate. Identity authorizes. The action gateway executes. The outcome is recorded and signed.

No autonomous external execution is implemented here.
