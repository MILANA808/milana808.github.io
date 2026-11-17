import unittest

from aksi_interpreter import AksiRuntimeError, Interpreter


class AksiAstInterpreterTests(unittest.TestCase):
    def test_executes_typed_function_and_print(self):
        result = Interpreter().run(
            "fn add(x: Int, y: Int) -> Int { return x + y }\n"
            "let answer: Int = add(2, 3)\n"
            "print(answer)"
        )
        self.assertEqual(result.output, ("5",))
        self.assertEqual(result.values, ())
        self.assertGreater(result.steps, 0)

    def test_executes_if_while_and_mutable_assignment(self):
        result = Interpreter().run(
            "mut count: Int = 0\n"
            "while count < 4 {\n"
            "  if count == 2 { print(count) }\n"
            "  count += 1\n"
            "}\n"
            "print(count)"
        )
        self.assertEqual(result.output, ("2", "4"))

    def test_expression_statement_results_are_returned(self):
        result = Interpreter().run("1 + 2\nlet values = [3, 4]\nvalues[1]")
        self.assertEqual(result.values, (3, 4))

    def test_break_and_continue_control_loop_execution(self):
        source = (
            "mut count = 0\n"
            "mut total = 0\n"
            "while count < 10 {\n"
            "  count += 1\n"
            "  if count == 3 { continue }\n"
            "  if count == 6 { break }\n"
            "  total += count\n"
            "}\n"
            "print(total)"
        )
        result = Interpreter().run(source)
        self.assertEqual(result.output, ("12",))

    def test_function_closure_reads_lexical_parent_scope(self):
        source = (
            "let base: Int = 4\n"
            "fn add_base(value: Int) -> Int { return base + value }\n"
            "print(add_base(3))"
        )
        self.assertEqual(Interpreter().run(source).output, ("7",))

    def test_nested_block_binding_does_not_escape_scope(self):
        source = (
            "if true { let hidden: Int = 9 }\n"
            "print(hidden)"
        )
        with self.assertRaisesRegex(AksiRuntimeError, "static analysis failed"):
            Interpreter().run(source)

    def test_static_analysis_runs_before_execution(self):
        with self.assertRaisesRegex(AksiRuntimeError, "static analysis failed"):
            Interpreter().run("let value: Int = \"not an integer\"")

    def test_rejects_immutable_assignment(self):
        with self.assertRaisesRegex(AksiRuntimeError, "static analysis failed"):
            Interpreter().run("let value = 1\nvalue = 2")

    def test_enforces_instruction_budget(self):
        with self.assertRaisesRegex(AksiRuntimeError, "instruction budget exceeded|loop iteration limit"):
            Interpreter(max_steps=80).run("mut count = 0\nwhile true { count += 1 }")

    def test_enforces_call_depth(self):
        source = (
            "fn descend(n: Int) -> Int {\n"
            "  if n == 0 { return 0 } else { return descend(n - 1) }\n"
            "}\n"
            "print(descend(20))"
        )
        with self.assertRaises(AksiRuntimeError) as caught:
            Interpreter(max_call_depth=5).run(source)
        self.assertIn("call depth limit", str(caught.exception))

    def test_rejects_unimplemented_member_access(self):
        with self.assertRaisesRegex(AksiRuntimeError, "member access is not implemented"):
            Interpreter().run("let value = item.field", analyze=False)

    def test_rejects_oversized_array_literal(self):
        with self.assertRaisesRegex(AksiRuntimeError, "array literal exceeds"):
            Interpreter(max_array_items=2).run("let values = [1, 2, 3]", analyze=False)

    def test_enforces_output_character_budget(self):
        with self.assertRaisesRegex(AksiRuntimeError, "output character limit"):
            Interpreter(max_output_chars=4).run('print("12345")')

    def test_enforces_output_line_budget(self):
        source = "print(1)\nprint(2)\nprint(3)"
        with self.assertRaisesRegex(AksiRuntimeError, "output line limit"):
            Interpreter(max_output_lines=2).run(source)

    def test_enforces_expression_result_retention_budget(self):
        with self.assertRaisesRegex(AksiRuntimeError, "result item limit"):
            Interpreter(max_result_items=1).run("1\n2")

    def test_formats_function_values_without_exposing_closure(self):
        result = Interpreter().run(
            "fn greet(name: String) -> String { return name }\n"
            "print(greet)"
        )
        self.assertEqual(result.output, ("<function greet>",))

    def test_rejects_excessive_output_nesting(self):
        nested = "[" * 34 + "1" + "]" * 34
        with self.assertRaisesRegex(AksiRuntimeError, "nesting depth limit"):
            Interpreter().run("print(" + nested + ")", analyze=False)

    def test_does_not_expose_python_dynamic_execution(self):
        with self.assertRaisesRegex(AksiRuntimeError, "unknown name"):
            Interpreter().run("eval(\"1 + 1\")")


if __name__ == "__main__":
    unittest.main()
