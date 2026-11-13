import math
import unittest

from aksi_q import AksiError, Runtime, _hadamard, _measure, _norm, _probabilities, _tensor


class AksiLanguageTests(unittest.TestCase):
    def test_vector_norm_and_dot(self):
        runtime = Runtime()
        self.assertEqual(runtime.run("let v = vector(3, 4)\nprint norm(v)\nprint dot(v, v)"), [5.0, 25])

    def test_hadamard_probabilities(self):
        state = _hadamard([1, 0])
        self.assertAlmostEqual(state[0].real, 1 / math.sqrt(2))
        self.assertAlmostEqual(_probabilities(state)[0], 0.5)
        self.assertAlmostEqual(_probabilities(state)[1], 0.5)

    def test_measure_is_reproducible(self):
        state = _hadamard([1, 0])
        self.assertEqual(_measure(state, 100, 19), _measure(state, 100, 19))

    def test_bell_state_has_correlated_measurements(self):
        runtime = Runtime()
        result = runtime.run("let zero = qstate(2)\nlet plus = h(zero, 0)\nlet bell = cnot(plus, 0, 1)\nprint probabilities(bell)")
        self.assertAlmostEqual(result[0][0], 0.5)
        self.assertAlmostEqual(result[0][3], 0.5)
        self.assertAlmostEqual(result[0][1], 0.0)
        self.assertAlmostEqual(result[0][2], 0.0)

    def test_single_qubit_x_gate(self):
        result = Runtime().run("let zero = qstate(1)\nlet one = x(zero)\nprint probabilities(one)")
        self.assertEqual(result[0], [0.0, 1.0])

    def test_rotation_preserves_norm(self):
        result = Runtime().run("let zero = qstate(1)\nlet rotated = ry(zero, pi / 3)\nprint norm(rotated)")
        self.assertAlmostEqual(result[0], 1.0)

    def test_quantum_register_limit(self):
        with self.assertRaises(AksiError):
            Runtime().run("let too_large = qstate(11)")

    def test_invalid_cnot_target_is_rejected(self):
        with self.assertRaises(AksiError):
            Runtime().run("let zero = qstate(2)\nprint cnot(zero, 0, 0)")

    def test_concept_transitive_inference(self):
        source = '''
concept "cat" means "mammal"
concept "mammal" means "animal"
concept "animal" means "living thing"
relate "cat" -> "mammal" as "is_a"
relate "mammal" -> "animal" as "is_a"
infer "cat"
'''
        self.assertEqual(Runtime().run(source), [["mammal", "animal"]])

    def test_unknown_name_fails(self):
        with self.assertRaises(AksiError):
            Runtime().run("print not_defined")

    def test_python_escape_hatch_is_not_available(self):
        with self.assertRaises(AksiError):
            Runtime().run('print __import__("os")')

    def test_assertion_fails_loudly(self):
        with self.assertRaises(AksiError):
            Runtime().run("assert 2 + 2 == 5")

    def test_resource_limits_reject_extreme_exponents(self):
        with self.assertRaises(AksiError):
            Runtime().run("print 2 ** 2000")

    def test_tensor_product_limit(self):
        with self.assertRaises(AksiError):
            _tensor([1] * 4096, [1] * 4096)


if __name__ == "__main__":
    unittest.main()
