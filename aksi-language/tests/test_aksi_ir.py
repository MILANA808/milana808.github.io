import unittest

from aksi_ir import IRModule, IRNode, validate_tir


class TIRValidationTests(unittest.TestCase):
    def node(self, *, node_id="0123456789abcdef0123", op="Number",
             type_name="Int", span=(1, 1, 1, 2), fields=()):
        return IRNode(node_id, op, type_name, span, fields)

    def test_accepts_valid_typed_module(self):
        module = IRModule("AKSI-Q-TIR/0.2", None, (self.node(),))
        self.assertIsNone(validate_tir(module))

    def test_rejects_unknown_schema(self):
        with self.assertRaisesRegex(ValueError, "schema"):
            validate_tir(IRModule("AKSI-Q-TIR/0.1", None, ()))

    def test_rejects_unresolved_types(self):
        for unresolved in ("Unknown", "Any"):
            with self.subTest(unresolved=unresolved):
                with self.assertRaisesRegex(ValueError, "unresolved type"):
                    validate_tir(IRModule(
                        "AKSI-Q-TIR/0.2", None,
                        (self.node(type_name=unresolved),),
                    ))

    def test_rejects_duplicate_node_ids(self):
        duplicate = self.node()
        with self.assertRaisesRegex(ValueError, "duplicate TIR node ID"):
            validate_tir(IRModule(
                "AKSI-Q-TIR/0.2", None, (duplicate, duplicate),
            ))

    def test_rejects_invalid_source_span(self):
        with self.assertRaisesRegex(ValueError, "source span"):
            validate_tir(IRModule(
                "AKSI-Q-TIR/0.2", None,
                (self.node(span=(1, 0, 1, 2)),),
            ))

    def test_rejects_unknown_operation(self):
        with self.assertRaisesRegex(ValueError, "unsupported TIR operation"):
            validate_tir(IRModule(
                "AKSI-Q-TIR/0.2", None,
                (self.node(op="ExecuteArbitraryCode"),),
            ))

    def test_rejects_mutable_fields(self):
        with self.assertRaisesRegex(ValueError, "immutable"):
            validate_tir(IRModule(
                "AKSI-Q-TIR/0.2", None,
                (self.node(fields=[("value", 1)]),),
            ))


if __name__ == "__main__":
    unittest.main()
