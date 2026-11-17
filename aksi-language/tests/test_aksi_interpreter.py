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

    def test_host_capability_is_denied_by_default(self):
        with self.assertRaisesRegex(AksiRuntimeError, "host capability denied: clock.now"):
            Interpreter().run('host_call("clock.now", [])')

    def test_host_capability_requires_explicit_grant_and_records_use(self):
        calls = []
        def clock_now():
            calls.append("called")
            return 123
        result = Interpreter(capabilities={"clock.now": clock_now}).run(
            'let now: Any = host_call("clock.now", [])\nprint(now)'
        )
        self.assertEqual(result.output, ("123",))
        self.assertEqual(result.capabilities_used, ("clock.now",))
        self.assertEqual(calls, ["called"])

    def test_host_capability_rejects_unsafe_results(self):
        with self.assertRaisesRegex(AksiRuntimeError, "only bounded scalar/list values"):
            Interpreter(capabilities={"unsafe.object": lambda: object()}).run(
                'host_call("unsafe.object", [])'
            )

    def test_host_capability_receives_a_copy_of_arguments(self):
        def mutate(values):
            values.append(3)
            return values
        result = Interpreter(capabilities={"list.mutate": mutate}).run(
            'host_call("list.mutate", [[1, 2]])'
        )
        self.assertEqual(result.values, ([1, 2, 3],))

    def test_host_capability_errors_do_not_leak_exception_details(self):
        def broken():
            raise RuntimeError("private host detail")
        with self.assertRaisesRegex(AksiRuntimeError, "host capability 'test.fail' failed: RuntimeError") as caught:
            Interpreter(capabilities={"test.fail": broken}).run(
                'host_call("test.fail", [])'
            )
        self.assertNotIn("private host detail", str(caught.exception))

    def test_invalid_capability_registry_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "invalid capability identifier"):
            Interpreter(capabilities={"../escape": lambda: None})
        with self.assertRaisesRegex(ValueError, "must be callable"):
            Interpreter(capabilities={"clock.now": "not callable"})


    def test_capability_can_be_granted_and_revoked(self):
        calls = []
        interpreter = Interpreter()
        interpreter.grant_capability("clock.now", lambda: calls.append("called") or 42)
        result = interpreter.run('host_call("clock.now", [])')
        self.assertEqual(result.values, (42,))
        self.assertTrue(interpreter.revoke_capability("clock.now"))
        self.assertFalse(interpreter.revoke_capability("clock.now"))
        with self.assertRaisesRegex(AksiRuntimeError, "host capability denied: clock.now"):
            interpreter.run('host_call("clock.now", [])')
        self.assertEqual(calls, ["called"])

    def test_revocation_during_execution_blocks_the_next_call(self):
        interpreter = None
        def revoke_then_return():
            interpreter.revoke_capability("clock.now")
            return 1
        interpreter = Interpreter(capabilities={"clock.now": revoke_then_return})
        with self.assertRaisesRegex(AksiRuntimeError, "host capability denied: clock.now"):
            interpreter.run('host_call("clock.now", [])\nhost_call("clock.now", [])')
        self.assertEqual(
            interpreter.capability_trace,
            [(1, "clock.now", "invoked"), (2, "clock.now", "returned"),
             (3, "clock.now", "denied")],
        )

    def test_capability_trace_records_failure_without_exception_details(self):
        def broken():
            raise RuntimeError("private")
        interpreter = Interpreter(capabilities={"test.fail": broken})
        with self.assertRaises(AksiRuntimeError):
            interpreter.run('host_call("test.fail", [])')
        self.assertEqual(
            interpreter.capability_trace,
            [(1, "test.fail", "invoked"), (2, "test.fail", "failed")],
        )

    def test_does_not_expose_python_dynamic_execution(self):
        with self.assertRaisesRegex(AksiRuntimeError, "unknown name"):
            Interpreter().run("eval(\"1 + 1\")")


    def test_host_capability_invocation_budget_counts_attempts(self):
        calls = []
        def clock_now():
            calls.append("called")
            return 7
        interpreter = Interpreter(
            capabilities={"clock.now": clock_now},
            max_capability_calls=1,
        )
        with self.assertRaisesRegex(AksiRuntimeError, "host capability invocation limit exceeded"):
            interpreter.run(
                'host_call("clock.now", [])\nhost_call("clock.now", [])'
            )
        self.assertEqual(calls, ["called"])
        self.assertEqual(interpreter.capability_calls, 1)

    def test_failed_host_capability_attempt_consumes_budget(self):
        def broken():
            raise RuntimeError("private")
        interpreter = Interpreter(
            capabilities={"test.fail": broken},
            max_capability_calls=1,
        )
        with self.assertRaisesRegex(AksiRuntimeError, "host capability 'test.fail' failed"):
            interpreter.run('host_call("test.fail", [])')
        with self.assertRaisesRegex(AksiRuntimeError, "host capability invocation limit exceeded"):
            interpreter.run('host_call("test.fail", [])')
        self.assertEqual(interpreter.capability_calls, 1)



if __name__ == "__main__":
    unittest.main()
