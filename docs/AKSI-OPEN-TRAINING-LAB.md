# AKSI Open Training Lab

Public entry: `/training-lab/`. Browser-only CPU experiment; no external model endpoint, downloaded weights, or hidden training corpus.

## Current model

`aksi-open-training-lab.js` implements a character-level n-gram/count model. Training counts next-character frequencies conditioned on up to five preceding characters with additive smoothing. Generation samples from the learned distribution. This is a real trainable statistical language model, but it is not a neural network and should not be described as an LLM.

## Reproducibility and visibility

- The full corpus is editable and visible before training.
- A fixed seed produces a deterministic line-level train/test split.
- Only train rows update counts; test rows are used only for evaluation.
- The page exposes training/test line counts, cross-entropy, perplexity, vocabulary, context count, parameter count, hashes, seed, model order, and timestamps.
- Model JSON can be exported and imported. Browser persistence occurs only when the user explicitly saves.
- Tests cover fixed-seed split, training, held-out evaluation, generation, manifest hashes, and JSON roundtrip.

## Limits

- Default corpus is tiny and only demonstrates the pipeline.
- FNV-1a digests are non-cryptographic change detectors, not provenance proof.
- Perplexity measures next-character prediction, not semantic correctness or usefulness.
- LocalStorage is browser-specific and can be cleared by the user.
- A serious neural model requires a larger licensed corpus, tokenizer, trainable parameters, an optimizer, checkpointing, held-out benchmark suite, and resource planning. This lab is a visible baseline to compare against, not a claim that the final AKSI language model is finished.

## Run tests

```sh
node scripts/test_aksi_open_training_lab.cjs
```
