import unittest

from aksi_analyze import analyze_module, analyze_source
from aksi_frontend import ParseError, parse


class AnalyzePipelineTests(unittest.TestCase):
    def test_accepts_simple_typed_program(self):
        result = analyze_source(
            "fn add(x: Int, y: Int) -> Int { return x + y }\n"
            "let answer: Int = add(2, 3)"
        )
        self.assertTrue(result.ok, result.diagnostics)
        self.assertEqual(result.schema, "AKSI-Q-ANALYSIS/3")

    def test_analyzes_existing_ast_without_reparsing(self):
        module = parse("let answer: Int = 42")
        result = analyze_module(module)
        self.assertTrue(result.ok, result.diagnostics)
        self.assertEqual(result.schema, "AKSI-Q-ANALYSIS/3")

    def test_rejects_non_module_ast(self):
        with self.assertRaises(TypeError):
            analyze_module(parse("let answer = 1").get("items")[0])

    def test_combines_name_and_type_diagnostics(self):
        result = analyze_source(
            'fn f(x: Int) -> Int { return missing(x) }\n'
            'let bad: Int = "text"'
        )
        codes = [item.code for item in result.diagnostics]
        self.assertIn("E_UNKNOWN_NAME", codes)
        self.assertIn("E_TYPE_MISMATCH", codes)
        self.assertFalse(result.ok)

    def test_diagnostics_are_sorted_by_source_position(self):
        result = analyze_source(
            'let first: Int = "bad"\n'
            'let second: Bool = 4'
        )
        positions = [(item.line, item.column) for item in result.diagnostics]
        self.assertEqual(positions, sorted(positions))

    def test_requires_return_on_every_branch_for_non_unit_functions(self):
        result = analyze_source(
            "fn choose(flag: Bool) -> Int {\n"
            "  if flag { return 1 } else { print(2) }\n"
            "}"
        )
        self.assertIn("E_MISSING_RETURN", [item.code for item in result.diagnostics])

    def test_accepts_return_from_both_if_branches(self):
        result = analyze_source(
            "fn choose(flag: Bool) -> Int {\n"
            "  if flag { return 1 } else { return 2 }\n"
            "}"
        )
        self.assertNotIn("E_MISSING_RETURN", [item.code for item in result.diagnostics])

    def test_does_not_assume_loop_executes(self):
        result = analyze_source("fn first() -> Int { while true { return 1 } }")
        self.assertIn("E_MISSING_RETURN", [item.code for item in result.diagnostics])

    def test_unit_function_does_not_require_explicit_return(self):
        result = analyze_source("fn log_value() { print(1) }")
        self.assertNotIn("E_MISSING_RETURN", [item.code for item in result.diagnostics])

    def test_parser_errors_are_not_silently_swallowed(self):
        with self.assertRaises(ParseError):
            analyze_source("fn broken(")

    def test_generic_identity_function_infers_call_type(self):
        result = analyze_source(
            "fn identity<T>(value: T) -> T { return value }\n"
            "let answer: Int = identity(42)"
        )
        self.assertTrue(result.ok, result.diagnostics)

    def test_struct_and_generic_enum_declarations_resolve(self):
        result = analyze_source(
            "struct Box<T> { value: T }\n"
            "type Option<T> = None | Some(T)\n"
            "fn unwrap<T>(value: T) -> T { return value }"
        )
        self.assertTrue(result.ok, result.diagnostics)

    def test_for_loop_binds_array_item_type(self):
        result = analyze_source(
            "fn show(values: [Int]) {\n"
            "  for item in values { print(item) }\n"
            "}"
        )
        self.assertTrue(result.ok, result.diagnostics)

    def test_match_resolves_enum_constructors_and_bindings(self):
        result = analyze_source(
            "type Option = None | Some(Int)\n"
            "fn show(value: Option) {\n"
            "  match value {\n"
            "    Some(item) => { print(item) }\n"
            "    _ => { print(0) }\n"
            "  }\n"
            "}"
        )
        self.assertTrue(result.ok, result.diagnostics)


if __name__ == "__main__":
    unittest.main()
