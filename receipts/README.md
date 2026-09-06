# AKSI Verifiable Decision Receipts

AKSI stores a signed DecisionPacket as portable evidence of a decision event.

## Product boundary

A receipt proves:
- which packet bytes were signed;
- which AKSI identity signed them;
- the timestamp recorded by the runtime;
- the parent packet reference;
- the policy/gate/evaluation fields included in the packet.

A receipt does **not** prove that a decision was objectively correct, safe, or truthful.

## Commercial direction

The strategic product is not a chatbot. It is an interoperability and assurance layer for AI decisions:

`model/agent → candidate decisions → evaluation → policy → gate → signed receipt → verifier`

The intended API surface is model-agnostic so the same receipt format can sit around cloud LLMs, local models, agents, or deterministic software.

## Roadmap

1. Evidence adapters (web/API/document/device observations).
2. Policy packs and allowlists.
3. External verifier that needs no private key.
4. Enterprise SDK/API gateway.
5. Outcome feedback: decision → real-world result → signed outcome receipt.
6. Cross-organization trust and delegation.

This roadmap is a product strategy, not a claim of global technical novelty.
