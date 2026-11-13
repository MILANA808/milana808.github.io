#!/usr/bin/env python3
"""AKSI Q language v0.1 — a small, safe, deterministic interpreter.

The interpreter uses Python's AST only as a parser. It never calls eval/exec.
Quantum operations are classical state-vector simulations, not QPU execution.
"""
from __future__ import annotations

import ast
import cmath
import math
import random
import re
import sys
from pathlib import Path
from typing import Any

VERSION = "0.1.0"


class AksiError(Exception):
    """A source-level AKSI error."""


def _vector(value: Any, name: str = "vector") -> list[complex]:
    if not isinstance(value, (list, tuple)) or not value:
        raise AksiError(f"{name} must be a non-empty list")
    if len(value) > 4096:
        raise AksiError(f"{name} exceeds the 4096-element limit")
    out = [complex(x) for x in value]
    return out


def _safe_power(left: Any, right: Any) -> Any:
    if isinstance(right, (int, float)) and abs(right) > 1024:
        raise AksiError("power exponent is limited to |n| <= 1024")
    if isinstance(left, int) and isinstance(right, int) and right > 0:
        if abs(left).bit_length() * right > 100_000:
            raise AksiError("power result exceeds the integer-size budget")
    return left ** right


def _norm(values: Any) -> float:
    v = _vector(values)
    return math.sqrt(sum(abs(x) ** 2 for x in v))


def _normalize(values: Any) -> list[complex]:
    v = _vector(values)
    n = _norm(v)
    if n == 0:
        raise AksiError("cannot normalize a zero vector")
    return [x / n for x in v]


def _dot(left: Any, right: Any) -> complex:
    a, b = _vector(left, "left vector"), _vector(right, "right vector")
    if len(a) != len(b):
        raise AksiError("dot product requires vectors of equal length")
    return sum(x.conjugate() * y for x, y in zip(a, b))


def _tensor(left: Any, right: Any) -> list[complex]:
    a, b = _vector(left), _vector(right)
    if len(a) * len(b) > 65536:
        raise AksiError("tensor result exceeds the 65536-element limit")
    return [x * y for x in a for y in b]


def _probabilities(state: Any) -> list[float]:
    v = _vector(state, "state")
    total = sum(abs(x) ** 2 for x in v)
    if total <= 0:
        raise AksiError("quantum state has zero norm")
    return [float(abs(x) ** 2 / total) for x in v]


def _hadamard(state: Any) -> list[complex]:
    v = _vector(state, "state")
    if len(v) != 2:
        raise AksiError("h() in v0.1 accepts exactly one qubit (2 amplitudes)")
    a, b = v
    s = 1 / math.sqrt(2)
    return [(a + b) * s, (a - b) * s]


def _phase(state: Any, theta: Any) -> list[complex]:
    v = _vector(state, "state")
    if len(v) != 2:
        raise AksiError("phase() in v0.1 accepts exactly one qubit")
    return [v[0], v[1] * cmath.exp(1j * float(theta))]


def _measure(state: Any, shots: int = 1, seed: int = 0) -> Any:
    if not isinstance(shots, int) or shots < 1 or shots > 1_000_000:
        raise AksiError("measure() shots must be an integer from 1 to 1000000")
    probs = _probabilities(state)
    rng = random.Random(seed)
    labels = [format(i, f"0{max(1, (len(probs)-1).bit_length())}b") for i in range(len(probs))]
    counts = {label: 0 for label in labels}
    for _ in range(shots):
        draw = rng.random()
        acc = 0.0
        for label, probability in zip(labels, probs):
            acc += probability
            if draw < acc:
                counts[label] += 1
                break
    if shots == 1:
        return next((key for key, value in counts.items() if value), labels[-1])
    return {key: value for key, value in counts.items() if value}


def _format(value: Any) -> str:
    if isinstance(value, complex):
        if abs(value.imag) < 1e-12:
            return f"{value.real:g}"
        return f"{value.real:g}{value.imag:+g}i"
    if isinstance(value, list):
        return "[" + ", ".join(_format(x) for x in value) + "]"
    if isinstance(value, tuple):
        return "(" + ", ".join(_format(x) for x in value) + ")"
    return str(value)


