# AKSI Trust Fabric test vectors v0.2

These vectors define required behavior for the browser prototype and future interoperable implementations.

## Identity

1. `createIdentity(label)` creates an Ed25519 identity and a `did:aksi:ed25519:<fingerprint>` identifier.
2. Private key material is not serialized into the local trust store.
3. Revoked identity => denied with `identity_inactive`.

## Signed delegation

A valid delegation contains `parent_did`, `child_did`, explicit `scope`, timestamps, a unique nonce and an Ed25519 signature over the exact canonical delegation body.

Reject:

4. modified scope
5. modified child identity
6. modified expiry
7. modified nonce
8. invalid signature
9. parent public-key mismatch
10. inactive/revoked parent
11. expired delegation
12. capability outside delegated scope

`decision:submit` MUST NOT authorize `payment:execute`.

## Action replay protection

An action request contains `decision_id`, unique `action_id`, `actor_did`, capability, issued/expiry timestamps, nonce and an actor-bound Ed25519 signature.

13. `signature.did` MUST equal `actor_did`.
14. Invalid actor signature => `invalid_signature`.
15. First accepted nonce may be consumed; a second verification => `replay_detected`.
16. Expired request => `action_expired`.

## Production boundary

This browser implementation is a security prototype, not a production authorization gateway. Production deployment additionally requires durable non-exportable key storage, authenticated delegation chains, distributed revocation, replay state outside the browser, clock/skew policy, policy enforcement outside the model process, and an independently operated action gateway.
