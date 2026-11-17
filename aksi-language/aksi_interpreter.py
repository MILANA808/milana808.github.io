"""Bounded interpreter for the executable AKSI Q AST subset.

No host capability is available by default. Explicitly injected handlers are
trusted host code; no ambient filesystem, network, process, or browser access
is exposed by the language runtime itself.
"""
from __future__ import annotations

from dataclasses import dataclass
import argparse
from copy import deepcopy
import re
import json
import math
from pathlib import Path
import sys
from typing import Any, Callable

from aksi_frontend import Node, ParseError, parse
from aksi_lexer import LexError
from aksi_analyze import analyze_source


VERSION = "0.1.0"
MAX_STEPS = 100_000
MAX_CALL_DEPTH = 64
MAX_ARRAY_ITEMS = 10_000
MAX_STRING_CHARS = 65_536
MAX_INTEGER_BITS = 100_000
MAX_OUTPUT_CHARS = 1_000_000
MAX_OUTPUT_LINES = 10_000
MAX_RESULT_ITEMS = 10_000
MAX_CAPABILITY_CALLS = 128


class AksiRuntimeError(RuntimeError):
    """A bounded, source-level AKSI Q execution error."""


@dataclass(frozen=True, slots=True)
class ExecutionResult:
    values: tuple[Any, ...]
    output: tuple[str, ...]
    steps: int
    capabilities_used: tuple[str, ...] = ()
    capability_calls: int = 0
    capability_trace: tuple[tuple[int, str, str], ...] = ()


@dataclass(slots=True)
class _Binding:
    value: Any
    mutable: bool


class _Return(Exception):
    def __init__(self, value: Any):
        super().__init__(value)
        self.value = value


class _Break(Exception):
    pass


class _Continue(Exception):
    pass


class _Scope:
    def __init__(self, parent: "_Scope | None" = None):
        self.parent = parent
        self.values: dict[str, _Binding] = {}

    def define(self, name: str, value: Any, mutable: bool) -> None:
        if name in self.values:
            raise AksiRuntimeError(f"duplicate runtime binding: {name}")
        self.values[name] = _Binding(value, mutable)

    def find(self, name: str) -> _Binding:
        scope: _Scope | None = self
        while scope is not None:
            if name in scope.values:
                return scope.values[name]
            scope = scope.parent
        raise AksiRuntimeError(f"unknown name: {name}")

    def assign(self, name: str, value: Any) -> None:
        binding = self.find(name)
        if not binding.mutable:
            raise AksiRuntimeError(f"cannot assign immutable binding: {name}")
        binding.value = value


@dataclass(frozen=True, slots=True)
class _Function:
    name: str
    params: tuple[str, ...]
    body: Node
    closure: _Scope


