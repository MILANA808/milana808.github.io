"""Source-positioned lexer foundation for the AKSI Q unified front end.

This module only tokenizes source. It does not execute code or grant capabilities.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
import re

MAX_SOURCE_CHARS = 1_000_000
MAX_TOKENS = 100_000
MAX_IDENTIFIER_CHARS = 128
MAX_STRING_CHARS = 65_536

KEYWORDS = frozenset({
    "module", "import", "type", "fn", "let", "mut", "const", "return",
    "if", "else", "match", "while", "for", "in", "break", "continue",
    "true", "false", "null", "and", "or", "not", "as", "pub", "use",
    "ui", "page", "state", "capability", "task", "uses", "struct",
})
OPERATORS = (
    "->", "=>", "==", "!=", "<=", ">=", "&&", "||", "::", "..",
    "+=", "-=", "*=", "/=", "**", "//",
)
SINGLE = frozenset("()[]{}.,:;?")
SINGLE_OPERATORS = frozenset("+-*/%=<>!&|^~")
NUMBER_RE = re.compile(r"(?:\d+\.(?!\.)\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?")
IDENT_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


@dataclass(frozen=True, slots=True)
class Span:
    start: int
    end: int
    line: int
    column: int
    end_line: int
    end_column: int


@dataclass(frozen=True, slots=True)
class Token:
    kind: str
    value: str
    span: Span


class LexError(ValueError):
    def __init__(self, message: str, span: Span):
        super().__init__(f"{message} at {span.line}:{span.column}")
        self.message = message
        self.span = span


def _decode_string(raw: str, span: Span) -> str:
    if raw[0] == '"':
        try:
            value = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise LexError("invalid string escape", span) from exc
    else:
        body = raw[1:-1]
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
                raise LexError("unfinished string escape", span)
            esc = body[i]
            if esc in escapes:
                out.append(escapes[esc])
                i += 1
            elif esc in ("u", "x"):
                width = 4 if esc == "u" else 2
                digits = body[i + 1:i + 1 + width]
                if len(digits) != width or not re.fullmatch(r"[0-9a-fA-F]+", digits):
                    raise LexError("invalid hexadecimal string escape", span)
                out.append(chr(int(digits, 16)))
                i += width + 1
            else:
                raise LexError(f"unsupported string escape: \\{esc}", span)
        value = "".join(out)
    if len(value) > MAX_STRING_CHARS:
        raise LexError("string exceeds the 65536-character limit", span)
    return value


def lex(source: str, *, include_newlines: bool = True) -> list[Token]:
    if not isinstance(source, str):
        raise TypeError("AKSI source must be text")
    if len(source) > MAX_SOURCE_CHARS:
        raise ValueError("AKSI source exceeds the 1 MB limit")

    tokens: list[Token] = []
    i = 0
    line = 1
    column = 1
    length = len(source)

    def span(start: int, end: int, start_line: int, start_col: int,
             end_line: int | None = None, end_col: int | None = None) -> Span:
        if end_line is None or end_col is None:
            end_line, end_col = start_line, start_col
            for ch in source[start:end]:
                if ch == "\n":
                    end_line += 1
                    end_col = 1
                else:
                    end_col += 1
        return Span(start, end, start_line, start_col, end_line, end_col)

    def emit(kind: str, value: str, start: int, start_line: int, start_col: int) -> None:
        tokens.append(Token(kind, value, span(start, i, start_line, start_col, line, column)))
        if len(tokens) > MAX_TOKENS:
            raise LexError("token budget exceeded", tokens[-1].span)

    while i < length:
        ch = source[i]
        if ch in " \t\r":
            i += 1
            column += 1
            continue
        if ch == "\n":
            start, start_line, start_col = i, line, column
            i += 1
            line += 1
            column = 1
            if include_newlines:
                emit("NEWLINE", "\n", start, start_line, start_col)
            continue
        if ch == "#":
            while i < length and source[i] != "\n":
                i += 1
                column += 1
            continue

        start, start_line, start_col = i, line, column
        if ch in ('"', "'"):
            quote = ch
            i += 1
            column += 1
            escaped = False
            while i < length:
                current = source[i]
                if current == "\n" and not escaped:
                    raise LexError("newline in string literal", span(start, i, start_line, start_col))
                i += 1
                column += 1
                if escaped:
                    escaped = False
                elif current == "\\":
                    escaped = True
                elif current == quote:
                    break
            else:
                raise LexError("unterminated string literal", span(start, length, start_line, start_col))
            raw = source[start:i]
            token_span = span(start, i, start_line, start_col)
            value = _decode_string(raw, token_span)
            emit("STRING", value, start, start_line, start_col)
            continue

        number = NUMBER_RE.match(source, i)
        if number:
            i = number.end()
            column += i - start
            if i < length and source[i] in "eE":
                bad_end = i + 1
                if bad_end < length and source[bad_end] in "+-":
                    bad_end += 1
                while bad_end < length and source[bad_end].isdigit():
                    bad_end += 1
                raise LexError("malformed numeric exponent", span(start, bad_end, start_line, start_col))
            emit("NUMBER", number.group(0), start, start_line, start_col)
            continue

        ident = IDENT_RE.match(source, i)
        if ident:
            value = ident.group(0)
            if len(value) > MAX_IDENTIFIER_CHARS:
                raise LexError("identifier exceeds the 128-character limit", span(start, ident.end(), start_line, start_col))
            i = ident.end()
            column += i - start
            emit("KEYWORD" if value in KEYWORDS else "IDENT", value, start, start_line, start_col)
            continue

        operator = next((op for op in OPERATORS if source.startswith(op, i)), None)
        if operator:
            i += len(operator)
            column += len(operator)
            emit("OP", operator, start, start_line, start_col)
            continue
        if ch in SINGLE_OPERATORS:
            i += 1
            column += 1
            emit("OP", ch, start, start_line, start_col)
            continue
        if ch in SINGLE:
            i += 1
            column += 1
            emit("PUNCT", ch, start, start_line, start_col)
            continue

        raise LexError(f"unexpected character {ch!r}", span(start, start + 1, start_line, start_col))

    eof_span = Span(length, length, line, column, line, column)
    tokens.append(Token("EOF", "", eof_span))
    return tokens
