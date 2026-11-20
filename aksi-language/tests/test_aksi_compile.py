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
        self.assertEqual(payload["analysis"]["schema"], "AKSI-Q-ANALYSIS/4")
        ir = result.ir.to_dict()
        self.assertEqual(ir["schema"], "AKSI-Q-TIR/0.2")
        self.assertEqual(ir["nodes"][0]["op"], "Function")
        self.assertEqual(ir["nodes"][0]["type"], "Function")
        self.assertEqual(ir["nodes"][0]["fields"]["type_parameters"], ["T"])
        self.assertRegex(ir["nodes"][0]["id"], r"^[0-9a-f]{20}$")
        self.assertEqual(ir["nodes"][0]["fields"]["body"]["type"], "Unit")
        self.assertIn("inferred_types", payload["analysis"])\n        self.assertIn("effect_summaries", payload["analysis"])\n        self.assertIn("module_effects", payload["analysis"])

    def test_generic_abs_preserves_argument_type_in_tir(self):
        result = compile_source("let magnitude: Int = abs(-7)")
        self.assertTrue(result.ok, result.analysis.diagnostics)
        call = result.ir.nodes[0].get("value")
        self.assertEqual(call.op, "Call")
        self.assertEqual(call.type_name, "Int")

    def test_collection_builtins_compile_with_precise_result_types(self):
        for source, expected in (
            ("let total: Int = sum([1, 2, 3])", "Int"),
            ('let smallest: String = min(["a", "b"])', "String"),
            ('let count: Int = len("aksi")', "Int"),
        ):
            with self.subTest(source=source):
                result = compile_source(source)
                self.assertTrue(result.ok, result.analysis.diagnostics)
                self.assertEqual(result.ir.nodes[0].get("value").type_name, expected)

    def test_dynamic_host_call_is_rejected_as_lowering_diagnostic(self):
        result = compile_source('let value = host_call("clock", [])')
        self.assertFalse(result.ok)
        self.assertIsNone(result.ir)
        self.assertIn("E_TIR_LOWERING", [item.code for item in result.analysis.diagnostics])

    def test_dynamic_member_type_is_rejected_before_ir_generation(self):
        result = compile_source("let answer = record.value")
        self.assertFalse(result.ok)
        self.assertIsNone(result.ir)

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
