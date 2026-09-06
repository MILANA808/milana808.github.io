# AKSI Verifiable Decision & Outcome Receipts

AKSI treats a decision and its observed result as portable evidence objects.

## Chain

`observation → evidence → candidates → evaluation → policy → gate → decision → authorization → action → outcome`

A `DecisionPacket` records the decision context. An `OutcomeReceipt` links the observed result to `decision_id` and `action_id`.

## Guarantees

A receipt proves which canonical bytes were signed, which signing identity/public key was used, and the integrity of the included fields. Tampering causes verification failure. Signatures do **not** prove that a decision or observation is objectively true or correct.

The current Outcome Engine records outcomes and deliberately does not autonomously execute external actions.

## Commercial direction

`model/agent → evaluation → policy → gate → signed decision → authorized action → signed outcome → independent verifier`

The interface is model-agnostic and designed for cloud LLMs, local models, agents and deterministic software.

## Roadmap

1. Evidence adapters with provenance and timestamps.
2. Policy packs and allowlists.
3. Independent verifier.
4. Enterprise SDK/API gateway.
5. Durable key lifecycle: persistence, rotation, revocation.
6. Cross-organization trust and delegation.
7. Production action gateway with explicit authorization.

This is a product strategy, not a claim of global technical novelty.
