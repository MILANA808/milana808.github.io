import math
import unittest

from quantum_core import (
    bell_state, gate_h, gate_x, gate_cnot, grover_two_qubit,
    measure, probabilities, zero_state,
)


class QuantumCoreTests(unittest.TestCase):
    def test_zero_state(self):
        self.assertEqual(probabilities(zero_state(3)), [1.0] + [0.0] * 7)

    def test_hadamard_uniform_distribution(self):
        state = gate_h(zero_state(1), 1, 0)
        self.assertAlmostEqual(probabilities(state)[0], 0.5)
        self.assertAlmostEqual(probabilities(state)[1], 0.5)

    def test_bell_entanglement_distribution(self):
        p = probabilities(bell_state())
        self.assertAlmostEqual(p[0], 0.5)
        self.assertAlmostEqual(p[1], 0.0)
        self.assertAlmostEqual(p[2], 0.0)
        self.assertAlmostEqual(p[3], 0.5)
        counts = measure(bell_state(), shots=1000, seed=7)
        self.assertEqual(set(counts), {"00", "11"})

    def test_x_gate_flips_basis_state(self):
        self.assertEqual(probabilities(gate_x(zero_state(1), 1, 0)), [0.0, 1.0])

    def test_cnot_rejects_same_control_target(self):
        with self.assertRaises(ValueError):
            gate_cnot(zero_state(2), 2, 0, 0)

    def test_grover_amplifies_marked_state(self):
        p = probabilities(grover_two_qubit(2))
        self.assertGreater(p[2], 0.99)
        self.assertAlmostEqual(sum(p), 1.0)

    def test_measure_is_seeded(self):
        self.assertEqual(measure(bell_state(), 100, 11), measure(bell_state(), 100, 11))

    def test_invalid_state_rejected(self):
        with self.assertRaises(ValueError):
            probabilities([0j, 0j])


if __name__ == "__main__":
    unittest.main()
