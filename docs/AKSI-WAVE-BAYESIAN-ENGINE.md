# AKSI Wave-Bayesian Engine (CPU)

This module is a small, deterministic, CPU-only intent-routing experiment. It uses hashed word features encoded as cosine/sine pairs, cosine similarity against example-derived intent prototypes, and a softmax-like Bayesian-inspired normalization with optional positive priors.

## What it does

- Runs in ordinary JavaScript without GPU, external APIs, or model downloads.
- Maps input to one of a configured set of known intents.
- Returns scores for inspection and abstains when the best match is too weak or ambiguous.
- Is deterministic for a given input and configuration.

## What it does not do

- It does not reconstruct arbitrary meaning from a few samples under the sampling theorem.
- It is not a language model and cannot generate open-ended answers.
- Its normalized scores are not calibrated probabilities that a claim is true.
- The sinusoidal feature map is a classical numerical representation, not a quantum simulation or quantum advantage.
- It has no power-saving guarantee; energy depends on implementation, input length, hardware, and workload.

## Run tests

```sh
node scripts/test_aksi_wave_bayesian_engine.cjs
```

## Next research step

Evaluate against a labeled intent dataset with train/test separation, compare to a simple bag-of-words baseline, report accuracy, macro-F1, abstention coverage, latency, and memory. Only integrate it into the user-facing product if the benchmark shows value over the existing routing logic.
