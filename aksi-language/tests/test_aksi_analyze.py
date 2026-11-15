import unittest

from aksi_analyze import analyze_source
from aksi_frontend import ParseError


class AnalyzePipelineTests(unittest.TestCase):
    def test_accepts_simple_typed_program(self):
        result = analyze_source(
            "fn add(x: Int, y: Int) -> Int { return x + y }\n"
            "let answer: Int = add(2, 3)"
        )
        self.assertTrue(result.ok, result.diagnostics)
        self.assertEqual(result.schema, "AKSI-Q-ANALYSIS/1")

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

    def test_parser_errors_are_not_silently_swallowed(self):
        with self.assertRaises(ParseError):
            analyze_source("fn broken(")


if __name__ == "__main__":
    unittest.main()
