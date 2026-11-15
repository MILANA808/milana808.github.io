import unittest

from aksi_lexer import LexError, lex


class LexerTests(unittest.TestCase):
    def test_keywords_identifiers_numbers_and_operators(self):
        tokens = lex("fn add(x: Int) -> Int { let y = x + 2; return y }")
        values = [(item.kind, item.value) for item in tokens]
        self.assertEqual(values[0], ("KEYWORD", "fn"))
        self.assertIn(("IDENT", "add"), values)
        self.assertIn(("NUMBER", "2"), values)
        self.assertIn(("OP", "->"), values)
        self.assertIn(("OP", "+"), values)
        self.assertEqual(values[-1], ("EOF", ""))

    def test_source_spans_track_lines_and_columns(self):
        tokens = lex("let x = 1\n  print x")
        print_token = next(item for item in tokens if item.value == "print")
        self.assertEqual((print_token.span.line, print_token.span.column), (2, 3))
        self.assertEqual((print_token.span.start, print_token.span.end), (12, 17))

    def test_strings_decode_escapes_and_hash_inside_string_is_not_comment(self):
        tokens = lex('let text = "a\\n#b" # comment')
        string = next(item for item in tokens if item.kind == "STRING")
        self.assertEqual(string.value, "a\n#b")

    def test_single_quoted_unicode_escape(self):
        token = next(item for item in lex("let x = '\\u0410'") if item.kind == "STRING")
        self.assertEqual(token.value, "А")

    def test_unterminated_and_multiline_strings_are_rejected(self):
        for source in ('let x = "oops', 'let x = "a\nb"'):
            with self.subTest(source=source), self.assertRaises(LexError):
                lex(source)

    def test_unexpected_character_has_precise_location(self):
        with self.assertRaises(LexError) as caught:
            lex("let x = @")
        self.assertEqual((caught.exception.span.line, caught.exception.span.column), (1, 9))

    def test_newline_tokens_can_be_omitted(self):
        self.assertFalse(any(t.kind == "NEWLINE" for t in lex("a\nb", include_newlines=False)))

    def test_source_and_token_budgets(self):
        with self.assertRaises(ValueError):
            lex("x" * 1_000_001)
        with self.assertRaises(LexError):
            lex(" ".join(["x"] * 100_001))


if __name__ == "__main__":
    unittest.main()
