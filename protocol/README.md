# AKSI Protocols

This directory defines the trust layer that sits above the AI model itself.

## Why it exists

An AI model can be replaced. A web UI can be copied. Source code can be forked.

AKSI therefore treats **identity and continuity** as first-class protocol objects:

- a protected cryptographic root identity;
- deterministic signed manifests;
- linked decision and outcome receipts;
- explicit key rotation/revocation;
- independent verification.

## Current state

The repository already contains portable signed DecisionPacket/outcome concepts. This protocol adds the missing product-level rule: **what makes one AKSI identity the same cryptographic lineage over time**.

This is intentionally a specification, not a claim that the production key lifecycle is already complete.

## Target

`AI model -> AKSI runtime -> evidence -> decision -> action -> outcome -> signed receipt -> independent verifier`

The model/provider is replaceable. The verification layer remains stable.
