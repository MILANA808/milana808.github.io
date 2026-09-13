# AKSI FlyWire Lab

AKSI study layer for the adult *Drosophila melanogaster* connectome.

## Reference substrate

The first target is FlyWire FAFB v783: 139,255 neurons and 3,732,460 listed connections. FlyWire/Codex also exposes newer datasets, including BANC and MCNS. AKSI does **not** copy restricted or bulk connectome data into this repository; it stores dataset identifiers, provenance and experiment contracts.

## What AKSI adds

1. **Connectome identity** — dataset/release, neuron and connection counts, source URL.
2. **Circuit probes** — sensory, motor, memory and neuromodulatory regions can be represented as query targets.
3. **Causal experiments** — stimulus → neural model → action → outcome.
4. **Reality Forks** — same starting state, controlled perturbation, divergent trajectory.
5. **Intelligence Git** — version the agent's experimental history rather than pretending the connectome alone is a mind.
6. **VAI evidence** — every experiment can produce a verifiable evidence object.

## Scientific boundary

A connectome is a wiring diagram, not a complete dynamical brain model. A simulation is not a biological organism, and behavior in a model is not evidence of consciousness. AKSI therefore separates source data, model assumptions, measured outcomes and interpretation.

## First research question

**Which structural features of the fly connectome are sufficient to produce measurable adaptation under controlled sensory tasks, and which require explicit dynamics/plasticity assumptions?**
