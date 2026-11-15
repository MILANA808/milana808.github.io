import unittest

from aksi_frontend import parse
from aksi_resolver import resolve, resolve_source


class ResolverTests(unittest.TestCase):
    def codes(self, source):
        return [item.code for item in resolve_source(source)]

    def test_resolves_function_parameters_and_forward_function_calls(self):
        self.assertEqual(self.codes(
            "fn first(x: Int) -> Int { return later(x) }\n"
            "fn later(y: Int) -> Int { return y }"
        ), [])

    def test_reports_unknown_names_and_unknown_types(self):
        diagnostics = resolve_source(
            "fn run(x: Missing) -> Int { return absent(x) }"
        )
        self.assertEqual(
            [item.code for item in diagnostics],
            ["E_UNKNOWN_TYPE", "E_UNKNOWN_NAME"],
        )
        self.assertEqual(
            [(item.line, item.column) for item in diagnostics],
            [(1, 11), (1, 40)],
        )

    def test_rejects_duplicate_declarations_in_one_scope(self):
        self.assertIn(
            "E_DUPLICATE_DECLARATION",
            self.codes("let value = 1\nlet value = 2"),
        )

    def test_allows_shadowing_in_nested_scope(self):
        self.assertEqual(
            self.codes("let value = 1\nif true { let value = 2 }"),
            [],
        )

    def test_only_mut_bindings_can_be_assigned(self):
        diagnostics = resolve_source(
            "let fixed = 1\nmut counter = 0\nfn update() { "
            "fixed = 2\ncounter = 3\n}"
        )
        self.assertEqual(
            [item.code for item in diagnostics],
            ["E_IMMUTABLE_ASSIGNMENT"],
        )

    def test_checks_loop_control_and_return_context(self):
        self.assertEqual(
            self.codes("return 1\nbreak\nwhile true { continue }"),
            ["E_RETURN_OUTSIDE_FUNCTION", "E_LOOP_CONTROL_OUTSIDE_LOOP"],
        )

    def test_resolves_declared_algebraic_type_and_constructor(self):
        self.assertEqual(
            self.codes("type Maybe = None | Some(Int)\n"
                       "fn wrap(x: Int) -> Maybe { return Some(x) }"),
            [],
        )

    def test_unknown_type_inside_array_type_is_reported(self):
        self.assertEqual(
            self.codes("fn f(x: [Missing]) { return }"),
            ["E_UNKNOWN_TYPE"],
        )

    def test_rejects_non_module_input(self):
        with self.assertRaises(TypeError):
            resolve(parse("let value = 1").get("items")[0])


if __name__ == "__main__":
    unittest.main()
