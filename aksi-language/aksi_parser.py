"""Native AKSI Q expression lexer and Pratt parser.

No Python AST or eval is used. This parser implements the documented expression
subset and evaluates only values/functions supplied by the AKSI runtime.
"""
from __future__ import annotations

import re
from typing import Any, Callable


class ParseError(Exception):
    pass


TOKEN = re.compile(
    r"\s+|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?"
    r'|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\''
    r"|[A-Za-z_][A-Za-z0-9_]*|\*\*|//|==|!=|<=|>=|[+\-*/%<>()\[\],=]"
)


def decode_string(token: str) -> str:
    quote = token[0]
    body = token[1:-1]
    out: list[str] = []
    i = 0
    escapes = {"n": "\n", "r": "\r", "t": "\t", "\\": "\\", "'": "'", '"': '"', "0": "\0"}
    while i < len(body):
        ch = body[i]
        if ch != "\\":
            out.append(ch)
            i += 1
            continue
        i += 1
        if i >= len(body):
            raise ParseError("unfinished string escape")
        esc = body[i]
        if esc in escapes:
            out.append(escapes[esc])
            i += 1
        elif esc in ("u", "x"):
            count = 4 if esc == "u" else 2
            digits = body[i + 1:i + 1 + count]
            if len(digits) != count or not re.fullmatch(r"[0-9a-fA-F]+", digits):
                raise ParseError("invalid hexadecimal string escape")
            out.append(chr(int(digits, 16)))
            i += count + 1
        else:
            raise ParseError(f"unsupported string escape: \\{esc}")
    return "".join(out)


