# AKSI Quantum AI — experimental foundation

AKSI Quantum AI is a research prototype joining a transparent quantum-circuit simulator with the wider AKSI agent architecture. This first increment is deliberately small, reproducible, and testable.

## Run locally

Requires Python 3.10+; no third-party dependencies:

\`\`\`bash
cd aksi-quantum-ai
python quantum_core.py
python -m unittest -v
\`\`\`

## What's real in this prototype

- State-vector simulation for small circuits.
- Hadamard, Pauli-X, RY, and CNOT gates.
- Normalization checks and computational-basis measurement sampling.
- Bell-state entanglement demonstration.
- Two-qubit Grover search demonstration.
- Deterministic seeded measurements and automated tests.

## What's not claimed

This does not run on quantum hardware, does not establish quantum advantage, and is not yet a general-purpose AI model. A state-vector simulator runs on classical hardware and memory grows exponentially with qubit count. The name “Quantum AI” describes the research direction, not a proven world-first result.

## Next engineering stages

1. Add variational quantum circuits and optimization baselines.
2. Compare quantum-inspired methods against classical baselines on declared benchmark tasks.
3. Connect experiments to AKSI's persistent task ledger and evidence receipts.
4. Add an optional provider adapter for real quantum hardware only when credentials and hardware access are explicitly configured.
5. Publish reproducible benchmark data before making novelty or performance claims.
