# AKSI Reality Engine

## Thesis

AKSI Reality Engine is a model-neutral experimental substrate for comparing intelligences by **causal interaction**, not by chat quality.

A world has state. An agent observes it, chooses an action, changes the world, receives an outcome, updates its internal state, and emits evidence. The same world can host a worm model, fly model, SNN, classical policy, LLM controller, or hybrid agent.

## The important primitive: a causal episode

`WORLD_STATE(t) + OBSERVATION(t) -> ACTION(t) -> WORLD_STATE(t+1) -> OUTCOME -> UPDATE`

Every transition has a deterministic `state_hash` and an AKSI-VAI evidence envelope. Forks share a parent state but can diverge under different policies, experiences, or agent implementations.

## Reality Forks

A fork is not a metaphor. It is a reproducible experiment branch:

- parent state hash
- world seed
- agent identity/version
- policy/environment change
- sequence of observations/actions
- resulting state hashes
- outcome metrics

Two agents can therefore be compared from the **same initial reality**.

## What makes this useful

The engine does not claim consciousness or biological equivalence. It makes stronger, testable questions possible:

- Which architecture learns faster?
- Which one generalizes after the rules change?
- Which behavior is robust to perturbation?
- Which internal change actually explains an improved outcome?
- Can an experiment be independently reproduced from its evidence record?

## Research boundary

Connectome data and biological models remain external scientific inputs. AKSI does not claim to own or reproduce those datasets. The engine is the experimental/provenance layer around them.
