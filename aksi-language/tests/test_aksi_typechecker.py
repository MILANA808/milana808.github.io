import unittest

from aksi_frontend import parse
from aksi_typechecker import check


class TypeCheckerTests(unittest.TestCase):
    def codes(self, source):
        return [item.code for item in check(parse(source))]

    def test_accepts_well_typed_bindings_and_function(self):
        self.assertEqual(self.codes(
            "let count: Int = 2\n"
            "fn add(x: Int, y: Int) -> Int { return x + y }"
        ), [])

    def test_reports_binding_type_mismatch(self):
        self.assertIn("E_TYPE_MISMATCH",
                      self.codes('let count: Int = "two"'))

    def test_reports_return_type_mismatch(self):
        self.assertIn("E_RETURN_TYPE_MISMATCH",
                      self.codes('fn value() -> Int { return "wrong" }'))

    def test_reports_invalid_numeric_operator(self):
        self.assertIn("E_OPERATOR_TYPE",
                      self.codes('let result = "hello" - 1'))

    def test_reports_non_boolean_condition(self):
        self.assertIn("E_CONDITION_TYPE",
                      self.codes('if 42 { let x = 1 }'))

    def test_checks_function_argument_count_and_types(self):
        diagnostics = check(parse(
            "fn square(x: Int) -> Int { return x * x }\n"
            'let result = square("bad", 2)'
        ))
        self.assertIn("E_ARGUMENT_COUNT", [d.code for d in diagnostics])
        self.assertIn("E_ARGUMENT_TYPE", [d.code for d in diagnostics])

    def test_checks_mutable_assignment_type(self):
        self.assertIn("E_ASSIGNMENT_TYPE_MISMATCH",
                      self.codes('mut count: Int = 1\ncount = "bad"'))

    def test_checks_array_element_types(self):
        self.assertIn("E_ARRAY_ELEMENT_MISMATCH",
                      self.codes('let values = [1, "two"]'))

    def test_checks_array_index_type(self):
        self.assertIn("E_INDEX_TYPE",
                      self.codes("let values = [1, 2]\nlet item = values[true]"))

    def test_collection_builtins_have_precise_types(self):
        self.assertEqual(self.codes(
            "let total: Int = sum([1, 2, 3])\n"
            "let smallest: String = min([\\"a\\", \\"b\\"])\n"
            "let count: Int = len(\\"aksi\\")"
        ), [])

    def test_collection_builtins_reject_invalid_inputs(self):
        self.assertIn("E_BUILTIN_ARGUMENT_TYPE",
                      self.codes('let total = sum(["one", "two"])'))
        self.assertIn("E_BUILTIN_ARGUMENT_TYPE",
                      self.codes("let count = len(42)"))

    def test_dynamic_host_builtins_are_not_lowerable(self):
        self.assertIn("E_UNSUPPORTED_DYNAMIC_BUILTIN",
                      self.codes('let value = host_call("clock", [])'))
        self.assertIn("E_UNSUPPORTED_DYNAMIC_BUILTIN",
                      self.codes("let value = complex(1.0, 2.0)"))

    def test_accepts_builtin_math_function(self):
        self.assertEqual(self.codes("let result: Float = sqrt(4.0)"), [])

    def test_checks_unknown_function_return_type(self):
        self.assertIn(
            "E_UNKNOWN_TYPE",
            self.codes("fn f() -> Missing { return }"),
        )

    def test_rejects_ordering_boolean_values(self):
        self.assertIn(
            "E_OPERATOR_TYPE",
            self.codes("let result = true < false"),
        )

    def test_checks_unknown_function_parameter_type(self):
        self.assertIn(
            "E_UNKNOWN_TYPE",
            self.codes("fn f(value: Missing) -> Int { return 1 }"),
        )

    def test_checks_top_level_expression_statements(self):
        self.assertIn(
            "E_OPERATOR_TYPE",
            self.codes('"hello" - 1'),
        )

    def test_rejects_non_module_input(self):
        with self.assertRaises(TypeError):
            check(parse("let value = 1").get("items")[0])


if __name__ == "__main__":
    unittest.main()
