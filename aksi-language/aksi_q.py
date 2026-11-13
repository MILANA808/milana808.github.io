#!/usr/bin/env python3
"""AKSI Q reference interpreter.

Expressions are tokenized and parsed by the native AKSI Pratt parser. The
runtime never calls Python eval or exec. Quantum operations are classical
state-vector simulations, not QPU execution.
"""
from __future__ import annotations

import cmath
import math
import random
import re
import sys
from pathlib import Path
from typing import Any

from aksi_parser import ParseError, decode_string, parse_expression

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
    _infer_qubits(v)
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



def _infer_qubits(state: Any) -> int:
    v = _vector(state, "quantum state")
    if len(v) < 2 or len(v) & (len(v) - 1):
        raise AksiError("multi-qubit state length must be a power of two")
    n = len(v).bit_length() - 1
    if n > 10:
        raise AksiError("state-vector simulator is limited to 10 qubits")
    return n


def _apply_single_gate(state: Any, target: int, matrix: tuple[complex, complex, complex, complex]) -> list[complex]:
    v = _vector(state, "quantum state")
    n = _infer_qubits(v)
    if not isinstance(target, int) or target < 0 or target >= n:
        raise AksiError(f"target qubit must be from 0 to {n-1}")
    u00, u01, u10, u11 = matrix
    out = v[:]
    bit = 1 << target
    for i in range(len(v)):
        if i & bit:
            continue
        j = i | bit
        a, b = v[i], v[j]
        out[i] = u00 * a + u01 * b
        out[j] = u10 * a + u11 * b
    return out


def _qstate(qubits: int = 1) -> list[complex]:
    if not isinstance(qubits, int) or qubits < 1 or qubits > 10:
        raise AksiError("qstate() supports 1 to 10 qubits")
    state = [0j] * (1 << qubits)
    state[0] = 1 + 0j
    return state


def _x_gate(state: Any, target: int = 0) -> list[complex]:
    return _apply_single_gate(state, target, (0j, 1+0j, 1+0j, 0j))


def _z_gate(state: Any, target: int = 0) -> list[complex]:
    return _apply_single_gate(state, target, (1+0j, 0j, 0j, -1+0j))


def _h_gate(state: Any, target: int | None = None) -> list[complex]:
    v = _vector(state, "state")
    if target is None:
        if len(v) != 2:
            raise AksiError("h(state) requires one qubit; use h(state, target) for a register")
        target = 0
    scale = 1 / math.sqrt(2)
    return _apply_single_gate(v, target, (scale, scale, scale, -scale))


def _phase_gate(state: Any, theta: Any, target: int | None = None) -> list[complex]:
    v = _vector(state, "state")
    if target is None:
        if len(v) != 2:
            raise AksiError("phase(state, angle) requires one qubit; use phase(state, angle, target) for a register")
        target = 0
    return _apply_single_gate(v, target, (1+0j, 0j, 0j, cmath.exp(1j * float(theta))))


def _cnot(state: Any, control: int, target: int) -> list[complex]:
    v = _vector(state, "state")
    n = _infer_qubits(v)
    if not all(isinstance(q, int) and 0 <= q < n for q in (control, target)):
        raise AksiError(f"control and target must be qubits from 0 to {n-1}")
    if control == target:
        raise AksiError("control and target qubits must differ")
    out = v[:]
    control_bit, target_bit = 1 << control, 1 << target
    for i in range(len(v)):
        if (i & control_bit) and not (i & target_bit):
            j = i | target_bit
            out[i], out[j] = v[j], v[i]
    return out


def _rx(state: Any, theta: Any, target: int = 0) -> list[complex]:
    c, s = math.cos(float(theta)/2), math.sin(float(theta)/2)
    return _apply_single_gate(state, target, (c, -1j*s, -1j*s, c))


def _ry(state: Any, theta: Any, target: int = 0) -> list[complex]:
    c, s = math.cos(float(theta)/2), math.sin(float(theta)/2)
    return _apply_single_gate(state, target, (c, -s, s, c))


def _rz(state: Any, theta: Any, target: int = 0) -> list[complex]:
    angle = float(theta)
    return _apply_single_gate(state, target, (cmath.exp(-1j*angle/2), 0j, 0j, cmath.exp(1j*angle/2)))

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


def _quoted_value(source: str) -> str:
    try:
        return decode_string(source)
    except ParseError as exc:
        raise AksiError(str(exc)) from exc


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
            "h": _h_gate,
            "phase": _phase_gate,
            "qstate": _qstate,
            "x": _x_gate,
            "z": _z_gate,
            "cnot": _cnot,
            "rx": _rx,
            "ry": _ry,
            "rz": _rz,
            "measure": _measure,
        }
        self.concepts: dict[str, str] = {}
        self.relations: list[tuple[str, str, str]] = []

    def expression(self, source: str) -> Any:
        if len(source) > 4096:
            raise AksiError("expression exceeds the 4096-character limit")
        return parse_expression(source, self.env, AksiError)

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
                name, definition = (_quoted_value(x) for x in match.groups())
                self.concepts[name] = definition
                return None
            if source.startswith("relate "):
                match = re.fullmatch(r'relate\s+(".*?"|\'.*?\')\s*->\s*(".*?"|\'.*?\')\s+as\s+(".*?"|\'.*?\')', source)
                if not match: raise AksiError('expected: relate "subject" -> "object" as "relation"')
                subject, obj, relation = (_quoted_value(x) for x in match.groups())
                item = (subject, relation, obj)
                if item not in self.relations: self.relations.append(item)
                return None
            if source.startswith("ask "):
                name = _quoted_value(source[4:].strip())
                if name not in self.concepts: return f"Unknown concept: {name}"
                links = [f"{r}: {o}" for s, r, o in self.relations if s == name]
                suffix = ("; relations: " + ", ".join(links)) if links else ""
                return self.concepts[name] + suffix
            if source.startswith("infer "):
                name = _quoted_value(source[6:].strip())
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