class Interpreter:
    """Execute only the explicitly implemented AKSI Q AST subset."""

    def __init__(self, *, max_steps: int = MAX_STEPS,
                 max_call_depth: int = MAX_CALL_DEPTH,
                 max_array_items: int = MAX_ARRAY_ITEMS,
                 max_output_chars: int = MAX_OUTPUT_CHARS,
                 max_output_lines: int = MAX_OUTPUT_LINES,
                 max_result_items: int = MAX_RESULT_ITEMS,
                 max_capability_calls: int = MAX_CAPABILITY_CALLS,
                 capabilities: dict[str, Callable[..., Any]] | None = None):
        limits = (max_steps, max_call_depth, max_array_items, max_output_chars,
                  max_output_lines, max_result_items, max_capability_calls)
        if any(limit < 1 for limit in limits):
            raise ValueError("execution limits must be positive")
        self.max_steps = max_steps
        self.max_call_depth = max_call_depth
        self.max_array_items = max_array_items
        self.max_output_chars = max_output_chars
        self.max_output_lines = max_output_lines
        self.max_result_items = max_result_items
        self.max_capability_calls = max_capability_calls
        self.capability_calls = 0
        self.output_chars = 0
        self.steps = 0
        self.call_depth = 0
        self.output: list[str] = []
        self.values: list[Any] = []
        self.global_scope = _Scope()
        self.capabilities = self._validate_capabilities({} if capabilities is None else capabilities)
        self.capabilities_used: list[str] = []
        self.capability_trace: list[tuple[int, str, str]] = []
        self._install_builtins()

    @staticmethod
    def _validate_capabilities(capabilities: dict[str, Callable[..., Any]]) -> dict[str, Callable[..., Any]]:
        if not isinstance(capabilities, dict) or len(capabilities) > 32:
            raise ValueError("capabilities must be a dictionary with at most 32 entries")
        validated: dict[str, Callable[..., Any]] = {}
        for name, handler in capabilities.items():
            if not isinstance(name, str) or not re.fullmatch(r"[a-z][a-z0-9_.-]{0,63}", name):
                raise ValueError("invalid capability identifier")
            if not callable(handler):
                raise ValueError(f"capability '{name}' must be callable")
            validated[name] = handler
        return validated

    def grant_capability(self, name: str, handler: Callable[..., Any]) -> None:
        """Grant one capability; an existing grant cannot be silently replaced."""
        validated = self._validate_capabilities({name: handler})
        if name in self.capabilities:
            raise ValueError(f"capability '{name}' is already granted")
        self.capabilities[name] = validated[name]

    def revoke_capability(self, name: str) -> bool:
        """Revoke a grant immediately. Returns False when it was not granted."""
        if not isinstance(name, str):
            raise TypeError("capability name must be text")
        return self.capabilities.pop(name, None) is not None

    def _record_capability_event(self, name: str, status: str) -> None:
        self.capability_trace.append((len(self.capability_trace) + 1, name, status))

    @classmethod
    def _validate_host_value(cls, value: Any, *, depth: int = 0) -> Any:
        if depth > 16:
            raise AksiRuntimeError("host capability value nesting limit exceeded")
        if value is None or type(value) is bool:
            return value
        if type(value) is int:
            if value.bit_length() > MAX_INTEGER_BITS:
                raise AksiRuntimeError("host capability integer exceeds runtime size limit")
            return value
        if type(value) is float:
            if not math.isfinite(value):
                raise AksiRuntimeError("host capability returned a non-finite float")
            return value
        if isinstance(value, str):
            if len(value) > MAX_STRING_CHARS:
                raise AksiRuntimeError("host capability string exceeds runtime size limit")
            return value
        if isinstance(value, list) and len(value) <= MAX_ARRAY_ITEMS:
            return [cls._validate_host_value(item, depth=depth + 1) for item in value]
        raise AksiRuntimeError("host capabilities accept and return only bounded scalar/list values")

    def _host_call(self, name: Any, args: Any) -> Any:
        if not isinstance(name, str) or not re.fullmatch(r"[a-z][a-z0-9_.-]{0,63}", name):
            raise AksiRuntimeError("invalid host capability identifier")
        if not isinstance(args, list) or len(args) > 64:
            raise AksiRuntimeError("host_call expects an argument array with at most 64 items")
        handler = self.capabilities.get(name)
        if handler is None:
            self._record_capability_event(name, "denied")
            raise AksiRuntimeError(f"host capability denied: {name}")
        if self.capability_calls >= self.max_capability_calls:
            self._record_capability_event(name, "limit_denied")
            raise AksiRuntimeError("host capability invocation limit exceeded")
        safe_args = self._validate_host_value(args)
        self.capability_calls += 1
        self._record_capability_event(name, "invoked")
        try:
            result = handler(*deepcopy(safe_args))
        except Exception as exc:
            self._record_capability_event(name, "failed")
            raise AksiRuntimeError(f"host capability '{name}' failed: {type(exc).__name__}") from exc
        try:
            safe_result = self._validate_host_value(result)
            checked_result = self._checked_value(safe_result)
        except AksiRuntimeError:
            self._record_capability_event(name, "rejected_result")
            raise
        self.capabilities_used.append(name)
        self._record_capability_event(name, "returned")
        return checked_result

    def _install_builtins(self) -> None:
        def emit(value: Any = None) -> None:
            if len(self.output) >= self.max_output_lines:
                raise AksiRuntimeError("output line limit exceeded")
            remaining = self.max_output_chars - self.output_chars
            rendered = self._format(value, max_chars=remaining)
            self.output.append(rendered)
            self.output_chars += len(rendered)
            return None

        def checked_range(*args: Any) -> range:
            if not 1 <= len(args) <= 3 or any(type(x) is not int for x in args):
                raise AksiRuntimeError("range() expects 1 to 3 integer arguments")
            result = range(*args)
            if len(result) > self.max_steps:
                raise AksiRuntimeError("range() exceeds the execution budget")
            return result

        builtins: dict[str, Callable[..., Any]] = {
            "print": emit,
            "host_call": self._host_call,
            "assert": self._assert,
            "abs": abs,
            "min": min,
            "max": max,
            "sum": sum,
            "len": len,
            "round": round,
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "exp": math.exp,
            "log": math.log,
            "floor": math.floor,
            "ceil": math.ceil,
            "range": checked_range,
        }
        self.global_scope.values.update(
            {name: _Binding(function, False) for name, function in builtins.items()}
        )

    @staticmethod
    def _assert(condition: Any, message: Any = "assertion failed") -> None:
        if not condition:
            raise AksiRuntimeError(str(message))
        return None

    def _tick(self, node: Node | None = None) -> None:
        self.steps += 1
        if self.steps > self.max_steps:
            location = f" at {node.span.line}:{node.span.column}" if node else ""
            raise AksiRuntimeError(f"instruction budget exceeded{location}")

    @staticmethod
    def _format(value: Any, *, max_chars: int = MAX_OUTPUT_CHARS,
                depth: int = 0) -> str:
        if max_chars < 0:
            raise AksiRuntimeError("output character limit exceeded")
        if depth > 32:
            raise AksiRuntimeError("output nesting depth limit exceeded")
        if isinstance(value, bool):
            rendered = "true" if value else "false"
        elif value is None:
            rendered = "null"
        elif isinstance(value, _Function):
            rendered = f"<function {value.name}>"
        elif isinstance(value, list):
            parts: list[str] = []
            used = 2  # brackets
            for item in value:
                remaining = max_chars - used - (2 if parts else 0)
                if remaining < 1:
                    raise AksiRuntimeError("output character limit exceeded")
                part = Interpreter._format(item, max_chars=remaining, depth=depth + 1)
                parts.append(part)
                used += len(part) + (2 if len(parts) > 1 else 0)
            rendered = "[" + ", ".join(parts) + "]"
        else:
            rendered = str(value)
        if len(rendered) > max_chars:
            raise AksiRuntimeError("output character limit exceeded")
        return rendered

    def _append_result(self, value: Any) -> None:
        if len(self.values) >= self.max_result_items:
            raise AksiRuntimeError("expression result item limit exceeded")
        self.values.append(self._checked_value(value))

    @staticmethod
    def _number(value: Any) -> bool:
        return type(value) in (int, float)

    def _checked_value(self, value: Any) -> Any:
        if isinstance(value, str) and len(value) > MAX_STRING_CHARS:
            raise AksiRuntimeError("string exceeds the 65536-character runtime limit")
        if isinstance(value, list) and len(value) > self.max_array_items:
            raise AksiRuntimeError("array exceeds the configured item limit")
        if type(value) is int and value.bit_length() > MAX_INTEGER_BITS:
            raise AksiRuntimeError("integer exceeds the runtime size limit")
        if isinstance(value, float) and not math.isfinite(value):
            raise AksiRuntimeError("non-finite floating-point result")
        return value

    def _eval(self, node: Node, scope: _Scope) -> Any:
        self._tick(node)
        kind = node.kind
        get = node.get

        if kind == "Number":
            raw = get("value")
            value = float(raw) if any(c in raw for c in ".eE") else int(raw)
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
                        if left.bit_length() * right > MAX_INTEGER_BITS:
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
            if target.kind != "Name":
                raise AksiRuntimeError("only named bindings can be assigned")
            name = target.get("value")
            right = self._eval(get("right"), scope)
            operator = get("operator")
            if operator == "+=":
                current = scope.find(name).value
                right = self._eval_binary_value("+", current, right)
            elif operator == "-=":
                current = scope.find(name).value
                right = self._eval_binary_value("-", current, right)
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
                if otherwise.kind == "If":
                    return self._exec(otherwise, scope)
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
        if kind == "Call":
            raise AksiRuntimeError("invalid call node")
        if kind in ("Member",):
            raise AksiRuntimeError("member access is not implemented by this runtime")
        raise AksiRuntimeError(f"unsupported AST node: {kind}")

    def _eval_binary_value(self, operator: str, left: Any, right: Any) -> Any:
        if operator == "+" and self._number(left) and self._number(right):
            return self._checked_value(left + right)
        if operator == "-" and self._number(left) and self._number(right):
            return self._checked_value(left - right)
        raise AksiRuntimeError(f"operator {operator!r} requires numeric operands")

    def _exec_block(self, block: Node, scope: _Scope) -> Any:
        result = None
        for statement in block.get("statements"):
            result = self._exec(statement, scope)
        return result

    def _exec(self, node: Node, scope: _Scope) -> Any:
        self._tick(node)
        kind = node.kind
        get = node.get
        if kind == "Public":
            return self._exec(get("declaration"), scope)
        if kind == "Function":
            params = tuple(name for name, _type in get("params"))
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
        if kind == "If" or kind == "While":
            return self._eval(node, scope)
        if kind == "Block":
            return self._exec_block(node, _Scope(scope))
        if kind == "TypeDeclaration":
            raise AksiRuntimeError("algebraic type declarations are not executable in runtime 0.1")
        raise AksiRuntimeError(f"unsupported statement: {kind}")

    def _call(self, function: _Function, args: list[Any], call_node: Node) -> Any:
        if len(args) != len(function.params):
            raise AksiRuntimeError(
                f"{function.name} expects {len(function.params)} arguments, got {len(args)}"
            )
        if self.call_depth >= self.max_call_depth:
            raise AksiRuntimeError("function call depth limit exceeded")
        local = _Scope(function.closure)
        for name, value in zip(function.params, args):
            local.define(name, value, False)
        self.call_depth += 1
        try:
            try:
                self._exec_block(function.body, local)
            except _Return as returned:
                return self._checked_value(returned.value)
            return None
        finally:
            self.call_depth -= 1

    def run(self, source: str, *, analyze: bool = True) -> ExecutionResult:
        if not isinstance(source, str):
            raise TypeError("AKSI source must be text")
        if analyze:
            result = analyze_source(source)
            if not result.ok:
                first = result.diagnostics[0]
                raise AksiRuntimeError(
                    f"static analysis failed at {first.line}:{first.column}: "
                    f"{first.code}: {first.message}"
                )
        module = parse(source)
        for declaration in module.get("items"):
            self._exec(declaration, self.global_scope)
        return ExecutionResult(tuple(self.values), tuple(self.output), self.steps,
                               tuple(self.capabilities_used), self.capability_calls,
                               tuple(self.capability_trace))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=f"AKSI Q AST interpreter {VERSION}")
    parser.add_argument("file", type=Path, help="AKSI Q source file")
    parser.add_argument("--max-steps", type=int, default=MAX_STEPS)
    parser.add_argument("--no-analysis", action="store_true",
                        help="skip static analysis (not recommended)")
    parser.add_argument("--json", action="store_true", help="emit JSON result")
    args = parser.parse_args(argv)
    try:
        source = args.file.read_text(encoding="utf-8")
        result = Interpreter(max_steps=args.max_steps).run(
            source, analyze=not args.no_analysis
        )
    except (OSError, LexError, ParseError, AksiRuntimeError, ValueError) as exc:
        print(f"AKSI Q runtime error: {exc}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps({
            "schema": "AKSI-Q-EXECUTION/1",
            "version": VERSION,
            "output": list(result.output),
            "values": list(result.values),
            "steps": result.steps,
            "capabilities_used": list(result.capabilities_used),
            "capability_calls": result.capability_calls,
            "capability_trace": [
                {"sequence": seq, "capability": name, "status": status}
                for seq, name, status in result.capability_trace
            ],
        }, ensure_ascii=False, indent=2))
    else:
        for item in result.output:
            print(item)
        for value in result.values:
            print(Interpreter._format(value))
        print(f"[AKSI Q AST runtime {VERSION}] completed in {result.steps} steps")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
