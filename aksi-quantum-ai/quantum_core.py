"""AKSI Quantum Core: dependency-free state-vector simulator.

This is a classical simulation of small quantum circuits, not quantum hardware.
Qubit index 0 is the least-significant bit of the computational-basis index.
"""
from __future__ import annotations

import cmath
import math
import random
from typing import Iterable, Sequence

Complex = complex
Matrix2 = Sequence[Sequence[complex]]
SQRT2_INV = 1 / math.sqrt(2)


def _validate_qubit(n: int, q: int) -> None:
    if n < 1:
        raise ValueError("n_qubits must be >= 1")
    if not 0 <= q < n:
        raise ValueError(f"qubit index {q} outside 0..{n - 1}")


def zero_state(n_qubits: int) -> list[complex]:
    if not 1 <= n_qubits <= 20:
        raise ValueError("n_qubits must be between 1 and 20 for this simulator")
    state = [0j] * (1 << n_qubits)
    state[0] = 1 + 0j
    return state


def apply_single_qubit(state: Sequence[complex], n_qubits: int, qubit: int,
                       matrix: Matrix2) -> list[complex]:
    _validate_qubit(n_qubits, qubit)
    if len(state) != 1 << n_qubits:
        raise ValueError("state vector length does not match n_qubits")
    if len(matrix) != 2 or any(len(row) != 2 for row in matrix):
        raise ValueError("gate must be a 2x2 matrix")
    out = list(state)
    mask = 1 << qubit
    for base in range(len(state)):
        if base & mask:
            continue
        partner = base | mask
        a, b = state[base], state[partner]
        out[base] = matrix[0][0] * a + matrix[0][1] * b
        out[partner] = matrix[1][0] * a + matrix[1][1] * b
    return out


def gate_x(state: Sequence[complex], n_qubits: int, qubit: int) -> list[complex]:
    return apply_single_qubit(state, n_qubits, qubit, ((0, 1), (1, 0)))


def gate_h(state: Sequence[complex], n_qubits: int, qubit: int) -> list[complex]:
    return apply_single_qubit(
        state, n_qubits, qubit,
        ((SQRT2_INV, SQRT2_INV), (SQRT2_INV, -SQRT2_INV)),
    )


def gate_ry(state: Sequence[complex], n_qubits: int, qubit: int,
            theta: float) -> list[complex]:
    c, s = math.cos(theta / 2), math.sin(theta / 2)
    return apply_single_qubit(state, n_qubits, qubit, ((c, -s), (s, c)))


def gate_cnot(state: Sequence[complex], n_qubits: int, control: int,
              target: int) -> list[complex]:
    _validate_qubit(n_qubits, control)
    _validate_qubit(n_qubits, target)
    if control == target:
        raise ValueError("control and target must differ")
    out = list(state)
    control_mask, target_mask = 1 << control, 1 << target
    for index in range(len(state)):
        if index & control_mask and not index & target_mask:
            partner = index | target_mask
            out[index], out[partner] = state[partner], state[index]
    return out


def probabilities(state: Sequence[complex]) -> list[float]:
    if not state:
        raise ValueError("state vector cannot be empty")
    total = sum(abs(a) ** 2 for a in state)
    if not math.isclose(total, 1.0, rel_tol=1e-9, abs_tol=1e-9):
        raise ValueError(f"state is not normalized (norm²={total})")
    return [abs(a) ** 2 for a in state]


def measure(state: Sequence[complex], shots: int = 1000,
            seed: int | None = None) -> dict[str, int]:
    if shots < 1:
        raise ValueError("shots must be >= 1")
    probs = probabilities(state)
    rng = random.Random(seed)
    outcomes = [format(i, f"0{int(math.log2(len(state)))}b")
                for i in range(len(state))]
    counts = {outcome: 0 for outcome in outcomes}
    for _ in range(shots):
        r, cumulative = rng.random(), 0.0
        for outcome, p in zip(outcomes, probs):
            cumulative += p
            if r <= cumulative:
                counts[outcome] += 1
                break
    return {k: v for k, v in counts.items() if v}


def bell_state() -> list[complex]:
    state = gate_h(zero_state(2), 2, 0)
    return gate_cnot(state, 2, 0, 1)


def grover_two_qubit(marked: int) -> list[complex]:
    """One Grover iteration for a 2-qubit search, returning amplitudes."""
    if marked not in range(4):
        raise ValueError("marked state must be an integer from 0 to 3")
    state = zero_state(2)
    state = gate_h(gate_h(state, 2, 0), 2, 1)
    state[marked] *= -1
    mean = sum(state) / len(state)
    return [2 * mean - amplitude for amplitude in state]


def state_summary(state: Sequence[complex]) -> dict[str, object]:
    probs = probabilities(state)
    entropy = -sum(p * math.log2(p) for p in probs if p > 0)
    return {
        "basis_probabilities": [round(p, 10) for p in probs],
        "norm_squared": round(sum(abs(a) ** 2 for a in state), 12),
        "measurement_entropy_bits": round(entropy, 10),
        "qubits": int(math.log2(len(state))),
    }


def run_demo() -> dict[str, object]:
    bell = bell_state()
    grover = grover_two_qubit(2)
    return {
        "engine": "AKSI Quantum Core / state-vector simulator",
        "execution": "classical simulation; no quantum hardware used",
        "bell_state": state_summary(bell),
        "bell_measurements": measure(bell, shots=1000, seed=42),
        "grover_marked_state_10": state_summary(grover),
        "grover_measurements": measure(grover, shots=1000, seed=42),
    }


if __name__ == "__main__":
    import json
    print(json.dumps(run_demo(), indent=2))
