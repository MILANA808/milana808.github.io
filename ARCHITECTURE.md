# AKSI Repository Architecture

## Primary repository

MILANA808/milana808.github.io

This is the canonical product/control-plane repository.

It owns:
1. public product surface;
2. user-facing demos;
3. protocol definitions;
4. evidence and verification contracts;
5. benchmarks and acceptance tests;
6. documentation and product specification.

## Execution repository

MILANA808/Milana-backend

The backend is an execution-plane dependency. It may provide web research, browser/computer-use, agent task execution, discovery experiments, persistent server-side state, and server-side model/tool adapters.

The backend must not redefine the public product contract independently.

## Integration rule

Every important runtime capability should have a corresponding contract in the primary repository:

contract → test → implementation → evidence

A backend feature is not considered part of the product merely because it exists in backend source code.

## Acceptance rule

A capability becomes a product capability only when it has a documented contract, a reproducible test, explicit failure modes, a defined evidence/provenance boundary, and a public interface that can expose its actual status.

## Claim boundary

Cryptographic receipts prove integrity of recorded data and association with a key. They do not independently prove that a recorded claim is factually true.

Architecture names do not establish AGI, consciousness, autonomy, or scientific novelty. Those require external benchmarks and reproducible evidence.
