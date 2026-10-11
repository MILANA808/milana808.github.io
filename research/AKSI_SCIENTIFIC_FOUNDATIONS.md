# AKSI Scientific Foundations & Research Map

**Status:** research architecture, not a claim of a new scientific discovery.  
**Purpose:** connect established mathematics, physics-based modelling, simulation, machine learning and formal verification into one reproducible workflow.

## Core principle

AKSI should not attempt to "combine all science" into one untyped formula. It should host **many explicit models** behind one experiment protocol. Each model declares its domain, state variables, units, equations/algorithm, assumptions, parameters, initial conditions, data provenance, uncertainty, validity range and tests.

`intent → model selection → hypothesis → experiment → result → verification → evidence receipt → memory → next experiment`

## Layered architecture

1. **Model registry** — versioned models and metadata; no hidden assumptions.
2. **State and units** — typed variables, dimensional checks, initial conditions and boundary conditions.
3. **Solvers** — exact arithmetic where possible; numerical methods for ODE/PDE; graph algorithms; stochastic simulation; classical quantum-circuit simulators for bounded instances.
4. **Scientific ML** — optional surrogate models and physics-informed learning; never silently replaces a solver.
5. **Experiment runner** — deterministic seeds, parameter sweeps, ablations, baselines and reproducible configurations.
6. **Verification** — invariants, conservation laws, property tests, numerical convergence checks, residuals and comparison with reference solutions.
7. **Uncertainty** — sensitivity analysis, confidence/credible intervals where justified, scenario ranges and explicit model limitations.
8. **Evidence ledger** — input hash, model/version, parameters, seed, runtime, outputs, test results, source links and provenance.
9. **Agent planner** — proposes experiments; it cannot label a hypothesis proven merely because a model output looks plausible.
10. **Browser-first execution** — small deterministic experiments run locally; larger jobs may later use a backend or external compute, but the system never pretends those resources exist.

## Knowledge map: foundations to integrate

### Mathematics and formal reasoning
- Logic, set theory, type systems, proof assistants and formal specification.
- Linear algebra, numerical linear algebra, probability, statistics and information theory.
- Calculus, ordinary/partial differential equations, dynamical systems and control.
- Optimization, convex analysis, operations research and automatic differentiation.
- Graph theory, algorithms, complexity theory and distributed systems.
- Numerical analysis: stability, consistency, convergence, conditioning and error bounds.
- Dimensional analysis and conservation laws.

### Physical and computational models
- Classical mechanics and Hamiltonian/Lagrangian formulations.
- Thermodynamics and statistical mechanics.
- Electromagnetism, circuit models, fluid dynamics and heat transfer.
- Materials and chemical models where equations and parameter regimes are specified.
- Quantum mechanics and quantum circuits; classical emulation is limited by representation and system size.
- Agent-based and discrete-event models for systems that cannot be adequately described by a single continuum equation.

### AI for science
- Physics-informed machine learning (PIML/PINNs), differentiable simulation and neural operators.
- Data assimilation, parameter estimation, system identification and digital twins.
- Bayesian inference, active learning, experimental design and causal inference.
- Retrieval-augmented scientific assistants with source-level provenance.
- Symbolic regression and conjecture generation, followed by independent verification.

### Reliability and reproducibility
- Property-based tests, metamorphic tests, reference implementations and independent solvers.
- Reproducible seeds, pinned dependencies, benchmark datasets and regression suites.
- Model cards and explicit failure modes.
- Separation between observed facts, model outputs, assumptions and conjectures.

## Open problems are a research queue, not a marketing claim

AKSI may help study open problems by generating examples, checking special cases, searching literature, deriving candidate lemmas and calling proof assistants. It must not claim to solve a theorem unless a complete argument is independently checked to the required standard.

Examples of public research frontiers:
- Clay Mathematics Institute Millennium Problems: P vs NP, Riemann Hypothesis, Hodge Conjecture, Birch–Swinnerton-Dyer, Yang–Mills mass gap, Navier–Stokes existence/smoothness, and Poincaré (solved; included here as a historical control, not an open problem).
- Scientific ML: robustness outside training distributions, identifiability from sparse observations, uncertainty propagation, stiff/multiscale PDEs, and stable real-time updating of digital twins.
- Quantum simulation: methods can be useful on bounded systems, but classical resources do not emulate arbitrary large quantum systems for free.

Before work begins on a specific theorem, AKSI must record its current status from a primary source, exact statement/version, definitions, known partial results, dependencies, and proof-checking plan. Never infer that an old problem remains open from an outdated article.

## Initial implementation target: browser-based Virtual World

The first executable model is a **toy city energy balance**. It is deliberately small enough to run without a server:
- demand changes with population and time-of-day;
- available generation is reduced by a user-set disturbance and a deterministic synthetic weather pattern;
- storage charges on surplus and discharges on deficit, subject to a capacity limit;
- metrics include unmet energy, hours in deficit and ending storage;
- every experiment stores its parameters, seed, model version and output summary.

This is not an engineering forecast. It has no live telemetry, calibrated city data, grid constraints or validated weather. Its purpose is to exercise the AKSI experiment protocol.

## Acceptance criteria for the next engineering stages

- Same model version + same parameters + same seed produces identical results.
- Units and ranges are validated.
- Known edge cases have tests.
- Results include limitations and a reproducible configuration.
- Baseline comparisons and sensitivity analysis are available.
- A model cannot report "verified" unless a stated check actually ran and passed.
- No claim of GPU hardware, quantum advantage, trained LLM weights, scientific discovery or AGI without corresponding evidence.

## Starter bibliography and primary references

1. Clay Mathematics Institute — official list of Millennium Problems: https://www.claymath.org/millennium-problems/
2. Meng et al. (2025), *When physics meets machine learning: a survey of physics-informed machine learning*, open access: https://doi.org/10.1007/S44379-025-00016-0
3. Gil et al. (2024), *Survey on open-source digital twin frameworks — A case study approach*: https://doi.org/10.1002/spe.3305
4. Xu et al. (2025), *A Herculean task: classical simulation of quantum computers*: https://doi.org/10.1016/j.scib.2025.10.016
5. Yang et al. (2024), *Data-driven physics-informed neural networks: a digital twin perspective*: https://doi.org/10.1016/j.cma.2024.117075

## Research integrity

This map is a starting synthesis, not an exhaustive review of all scientific literature. Every future claim must point to a source or reproducible experiment. A conjecture is a conjecture; a simulation result is not a proof; a fitted model is not automatically a causal explanation.
