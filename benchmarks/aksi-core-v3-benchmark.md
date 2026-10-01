# AKSI Core v3 Benchmark

This benchmark is intentionally empirical: it does not assume the quantum-like layer improves decisions.

## Required baselines
1. Raw majority / uncalibrated score.
2. Classical weighted scoring.
3. AKSI without interference (`lambda=0`).
4. AKSI with interference.
5. AKSI with ablations for evidence, provenance and abstention.

## Metrics
- Brier score
- log loss
- expected calibration error
- accuracy when ground-truth labels exist
- abstention coverage and selective risk
- latency
- deterministic replay rate
- receipt hash verification rate

## Reproducibility
Every benchmark record must publish:
- dataset identifier/version;
- candidate inputs;
- ground-truth labels;
- AKSI Core version;
- parameters;
- seed;
- receipt hash.

## Scientific decision rule
A quantum-like layer is considered useful only if it improves a pre-registered metric against the appropriate baseline on held-out data. If it does not, it should be disabled for that task class. No physical quantum-computing claim follows from this benchmark.
