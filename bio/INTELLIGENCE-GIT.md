# AKSI Intelligence Git

**Protocol:** `AKSI-IGIT/0.1`

Intelligence Git is the version-control layer for agents acting inside AKSI Reality. A branch is not only code: it is a reproducible causal trajectory.

## Core object

Each intelligence branch records:

- `agent_id` and `agent_version`
- `world_seed`
- `parent_state_hash`
- observations
- actions
- outcomes
- state hashes
- policy/environment changes
- experiment metrics
- VAI evidence reference

## Fork semantics

`FORK` creates a new trajectory from an exact parent state. The fork must preserve the parent hash and the conditions that produced it. Two branches can therefore be compared without pretending that their histories are identical.

## What this enables

- reproduce an agent's experience
- compare learning trajectories
- run controlled counterfactuals
- identify where two agents diverged
- attach evidence to decisions
- export a causal history for independent verification

## Scientific boundary

A cryptographic history proves integrity of the recorded history, not that the recorded outcome is objectively true. Agent behavior is measured experimentally. This protocol does not imply consciousness, biological equivalence, or AGI.
