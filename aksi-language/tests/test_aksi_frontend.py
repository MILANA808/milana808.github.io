import unittest

from aksi_frontend import Node, ParseError, parse


class FrontendParserTests(unittest.TestCase):
    def test_parses_module_function_and_typed_parameters(self):
        tree = parse("""module demo.math
fn add(a: Int, b: Int) -> Int {
    let total = a + b
    return total
}
""")
        self.assertEqual(tree.kind, "Module")
        self.assertEqual(tree.get("name"), "demo.math")
        function = tree.get("items")[0]
        self.assertEqual(function.kind, "Function")
        self.assertEqual(function.get("name"), "add")
        self.assertEqual(tuple(name for name, _ in function.get("params")), ("a", "b"))
        self.assertEqual(function.get("body").get("statements")[-1].kind, "Return")

    def test_parses_algebraic_type_and_public_declaration(self):
        tree = parse("pub type Maybe = None | Some(Int)")
        public = tree.get("items")[0]
        self.assertEqual(public.kind, "Public")
        self.assertEqual(public.get("declaration").kind, "TypeDeclaration")

    def test_parses_if_else_and_calls(self):
        tree = parse("""fn classify(x: Int) -> String {
    if x > 0 { return "positive" } else { return "other" }
}
""")
        branch = tree.get("items")[0].get("body").get("statements")[0]
        self.assertEqual(branch.kind, "If")
        self.assertEqual(branch.get("condition").kind, "Binary")

    def test_operator_precedence_and_right_associativity(self):
        tree = parse("let x = 2 + 3 * 4 ** 2")
        expression = tree.get("items")[0].get("value")
        self.assertEqual(expression.get("operator"), "+")
        self.assertEqual(expression.get("right").get("operator"), "*")
        self.assertEqual(expression.get("right").get("right").get("operator"), "**")

    def test_diagnostics_include_source_position_and_expected_token(self):
        with self.assertRaises(ParseError) as caught:
            parse("fn broken(x Int) { }")
        self.assertEqual((caught.exception.span.line, caught.exception.span.column), (1, 13))
        self.assertIn(":", caught.exception.expected)

    def test_unclosed_block_is_reported_at_eof(self):
        with self.assertRaises(ParseError) as caught:
            parse("fn broken() {")
        self.assertEqual(caught.exception.span.line, 1)
        self.assertEqual(caught.exception.span.column, 14)

    def test_ast_nodes_are_frozen(self):
        tree = parse("let answer = 42")
        with self.assertRaises((AttributeError, TypeError)):
            tree.kind = "Changed"


if __name__ == "__main__":
    unittest.main()
