import unittest

from aksi_compile import compile_source
from aksi_interpreter import AksiRuntimeError, Interpreter
from aksi_tir_runtime import TIRInterpreter


class TIRRuntimeTests(unittest.TestCase):
    def execute_both(self, source):
        compiled = compile_source(source)
        self.assertTrue(compiled.ok, compiled.analysis.diagnostics)
        ast_result = Interpreter().run(source)
        tir_result = TIRInterpreter().run(compiled.ir)
        self.assertEqual(tir_result.output, ast_result.output)
        self.assertEqual(tir_result.values, ast_result.values)
        return tir_result

    def test_executes_arithmetic_and_builtins(self):
        result = self.execute_both(
            "let total: Int = sum([1, 2, 3])\n"
            "print(total)\n"
            "print(abs(-9))\n"
            "print(len(\"aksi\"))"
        )
        self.assertEqual(result.output, ("6", "9", "4"))

    def test_executes_functions_and_lexical_closures(self):
        self.execute_both(
            "let base: Int = 5\n"
            "fn add(value: Int) -> Int { return base + value }\n"
            "print(add(7))"
        )

    def test_executes_branch_and_loop(self):
        self.execute_both(
            "mut total: Int = 0\n"
            "for item in [1, 2, 3] { total += item }\n"
            "if total == 6 { print(total) } else { print(0) }"
        )

    def test_executes_match_and_enum_values(self):
        self.execute_both(
            "type Option = None | Some(Int)\n"
            "let value = Some(7)\n"
            "match value { Some(number) => { print(number) } None => { print(0) } }"
        )

    def test_instruction_budget_is_enforced(self):
        compiled = compile_source("mut count: Int = 0\nwhile true { count += 1 }")
        self.assertTrue(compiled.ok, compiled.analysis.diagnostics)
        with self.assertRaisesRegex(AksiRuntimeError, "instruction budget exceeded|loop iteration limit"):
            TIRInterpreter(max_steps=30).run(compiled.ir)

    def test_host_capabilities_are_not_available_in_tir_runtime(self):
        with self.assertRaisesRegex(ValueError, "not enabled"):
            TIRInterpreter(capabilities={"clock.now": lambda: 1})


if __name__ == "__main__":
    unittest.main()