class ExpressionParser:
    PRECEDENCE = {
        "or": 1, "and": 2,
        "==": 3, "!=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3,
        "+": 4, "-": 4,
        "*": 5, "/": 5, "//": 5, "%": 5,
        "**": 6,
    }
    COMPARISONS = {"==", "!=", "<", "<=", ">", ">="}

    def __init__(self, source: str, env: dict[str, Any], error_type: type[Exception]):
        self.source = source
        self.env = env
        self.error_type = error_type
        self.tokens = self._tokenize(source)
        self.pos = 0

    def fail(self, message: str):
        raise self.error_type(message)

    def _tokenize(self, source: str) -> list[str]:
        tokens = []
        pos = 0
        while pos < len(source):
            match = TOKEN.match(source, pos)
            if not match:
                self.fail(f"unexpected character at column {pos + 1}")
            token = match.group(0)
            pos = match.end()
            if not token.isspace():
                tokens.append(token)
        if len(tokens) > 2048:
            self.fail("expression exceeds the 2048-token budget")
        tokens.append("<EOF>")
        return tokens

    def peek(self) -> str:
        return self.tokens[self.pos]

    def take(self) -> str:
        token = self.peek()
        self.pos += 1
        return token

    def expect(self, token: str):
        if self.take() != token:
            self.fail(f"expected {token}")

    def parse(self) -> Any:
        if self.peek() == "<EOF>":
            self.fail("empty expression")
        value = self.expression(0)
        if self.peek() != "<EOF>":
            self.fail(f"unexpected token: {self.peek()}")
        return value

    def expression(self, minimum: int) -> Any:
        left = self.prefix()
        while True:
            token = self.peek()
            # Postfix calls and indexing bind more tightly than all operators.
            if token == "(":
                if 8 < minimum:
                    break
                left = self.call(left)
                continue
            if token == "[":
                if 8 < minimum:
                    break
                self.take()
                index = self.expression(0)
                self.expect("]")
                try:
                    left = left[index]
                except (IndexError, KeyError, TypeError) as exc:
                    self.fail(str(exc))
                continue
            precedence = self.PRECEDENCE.get(token, -1)
            if precedence < minimum:
                break
            self.take()
            if token in self.COMPARISONS:
                right = self.expression(precedence + 1)
                result = self._compare(token, left, right)
                left = right
                while self.peek() in self.COMPARISONS:
                    op = self.take()
                    rhs = self.expression(precedence + 1)
                    result = result and self._compare(op, left, rhs)
                    left = rhs
                left = result
                continue
            next_minimum = precedence if token == "**" else precedence + 1
            right = self.expression(next_minimum)
            left = self._binary(token, left, right)
        return left

    def prefix(self) -> Any:
        token = self.take()
        if token in ("+", "-", "not"):
            value = self.expression(6 if token in ("+", "-") else 3)
            try:
                return +value if token == "+" else -value if token == "-" else not bool(value)
            except TypeError as exc:
                self.fail(str(exc))
        if token == "(":
            first = self.expression(0)
            if self.peek() == ",":
                values = [first]
                while self.peek() == ",":
                    self.take()
                    if self.peek() == ")":
                        break
                    values.append(self.expression(0))
                self.expect(")")
                return tuple(values)
            self.expect(")")
            return first
        if token == "[":
            values = []
            if self.peek() != "]":
                while True:
                    values.append(self.expression(0))
                    if self.peek() != ",":
                        break
                    self.take()
                    if self.peek() == "]":
                        break
            self.expect("]")
            return values
        if token.startswith(('"', "'")):
            try:
                return decode_string(token)
            except ParseError as exc:
                self.fail(str(exc))
        if re.fullmatch(r"(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?", token):
            return float(token) if any(ch in token for ch in ".eE") else int(token)
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", token):
            literals = {"true": True, "false": False, "null": None, "none": None}
            key = token.lower()
            if key in literals:
                return literals[key]
            if token not in self.env:
                self.fail(f"unknown name: {token}")
            return self.env[token]
        self.fail(f"unexpected token: {token}")

    def call(self, function: Any) -> Any:
        if not callable(function):
            self.fail("only registered AKSI built-ins can be called")
        self.expect("(")
        args = []
        kwargs = {}
        if self.peek() != ")":
            while True:
                if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", self.peek()) and self.tokens[self.pos + 1] == "=":
                    name = self.take()
                    self.take()
                    if name in kwargs:
                        self.fail(f"duplicate keyword argument: {name}")
                    kwargs[name] = self.expression(0)
                else:
                    args.append(self.expression(0))
                if self.peek() != ",":
                    break
                self.take()
                if self.peek() == ")":
                    break
        self.expect(")")
        try:
            return function(*args, **kwargs)
        except (TypeError, ValueError, ArithmeticError) as exc:
            self.fail(str(exc))

    def _compare(self, op: str, left: Any, right: Any) -> bool:
        try:
            return {
                "==": lambda: left == right,
                "!=": lambda: left != right,
                "<": lambda: left < right,
                "<=": lambda: left <= right,
                ">": lambda: left > right,
                ">=": lambda: left >= right,
            }[op]()
        except TypeError as exc:
            self.fail(str(exc))

    def _binary(self, op: str, left: Any, right: Any) -> Any:
        try:
            if op == "**":
                if isinstance(right, (int, float)) and abs(right) > 1024:
                    self.fail("power exponent is limited to |n| <= 1024")
                if isinstance(left, int) and isinstance(right, int) and right > 0:
                    if abs(left).bit_length() * right > 100_000:
                        self.fail("power result exceeds the integer-size budget")
            operations: dict[str, Callable[[], Any]] = {
                "+": lambda: left + right,
                "-": lambda: left - right,
                "*": lambda: left * right,
                "/": lambda: left / right,
                "//": lambda: left // right,
                "%": lambda: left % right,
                "**": lambda: left ** right,
                "and": lambda: bool(left) and bool(right),
                "or": lambda: bool(left) or bool(right),
            }
            return operations[op]()
        except (ArithmeticError, TypeError) as exc:
            self.fail(str(exc))


def parse_expression(source: str, env: dict[str, Any], error_type: type[Exception]) -> Any:
    return ExpressionParser(source, env, error_type).parse()
