# AKSI Native DNA-Topology Engine

The main AKSI chat uses a browser-local JavaScript generator instead of WebLLM. No model weights are downloaded and no language-model API is required for this chat path.

## Current implementation

- Built-in seed Q&A plus local user-feedback memory.
- Token overlap/Jaccard ranking to retrieve related knowledge.
- Retrieval-and-recombination response generation; transparent abstention when the local corpus has no useful match.
- A DNA-inspired symbolic encoding of tokens (A/C/G/T), reverse-complement display, and a deterministic knot-like feature signature.
- Query-conditioned "observer" selects which local records influence the answer.
- Local feedback changes ranking weights and can add positively rated responses to the local learned corpus.
- Existing deterministic calculator remains available.

## Scientific and engineering limits

This is a small retrieval/recombination generator, not a trained neural language model and not equivalent in fluency or knowledge to a modern LLM. It does not replace matrix multiplication with biology. The DNA sequence and crossing/writhe values are heuristic text fingerprints, not biological DNA, knot invariants in the formal mathematical sense, or a Jones polynomial. "Observer" means the user query conditions classical retrieval; it is not quantum wavefunction collapse. CPU cost is small but not literally zero. LocalStorage capacity and browser privacy modes may limit persistence.

Positive feedback adds a response to local memory; it does not verify factual truth. Do not use unverified learned answers as authoritative evidence.

## Validation

```sh
node scripts/test_aksi_dna_topology_engine.cjs
node scripts/test_aksi_unified_adaptive_core.cjs
```
