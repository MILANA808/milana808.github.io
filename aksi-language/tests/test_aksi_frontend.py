import json
import unittest

from aksi_frontend import Node, ParseError, parse, serialize_ast


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

    def test_ast_serialization_has_versioned_schema_and_source_spans(self):
        tree = parse("fn add(a: Int) -> Int { return a + 1 }")
        serialized = serialize_ast(tree)
        self.assertEqual(serialized["schema"], "AKSI-Q-AST/2")
        self.assertEqual(serialized["root"]["kind"], "Module")
        function = serialized["root"]["fields"]["items"][0]
        self.assertEqual(function["kind"], "Function")
        self.assertEqual(function["span"]["line"], 1)
        self.assertEqual(function["fields"]["name"], "add")
        self.assertRegex(function["id"], r"^[0-9a-f]{20}$")
        self.assertEqual(json.loads(json.dumps(serialized)), serialized)

    def test_ast_serialization_rejects_non_nodes(self):
        with self.assertRaises(TypeError):
            serialize_ast({"kind": "Module"})



    def test_parses_generic_functions_structs_and_enum_payloads(self):
        tree = parse("""struct Box<T> {
    value: T
}
type Option<T> = None | Some(T)
fn identity<T>(value: T) -> T { return value }
""")
        items = tree.get("items")
        self.assertEqual(items[0].kind, "StructDeclaration")
        self.assertEqual(items[0].get("type_params"), ("T",))
        self.assertEqual(items[1].kind, "TypeDeclaration")
        self.assertEqual(items[1].get("type_params"), ("T",))
        self.assertEqual(items[2].get("type_params"), ("T",))

    def test_parses_import_alias_and_for_loop(self):
        tree = parse("""import std.math as math
fn total(values: [Int]) {
    for item in values {
        print(item)
    }
}
""")
        self.assertEqual(tree.get("items")[0].kind, "Import")
        self.assertEqual(tree.get("items")[0].get("alias"), "math")
        loop = tree.get("items")[1].get("body").get("statements")[0]
        self.assertEqual(loop.kind, "For")
        self.assertEqual(loop.get("name"), "item")

    def test_parses_match_with_constructor_and_wildcard_patterns(self):
        tree = parse("""type Option = None | Some(Int)
fn inspect(value: Option) {
    match value {
        Some(item) => { print(item) }
        _ => { print(0) }
    }
}
""")
        match = tree.get("items")[1].get("body").get("statements")[0]
        self.assertEqual(match.kind, "Match")
        self.assertEqual(match.get("arms")[0][0].kind, "ConstructorPattern")
        self.assertEqual(match.get("arms")[1][0].kind, "WildcardPattern")


    def test_ast_ids_are_deterministic_for_same_source(self):
        first = serialize_ast(parse("let value = 10"))
        second = serialize_ast(parse("let value = 10"))
        self.assertEqual(first, second)

    def test_parser_recovers_and_reports_multiple_errors(self):
        from aksi_frontend import parse_recovering
        source = "let broken =\nlet good = 1\nfn also_broken(x Int) {}\nlet last = 2"
        result = parse_recovering(source)
        self.assertGreaterEqual(len(result.diagnostics), 2)
        self.assertEqual(result.tree.kind, "Module")
        self.assertTrue(any(node.kind == "Error" for node in result.tree.get("items")))
        self.assertTrue(any(node.kind == "Binding" and node.get("name") == "last"
                            for node in result.tree.get("items")))

    def test_strict_parser_still_raises_first_error(self):
        with self.assertRaises(ParseError):
            parse("let broken =\nlet good = 1")

if __name__ == "__main__":
    unittest.main()
