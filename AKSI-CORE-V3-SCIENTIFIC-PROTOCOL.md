# AKSI Core v3 — Scientific Protocol

## Status
Experimental research software. The implementation is **not** evidence of AGI, a quantum computer, or quantum advantage.

## Research question
Can a model-independent decision layer improve the calibration, auditability and reproducibility of multi-candidate AI decisions by combining evidence-aware scoring, explicit uncertainty, deterministic replay and a quantum-like probability layer?

## Pipeline
`TASK → EVIDENCE → CANDIDATES → SCORE → CLASSICAL P → QUANTUM-LIKE CALIBRATION → COLLAPSE → RESULT → RECEIPT`

## Candidate labels
- `FACT`: directly asserted as a factual claim with an evidence path.
- `SOURCE`: externally sourced material.
- `INFERENCE`: derived by the system from inputs.
- `HYPOTHESIS`: testable but not established.
- `UNCERTAIN`: insufficient or conflicting evidence.

## Reproducibility
Deterministic mode derives a stable seed from the task. Exploratory mode accepts an explicit seed. Every receipt records the seed, parameters, candidates, calibration and result.

## Receipt integrity
The receipt hashes a canonical manifest with SHA-256. A future signing adapter may sign the receipt using Ed25519/WebAuthn-backed keys. A signature proves integrity/attribution of the record; it does not prove truth.

## Quantum-like layer
AKSI uses complex amplitudes, phase, interference and Born-style normalization as a **mathematical decision model**. This is consistent with the quantum-cognition literature, where quantum probability is used to model contextuality, ambiguity, order effects and interference in decision processes. It must not be presented as physical quantum computation. See the literature review below.

## Evaluation plan
For any scientific claim, compare at minimum:
1. classical weighted voting;
2. Bayesian/logistic calibration baseline where applicable;
3. AKSI quantum-like calibration;
4. ablations removing evidence, provenance, memory, and interference terms.

Report Brier score, log loss, calibration error, accuracy where labels exist, abstention quality, latency, reproducibility rate, and receipt verification success. Publish seeds and benchmark inputs for every reported result.

## Research hypotheses
H1: explicit evidence/provenance features improve calibration versus raw majority selection.

H2: the quantum-like layer helps only on datasets exhibiting contextual/order/interference structure; it should not be assumed to help universally.

H3: deterministic receipts materially improve reproducibility and post-hoc auditability.

H4: a policy that permits abstention under conflict reduces unsupported high-confidence outputs.

## Literature grounding
Quantum-like cognition is an established research direction rather than a new physical law. Reviews and tutorials describe applications to contextuality, interference, order effects and decision making. Recent work also explores dynamical open-system formulations. AKSI's contribution, if any, must therefore be demonstrated empirically as an engineering/decision-calibration system, not claimed from the use of quantum notation alone.

## Safety boundary
The system should refuse or escalate decisions when evidence quality is low, sources conflict materially, tool permissions exceed policy, or the task is high impact without an appropriate verification path.
