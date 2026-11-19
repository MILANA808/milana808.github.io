import unittest

from aksi_compile import compile_source


class CompilerPipelineTests(unittest.TestCase):
    def test_compiles_generic_function_to_versioned_tir(self):
        result = compile_source(
            "fn identity<T>(value: T) -> T { return value }\n"
            "let answer: Int = identity(42)"
        )
        self.assertTrue(result.ok, result.analysis.diagnostics)
        payload = result.to_dict()
        self.assertEqual(payload["schema"], "AKSI-Q-COMPILE/0.2")
        self.assertEqual(payload["analysis"]["schema"], "AKSI-Q-ANALYSIS/2")
        ir = result.ir.to_dict()
        self.assertEqual(ir["schema"], "AKSI-Q-TIR/0.1")
        self.assertEqual(ir["nodes"][0]["op"], "Function")
        self.assertEqual(ir["nodes"][0]["type"], "T")
        self.assertEqual(ir["nodes"][0]["fields"]["type_parameters"], ["T"])

    def test_rejects_invalid_source_before_ir_generation(self):
        result = compile_source("let answer: Int = \"not an integer\"")
        self.assertFalse(result.ok)
        self.assertIsNone(result.ir)

    def test_unknown_expression_types_are_not_fabricated(self):
        result = compile_source("let answer = unknown_value")
        self.assertFalse(result.ok)
        self.assertIsNone(result.ir)


if __name__ == "__main__":
    unittest.main()
