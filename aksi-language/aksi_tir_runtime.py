"""Bounded native evaluator for the canonical AKSI Q TIR.

This evaluator dispatches on IRNode.op and consumes IRNode fields directly.
It does not reconstruct or invoke the source AST. Host capabilities are not
exposed until TIR has a statically checked effect/ABI contract.
"""
from __future__ import annotations

from typing import Any

from aksi_ir import IRModule, IRNode, validate_tir
from aksi_interpreter import (
    AksiRuntimeError, ExecutionResult, Interpreter, _Break, _Continue,
    _Function, _Return, _Scope, _VariantConstructor,
)


class TIRInterpreter(Interpreter):
    """Execute the currently supported, validated TIR subset."""

    def __init__(self, **limits: Any):
        if "capabilities" in limits or "capability_specs" in limits:
            raise ValueError("TIR host capabilities are not enabled")
        super().__init__(**limits)
        # Do not leave the AST runtime's dynamic host-call entry point visible.
        self.global_scope.values.pop("host_call", None)

    def _tick(self, node: IRNode | None = None) -> None:
        self.steps += 1
        if self.steps > self.max_steps:
            location = ""
            if node is not None:
                line, column = node.span[:2]
                location = f" at {line}:{column}"
            raise AksiRuntimeError(f"instruction budget exceeded{location}")

    @staticmethod
    def _op(node: IRNode) -> str:
        if not isinstance(node, IRNode):
            raise AksiRuntimeError("TIR evaluator received a non-TIR node")
        return node.op

    def _match_pattern(self, pattern: IRNode, value: Any, scope: _Scope) -> bool:
        kind = self._op(pattern)
        if kind == "WildcardPattern":
            return True
        if kind == "BindingPattern":
            name = pattern.get("name")
            from aksi_interpreter import _VariantValue
            try:
                constructor = scope.find(name).value
            except AksiRuntimeError:
                constructor = None
            if isinstance(constructor, _VariantConstructor) and constructor.arity == 0:
                return isinstance(value, _VariantValue) and value.name == name and not value.payload
            scope.define(name, value, False)
            return True
        if kind == "NumberPattern":
            raw = pattern.get("value")
            expected = float(raw) if any(ch in raw.lower() for ch in (".", "e")) else int(raw)
            return type(value) in (int, float) and value == expected
        if kind == "StringPattern":
            return isinstance(value, str) and value == pattern.get("value")
        if kind == "LiteralPattern":
            return value == pattern.get("value")
        if kind == "ConstructorPattern":
            from aksi_interpreter import _VariantValue
            if not isinstance(value, _VariantValue) or value.name != pattern.get("name"):
                return False
            bindings = pattern.get("bindings", ())
            if len(bindings) != len(value.payload):
                return False
            for name, item in zip(bindings, value.payload):
                scope.define(name, item, False)
            return True
        raise AksiRuntimeError(f"unsupported TIR match pattern: {kind}")

    def _eval(self, node: IRNode, scope: _Scope) -> Any:
        self._tick(node)
        kind = self._op(node)
        get = node.get

        if kind == "Number":
            raw = get("value")
            value = float(raw) if any(ch in raw for ch in ".eE") else int(raw)
            return self._checked_value(value)
        if kind == "String":
            return self._checked_value(get("value"))
        if kind == "Literal":
            return get("value")
        if kind == "Name":
            return scope.find(get("value")).value
        if kind == "Group":
            return self._eval(get("value"), scope)
        if kind == "Array":
            items = get("items")
            if len(items) > self.max_array_items:
                raise AksiRuntimeError("array literal exceeds the configured item limit")
            return [self._eval(item, scope) for item in items]
        if kind == "Unary":
            value = self._eval(get("value"), scope)
            operator = get("operator")
            if operator in ("!", "not"):
                return not bool(value)
            if operator == "+" and self._number(value):
                return value
            if operator == "-" and self._number(value):
                return self._checked_value(-value)
            raise AksiRuntimeError(f"unsupported unary operation: {operator}")
        if kind == "Binary":
            operator = get("operator")
            left = self._eval(get("left"), scope)
            if operator in ("and", "&&"):
                return bool(left) and bool(self._eval(get("right"), scope))
            if operator in ("or", "||"):
                return bool(left) or bool(self._eval(get("right"), scope))
            right = self._eval(get("right"), scope)
            if operator in ("==", "!="):
                return left == right if operator == "==" else left != right
            if operator == "in":
                if not isinstance(right, (list, str, tuple, range)):
                    raise AksiRuntimeError("right operand of 'in' must be a collection")
                return left in right
            if operator in ("<", "<=", ">", ">="):
                if type(left) is not type(right) or not (
                    self._number(left) or isinstance(left, str)
                ):
                    raise AksiRuntimeError("ordered comparison requires matching numeric or string types")
                return {"<": left < right, "<=": left <= right,
                        ">": left > right, ">=": left >= right}[operator]
            if operator == "+" and isinstance(left, str) and isinstance(right, str):
                return self._checked_value(left + right)
            if operator == "+" and isinstance(left, list) and isinstance(right, list):
                return self._checked_value(left + right)
            if not (self._number(left) and self._number(right)):
                raise AksiRuntimeError(f"operator {operator!r} requires numeric operands")
            try:
                if operator == "+": value = left + right
                elif operator == "-": value = left - right
                elif operator == "*": value = left * right
                elif operator == "/": value = left / right
                elif operator == "//": value = left // right
                elif operator == "%": value = left % right
                elif operator == "**":
                    if abs(right) > 1024:
                        raise AksiRuntimeError("power exponent is limited to |n| <= 1024")
                    if type(left) is int and type(right) is int and right > 0:
                        if left.bit_length() * right > 100_000:
                            raise AksiRuntimeError("power result exceeds integer size limit")
                    value = left ** right
                else:
                    raise AksiRuntimeError(f"unsupported binary operator: {operator}")
            except ZeroDivisionError as exc:
                raise AksiRuntimeError("division by zero") from exc
            except (OverflowError, ValueError) as exc:
                raise AksiRuntimeError(f"invalid numeric operation: {exc}") from exc
            return self._checked_value(value)
        if kind == "Assignment":
            target = get("left")
            if self._op(target) != "Name":
                raise AksiRuntimeError("only named bindings can be assigned")
            name = target.get("value")
            right = self._eval(get("right"), scope)
            operator = get("operator")
            if operator in ("+=", "-="):
                right = self._eval_binary_value(
                    "+" if operator == "+=" else "-", scope.find(name).value, right
                )
            elif operator != "=":
                raise AksiRuntimeError(f"unsupported assignment operator: {operator}")
            scope.assign(name, self._checked_value(right))
            return right
        if kind == "Call":
            callee = self._eval(get("callee"), scope)
            args = [self._eval(arg, scope) for arg in get("args")]
            if isinstance(callee, _Function):
                return self._call(callee, args, node)
            if callable(callee):
                try:
                    return self._checked_value(callee(*args))
                except AksiRuntimeError:
                    raise
                except (TypeError, ValueError, OverflowError) as exc:
                    raise AksiRuntimeError(f"built-in call failed: {exc}") from exc
            raise AksiRuntimeError("attempted to call a non-function value")
        if kind == "Index":
            target = self._eval(get("target"), scope)
            index = self._eval(get("index"), scope)
            if type(index) is not int:
                raise AksiRuntimeError("array/string index must be an integer")
            if not isinstance(target, (list, str)):
                raise AksiRuntimeError("indexing is supported only for arrays and strings")
            try:
                return target[index]
            except IndexError as exc:
                raise AksiRuntimeError("index out of range") from exc
        if kind == "Block":
            return self._exec_block(node, _Scope(scope))
        if kind == "If":
            condition = self._eval(get("condition"), scope)
            if type(condition) is not bool:
                raise AksiRuntimeError("if condition must be Boolean")
            if condition:
                return self._exec_block(get("then"), _Scope(scope))
            otherwise = get("otherwise")
            if otherwise is not None:
                if self._op(otherwise) == "If":
                    return self._eval(otherwise, scope)
                return self._exec_block(otherwise, _Scope(scope))
            return None
        if kind == "While":
            iterations = 0
            while True:
                condition = self._eval(get("condition"), scope)
                if type(condition) is not bool:
                    raise AksiRuntimeError("while condition must be Boolean")
                if not condition:
                    break
                iterations += 1
                if iterations > self.max_steps:
                    raise AksiRuntimeError("loop iteration limit exceeded")
                try:
                    self._exec_block(get("body"), _Scope(scope))
                except _Continue:
                    continue
                except _Break:
                    break
            return None
        if kind == "For":
            iterable = self._eval(get("iterable"), scope)
            if not isinstance(iterable, (list, tuple, str, range)):
                raise AksiRuntimeError("for loop requires an array, tuple, string, or range")
            if len(iterable) > self.max_array_items:
                raise AksiRuntimeError("for loop iterable exceeds the configured item limit")
            for item in iterable:
                self._tick(node)
                local = _Scope(scope)
                local.define(get("name"), self._checked_value(item), False)
                try:
                    self._exec_block(get("body"), local)
                except _Continue:
                    continue
                except _Break:
                    break
            return None
        if kind == "Match":
            value = self._eval(get("value"), scope)
            for pattern, body in get("arms"):
                local = _Scope(scope)
                if self._match_pattern(pattern, value, local):
                    return self._exec_block(body, local)
            raise AksiRuntimeError("non-exhaustive match: no pattern matched the value")
        if kind == "Member":
            raise AksiRuntimeError("member access is not implemented by this runtime")
        raise AksiRuntimeError(f"unsupported TIR expression: {kind}")

    def _exec(self, node: IRNode, scope: _Scope) -> Any:
        self._tick(node)
        kind = self._op(node)
        get = node.get
        if kind == "Public":
            return self._exec(get("declaration"), scope)
        if kind == "Function":
            params = tuple(name for name, _type in get("parameters"))
            scope.define(get("name"), _Function(get("name"), params, get("body"), scope), False)
            return None
        if kind == "Binding":
            value_node = get("value")
            if value_node is None:
                raise AksiRuntimeError("uninitialized mutable bindings are not supported")
            value = self._eval(value_node, scope)
            scope.define(get("name"), self._checked_value(value), get("mode") == "mut")
            return None
        if kind == "Return":
            value_node = get("value")
            raise _Return(None if value_node is None else self._eval(value_node, scope))
        if kind == "Break":
            raise _Break()
        if kind == "Continue":
            raise _Continue()
        if kind == "ExpressionStatement":
            value = self._eval(get("expression"), scope)
            if value is not None:
                self._append_result(value)
            return value
        if kind in ("If", "While", "For", "Match"):
            return self._eval(node, scope)
        if kind == "Block":
            return self._exec_block(node, _Scope(scope))
        if kind == "TypeDeclaration":
            for variant_name, payload_types in get("variants", ()):
                scope.define(variant_name, _VariantConstructor(variant_name, len(payload_types)), False)
            return None
        if kind in ("StructDeclaration", "Import"):
            feature = "struct construction" if kind == "StructDeclaration" else "module loading"
            raise AksiRuntimeError(f"{feature} is not implemented by this runtime")
        raise AksiRuntimeError(f"unsupported TIR statement: {kind}")

    def run(self, module: IRModule) -> ExecutionResult:
        """Execute a validated IRModule; no source text or AST is consulted."""
        validate_tir(module)
        for declaration in module.nodes:
            self._exec(declaration, self.global_scope)
        return ExecutionResult(
            tuple(self.values), tuple(self.output), self.steps,
            tuple(self.capabilities_used), self.capability_calls,
            tuple(self.capability_trace),
        )
