# AKSI Dialogue Intelligence v1

## Purpose
This module adds a bounded symbolic dialogue layer to the existing browser-local AKSI core. It normalizes common Russian question forms, routes grounded concept questions, composes explanations from the existing concept graph, and emits explicit proof records. It does not claim to be a general language model or autonomous human-level understanding.

## Mathematical methods
- Bayesian update: posterior calculation from an explicit prior, sensitivity and false-positive rate. Inputs must be probabilities in [0,1]; the caller must supply defensible likelihoods.
- Shannon entropy: uncertainty of a normalized discrete distribution.
- Modus ponens: derives a consequent only when the fact predicate matches the rule antecedent.
- Directed graph reachability: returns an explicit path; absence of a path means "not established", not false.
- Similarity/Jaccard: intent routing only. It is never a truth score.
- Causal restraint: a "why" question is not answered by topic association; without a causal model or evidence the engine abstains.

## Additional design rules
1. Separate topic recognition, intent recognition, inference, evidence and language generation.
2. Never turn a similarity score into a probability of truth.
3. Never treat a saved answer or user rating as proof.
4. Keep uncertainty and unknown states explicit.
5. Every supported inference returns a proof trace or a reason for abstention.
6. Run deterministic tests before merging.

## Current boundary
This is a stronger symbolic dialogue and reasoning component, not a replacement for a trained language model. Open-domain fluent conversation, world knowledge and current facts still require a language model and/or reliable sources.
