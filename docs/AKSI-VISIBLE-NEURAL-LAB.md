# AKSI Visible Neural Lab v0.1.0

A tiny, browser-local character language model implemented as a one-hidden-layer MLP. It trains on CPU without third-party libraries, downloaded weights, or remote AI APIs.

## Algorithm
- Context: last 2–6 characters, with a beginning-of-sequence padding token.
- Input: one-hot character IDs represented by indexed input weights.
- Hidden layer: tanh.
- Output: softmax over characters.
- Objective: next-character cross-entropy.
- Optimizer: stochastic gradient descent with explicit backpropagation.
- Seed controls initialization, shuffle order, train/test split, and sampling.
- Training examples come only from train lines; test lines are held out for evaluation.

## Reproduce
1. Open `/neural-lab/`.
2. Keep the same corpus, seed, split, epochs, hidden size and context length.
3. Train. The UI shows epoch loss, train/test metrics, and parameter counts.
4. Export the JSON model to inspect/store learned weights.
5. Import the JSON to check model roundtrip and generate text.

Run tests with Node.js: `node scripts/test_aksi_visible_neural_lab.cjs`

## Limits
This is a small educational character MLP, not a transformer or competitive LLM. It does not understand facts, retrieve sources, or verify truth. Cross-entropy/perplexity measure character prediction, not intelligence. A small demonstration corpus is inadequate for general-purpose conversation. Browser memory and CPU limit model size. Export files contain learned weights and can include metadata; do not train on secrets or personal data.

## AKSI archive + theorem corpus

The lab can load the curated JSON dataset at `datasets/aksi-archive-theorem-corpus-v1.json` using **«Загрузить архив AKSI + теоремы»**. The page shows each entry, its label, source links, caveats, and a SHA-256 digest before training. The dataset includes selected archive observations from 2025 and concise entries about Bayes' theorem, Shannon entropy, cross-entropy, SGD, universal approximation, no-free-lunch optimization, SHA-256, Ed25519, Merkle trees, data leakage, and reproducibility.

The word “selected” matters: this is not all mathematics or all AKSI history. Archive facts retain explicit caveats; for example, the 2025 Ed25519 public-key field was a placeholder. The corpus teaches textual patterns; the character MLP does not reason over the source metadata or verify theorem proofs. Check sources independently before relying on any entry.

Validate the dataset with `node scripts/test_aksi_archive_theorem_corpus.cjs`.
