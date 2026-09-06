# AKSI Trust Fabric test vectors v0.1

These vectors define required behavior for the prototype and future interoperable implementations.

1. Active identity + delegated `decision:submit` => authorization allowed.
2. Missing identity => denied with `identity_inactive`.
3. Revoked identity => denied with `identity_inactive`.
4. Expired delegation => capability not granted by that delegation.
5. Delegation for `decision:submit` must not authorize `payment:execute`.
6. Every production delegation MUST be authenticated by the parent key; this prototype records the relationship but does not yet sign the delegation.
7. Production action gateways MUST reject replayed action identifiers and MUST verify decision signature, policy gate, authorization and key status before execution.
8. Outcome records MUST reference the originating decision and action identifiers.
