# AKSI Core v3.1 — Scientific Protocol

## Status
Experimental research software. The implementation is **not** evidence of AGI, a quantum computer, or quantum advantage.

## Research question
Can a model-independent decision layer improve calibration, auditability and reproducibility of multi-candidate AI decisions by combining evidence-aware scoring, explicit uncertainty, deterministic replay, abstention and a quantum-like probability layer?

## Implemented pipeline
`TASK → EVIDENCE → CANDIDATES → SCORE → CLASSICAL P → QUANTUM-LIKE CALIBRATION → ABSTENTION GATE → COLLAPSE → RESULT → RECEIPT → OPTIONAL Ed25519 SIGNATURE`

## Candidate labels
- `FACT`: directly asserted as a factual claim with an evidence path.
- `SOURCE`: externally sourced material.
- `INFERENCE`: derived by the system from inputs.
- `HYPOTHESIS`: testable but not established.
- `UNCERTAIN`: insufficient or conflicting evidence.

## Reproducibility
Deterministic mode derives a stable seed from the task. Exploratory mode accepts an explicit seed. Every receipt records the seed, parameters, candidates, calibration, abstention decision and result. The browser UI stores decision summaries locally only when memory is enabled.

## Receipt integrity and signatures
The receipt hashes a canonical manifest with SHA-256. Core v3.1 also exposes an Ed25519 signing and verification adapter through WebCrypto. A signature proves integrity/attribution of the signed record; it does **not** prove truth, correctness, authorship of the underlying research, or external source validity. Git commit signing is a separate mechanism.

## Quantum-like layer
AKSI uses complex amplitudes, phase, interference and Born-style normalization as a **mathematical decision model**. This is consistent with the quantum-cognition literature, where quantum probability is used to model contextuality, ambiguity, order effects and interference in decision processes. It must not be presented as physical quantum computation. AKSI makes no quantum-advantage claim without controlled benchmark evidence.

## Abstention
The default gate can abstain when the best candidate has low probability, the top candidates are too close, or the distribution indicates high ambiguity. Abstention is a safety mechanism, not proof that the remaining answer is false.

## Evaluation plan
For any scientific claim, compare at minimum:
1. classical weighted voting;
2. Bayesian/logistic calibration where applicable;
3. AKSI without interference (`lambda=0`);
4. AKSI with quantum-like calibration;
5. ablations removing evidence, provenance, memory and abstention.

Report Brier score, log loss, calibration error, accuracy where labels exist, abstention coverage/selective risk, latency, reproducibility rate and receipt verification success. Publish seeds and benchmark inputs for every reported result.

## Research hypotheses
H1: explicit evidence/provenance features improve calibration versus raw majority selection.

H2: the quantum-like layer helps only on datasets exhibiting contextual/order/interference structure; it should not be assumed to help universally.

H3: deterministic receipts materially improve reproducibility and post-hoc auditability.

H4: abstention under conflict reduces unsupported high-confidence outputs.

## Falsifiability
A release must record negative results as well as positive results. If an ablation shows no improvement, the corresponding mechanism should not be marketed as a performance advantage. The preferred scientific result is a reproducible boundary describing **where** each mechanism helps and where it does not.

## Literature grounding
Quantum-like cognition is an established research direction rather than a new physical law. Reviews and tutorials describe applications to contextuality, interference, order effects and decision making. Recent work also explores dynamical open-system formulations. AKSI's contribution, if any, must therefore be demonstrated empirically as an engineering/decision-calibration system, not claimed from the use of quantum notation alone.

## Safety boundary
The system should refuse or escalate decisions when evidence quality is low, sources conflict materially, tool permissions exceed policy, or the task is high impact without an appropriate verification path.