class Runtime:
    def __init__(self) -> None:
        self.env: dict[str, Any] = {
            "pi": math.pi,
            "e": math.e,
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "exp": math.exp,
            "log": math.log,
            "abs": abs,
            "sum": sum,
            "len": len,
            "min": min,
            "max": max,
            "round": round,
            "complex": complex,
            "vector": lambda *xs: [*xs],
            "dot": _dot,
            "norm": _norm,
            "normalize": _normalize,
            "tensor": _tensor,
            "interfere": lambda a, b: [x + y for x, y in zip(_vector(a), _vector(b))]
            if len(_vector(a)) == len(_vector(b)) else (_ for _ in ()).throw(AksiError("interfere() requires equal vector lengths")),
            "probabilities": _probabilities,
            "h": _hadamard,
            "phase": _phase,
            "measure": _measure,
        }
        self.concepts: dict[str, str] = {}
        self.relations: list[tuple[str, str, str]] = []

    def expression(self, source: str) -> Any:
        if len(source) > 4096:
            raise AksiError("expression exceeds the 4096-character limit")
        try:
            tree = ast.parse(source, mode="eval")
            if sum(1 for _ in ast.walk(tree)) > 2048:
                raise AksiError("expression exceeds the syntax-node budget")
            node = tree.body
        except SyntaxError as exc:
            raise AksiError(f"syntax error: {exc.msg}") from exc
        return self._eval(node)

    def _eval(self, node: ast.AST) -> Any:
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (str, int, float, bool, type(None))):
                return node.value
            raise AksiError("unsupported literal")
        if isinstance(node, ast.Name):
            if node.id not in self.env:
                raise AksiError(f"unknown name: {node.id}")
            return self.env[node.id]
        if isinstance(node, ast.List):
            return [self._eval(x) for x in node.elts]
        if isinstance(node, ast.Tuple):
            return tuple(self._eval(x) for x in node.elts)
        if isinstance(node, ast.UnaryOp):
            value = self._eval(node.operand)
            if isinstance(node.op, ast.USub): return -value
            if isinstance(node.op, ast.UAdd): return +value
            if isinstance(node.op, ast.Not): return not value
            raise AksiError("unsupported unary operator")
        if isinstance(node, ast.BinOp):
            left, right = self._eval(node.left), self._eval(node.right)
            ops = {
                ast.Add: lambda: left + right,
                ast.Sub: lambda: left - right,
                ast.Mult: lambda: left * right,
                ast.Div: lambda: left / right,
                ast.FloorDiv: lambda: left // right,
                ast.Mod: lambda: left % right,
                ast.Pow: lambda: _safe_power(left, right),
            }
            for kind, operation in ops.items():
                if isinstance(node.op, kind):
                    try: return operation()
                    except (ArithmeticError, TypeError) as exc: raise AksiError(str(exc)) from exc
            raise AksiError("unsupported binary operator")
        if isinstance(node, ast.Compare):
            left = self._eval(node.left)
            for op, comparator in zip(node.ops, node.comparators):
                right = self._eval(comparator)
                checks = {
                    ast.Eq: lambda: left == right,
                    ast.NotEq: lambda: left != right,
                    ast.Lt: lambda: left < right,
                    ast.LtE: lambda: left <= right,
                    ast.Gt: lambda: left > right,
                    ast.GtE: lambda: left >= right,
                }
                check = next((fn for kind, fn in checks.items() if isinstance(op, kind)), None)
                if check is None or not check(): return False
                left = right
            return True
        if isinstance(node, ast.BoolOp):
            values = [bool(self._eval(x)) for x in node.values]
            return all(values) if isinstance(node.op, ast.And) else any(values)
        if isinstance(node, ast.Subscript):
            target, index = self._eval(node.value), self._eval(node.slice)
            return target[index]
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise AksiError("only direct calls to AKSI built-ins are allowed")
            fn = self.env.get(node.func.id)
            if not callable(fn):
                raise AksiError(f"unknown function: {node.func.id}")
            if any(keyword.arg is None for keyword in node.keywords):
                raise AksiError("argument unpacking is not supported")
            args = [self._eval(x) for x in node.args]
            kwargs = {x.arg: self._eval(x.value) for x in node.keywords}
            try: return fn(*args, **kwargs)
            except (TypeError, ValueError, ArithmeticError) as exc: raise AksiError(str(exc)) from exc
        raise AksiError(f"unsupported expression: {type(node).__name__}")

    def run_line(self, line: str, line_number: int = 1) -> Any:
        source = line.strip()
        if len(source) > 4096:
            raise AksiError(f"line {line_number}: source line exceeds the 4096-character limit")
        if not source or source.startswith("#"):
            return None
        try:
            if source.startswith("let "):
                match = re.fullmatch(r"let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)", source)
                if not match: raise AksiError("expected: let name = expression")
                name, expr = match.groups()
                if name in self.env and callable(self.env[name]):
                    raise AksiError(f"cannot replace built-in: {name}")
                self.env[name] = self.expression(expr)
                return None
            if source.startswith("print "):
                return self.expression(source[6:])
            if source.startswith("assert "):
                condition = self.expression(source[7:])
                if not condition: raise AksiError("assertion failed")
                return "PASS"
            if source.startswith("concept "):
                match = re.fullmatch(r'concept\s+(".*?"|\'.*?\')\s+means\s+(".*?"|\'.*?\')', source)
                if not match: raise AksiError('expected: concept "name" means "definition"')
                name, definition = (ast.literal_eval(x) for x in match.groups())
                self.concepts[name] = definition
                return None
            if source.startswith("relate "):
                match = re.fullmatch(r'relate\s+(".*?"|\'.*?\')\s*->\s*(".*?"|\'.*?\')\s+as\s+(".*?"|\'.*?\')', source)
                if not match: raise AksiError('expected: relate "subject" -> "object" as "relation"')
                subject, obj, relation = (ast.literal_eval(x) for x in match.groups())
                item = (subject, relation, obj)
                if item not in self.relations: self.relations.append(item)
                return None
            if source.startswith("ask "):
                name = ast.literal_eval(source[4:].strip())
                if name not in self.concepts: return f"Unknown concept: {name}"
                links = [f"{r}: {o}" for s, r, o in self.relations if s == name]
                suffix = ("; relations: " + ", ".join(links)) if links else ""
                return self.concepts[name] + suffix
            if source.startswith("infer "):
                name = ast.literal_eval(source[6:].strip())
                found, frontier, seen = [], [name], {name}
                while frontier:
                    current = frontier.pop(0)
                    for subject, relation, obj in self.relations:
                        if subject == current and relation == "is_a" and obj not in seen:
                            seen.add(obj); found.append(obj); frontier.append(obj)
                return found
            return self.expression(source)
        except AksiError as exc:
            raise AksiError(f"line {line_number}: {exc}") from exc

    def run(self, source: str) -> list[Any]:
        if len(source) > 1_000_000:
            raise AksiError("program exceeds the 1 MB source limit")
        lines = source.splitlines()
        if len(lines) > 10_000:
            raise AksiError("program exceeds the 10000-line limit")
        output = []
        for number, line in enumerate(lines, 1):
            result = self.run_line(line, number)
            if result is not None: output.append(result)
        return output


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args[0] in ("-h", "--help"):
        print("AKSI Q", VERSION)
        print("Usage: python aksi_q.py FILE.aksi")
        print("Statements: let, print, assert, concept, relate, ask, infer")
        return 0
    path = Path(args[0])
    try:
        source = path.read_text(encoding="utf-8")
        runtime = Runtime()
        for result in runtime.run(source):
            print(_format(result))
        print(f"[AKSI Q {VERSION}] completed")
        return 0
    except (OSError, AksiError) as exc:
        print(f"AKSI Q error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
