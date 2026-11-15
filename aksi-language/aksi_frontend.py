"""AKSI Q shared syntax parser (front-end milestone 0.1).

Parses declarations and structured control flow into immutable, source-spanned
syntax nodes. This module never evaluates programs or accesses host resources.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from aksi_lexer import LexError, Span, Token, lex


@dataclass(frozen=True, slots=True)
class Node:
    kind: str
    span: Span
    fields: tuple[tuple[str, Any], ...]

    def get(self, name: str, default: Any = None) -> Any:
        for key, value in self.fields:
            if key == name:
                return value
        return default


class ParseError(ValueError):
    def __init__(self, message: str, span: Span, *, expected: tuple[str, ...] = ()):
        super().__init__(f"{message} at {span.line}:{span.column}")
        self.message = message
        self.span = span
        self.expected = expected


class Parser:
    """Recursive-descent declaration parser with a Pratt expression parser."""

    PRECEDENCE = {
        "=": 1, "+=": 1, "-=": 1,
        "or": 2, "||": 2, "and": 3, "&&": 3,
        "==": 4, "!=": 4, "<": 4, "<=": 4, ">": 4, ">=": 4,
        "in": 4, "..": 5,
        "+": 6, "-": 6,
        "*": 7, "/": 7, "//": 7, "%": 7,
        "**": 8,
    }
    RIGHT_ASSOC = {"=", "+=", "-=", "**"}

    def __init__(self, source: str):
        self.source = source
        try:
            self.tokens = lex(source)
        except LexError:
            raise
        self.pos = 0

    def peek(self, offset: int = 0) -> Token:
        return self.tokens[min(self.pos + offset, len(self.tokens) - 1)]

    def take(self) -> Token:
        token = self.peek()
        if token.kind != "EOF":
            self.pos += 1
        return token

    def at(self, value: str) -> bool:
        return self.peek().value == value

    def accept(self, value: str) -> Token | None:
        if self.at(value):
            return self.take()
        return None

    def expect(self, value: str) -> Token:
        token = self.peek()
        if token.value != value:
            raise ParseError(f"expected {value!r}, found {token.value or 'end of file'!r}",
                             token.span, expected=(value,))
        return self.take()

    def expect_kind(self, kind: str, description: str) -> Token:
        token = self.peek()
        if token.kind != kind:
            raise ParseError(f"expected {description}", token.span, expected=(description,))
        return self.take()

    @staticmethod
    def node(kind: str, start: Span, end: Span, **fields: Any) -> Node:
        span = Span(start.start, end.end, start.line, start.column, end.end_line, end.end_column)
        return Node(kind, span, tuple(fields.items()))

    def skip_newlines(self) -> None:
        while self.peek().kind == "NEWLINE" or self.at(";"):
            self.take()

    def finish_statement(self) -> None:
        if self.peek().kind == "NEWLINE" or self.at(";"):
            self.skip_newlines()
        elif not self.at("}") and self.peek().kind != "EOF":
            token = self.peek()
            raise ParseError("expected a newline or ';' between statements", token.span,
                             expected=("newline", ";", "}"))

    def parse(self) -> Node:
        self.skip_newlines()
        start = self.peek().span
        module = None
        if self.at("module"):
            module_start = self.take()
            module = self.parse_path()
            self.finish_statement()
            start = module_start.span
        items = []
        while self.peek().kind != "EOF":
            items.append(self.parse_declaration())
            self.finish_statement()
        end = self.peek().span
        return self.node("Module", start, end, name=module, items=tuple(items))

    def parse_path(self) -> str:
        first = self.expect_kind("IDENT", "module name")
        parts = [first.value]
        while self.accept("."):
            parts.append(self.expect_kind("IDENT", "name after '.'").value)
        return ".".join(parts)

    def parse_declaration(self) -> Node:
        token = self.peek()
        if token.value == "pub":
            self.take()
            declaration = self.parse_declaration()
            return self.node("Public", token.span, declaration.span, declaration=declaration)
        if token.value == "fn":
            return self.parse_function()
        if token.value in ("let", "const", "mut"):
            return self.parse_binding()
        if token.value == "return":
            start = self.take()
            if self.peek().kind in ("NEWLINE", "EOF") or self.at(";") or self.at("}"):
                return self.node("Return", start.span, start.span, value=None)
            value = self.parse_expression()
            return self.node("Return", start.span, value.span, value=value)
        if token.value == "if":
            return self.parse_if()
        if token.value == "while":
            start = self.take()
            condition = self.parse_expression()
            body = self.parse_block()
            return self.node("While", start.span, body.span, condition=condition, body=body)
        if token.value == "break" or token.value == "continue":
            start = self.take()
            return self.node("Break" if start.value == "break" else "Continue", start.span, start.span)
        if token.value == "type":
            return self.parse_type_alias()
        expression = self.parse_expression()
        return self.node("ExpressionStatement", expression.span, expression.span, expression=expression)

    def parse_binding(self) -> Node:
        start = self.take()
        name = self.expect_kind("IDENT", "binding name")
        annotation = None
        if self.accept(":"):
            annotation = self.parse_type()
        value = None
        if self.accept("="):
            value = self.parse_expression()
        elif start.value != "mut":
            raise ParseError("immutable binding requires an initializer", name.span, expected=("=",))
        return self.node("Binding", start.span, (value or name).span,
                         mode=start.value, name=name.value, annotation=annotation, value=value)

    def parse_function(self) -> Node:
        start = self.expect("fn")
        name = self.expect_kind("IDENT", "function name")
        self.expect("(")
        params = []
        if not self.at(")"):
            while True:
                param = self.expect_kind("IDENT", "parameter name")
                self.expect(":")
                param_type = self.parse_type()
                params.append((param.value, param_type))
                if not self.accept(","):
                    break
                if self.at(")"):
                    break
        self.expect(")")
        result_type = None
        if self.accept("->"):
            result_type = self.parse_type()
        body = self.parse_block()
        return self.node("Function", start.span, body.span, name=name.value,
                         params=tuple(params), result_type=result_type, body=body)

    def parse_type_alias(self) -> Node:
        start = self.expect("type")
        name = self.expect_kind("IDENT", "type name")
        self.expect("=")
        variants = []
        while True:
            variant = self.expect_kind("IDENT", "type or variant name")
            args = []
            if self.accept("("):
                if not self.at(")"):
                    while True:
                        args.append(self.parse_type())
                        if not self.accept(","):
                            break
                self.expect(")")
            variants.append((variant.value, tuple(args)))
            if not self.accept("|"):
                break
        return self.node("TypeDeclaration", start.span, self.tokens[self.pos - 1].span,
                         name=name.value, variants=tuple(variants))

    def parse_type(self) -> Node:
        start = self.peek()
        if self.accept("["):
            item = self.parse_type()
            end = self.expect("]")
            return self.node("ArrayType", start.span, end.span, item=item)
        name = self.expect_kind("IDENT", "type name")
        args = []
        if self.accept("<"):
            while True:
                args.append(self.parse_type())
                if not self.accept(","):
                    break
            self.expect(">")
        end = self.tokens[self.pos - 1].span
        return self.node("NamedType", start.span, end, name=name.value, args=tuple(args))

    def parse_if(self) -> Node:
        start = self.expect("if")
        condition = self.parse_expression()
        then = self.parse_block()
        otherwise = None
        if self.accept("else"):
            if self.at("if"):
                otherwise = self.parse_if()
            else:
                otherwise = self.parse_block()
        return self.node("If", start.span, (otherwise or then).span,
                         condition=condition, then=then, otherwise=otherwise)

    def parse_block(self) -> Node:
        start = self.expect("{")
        self.skip_newlines()
        statements = []
        while not self.at("}") and self.peek().kind != "EOF":
            statements.append(self.parse_declaration())
            self.finish_statement()
        end = self.expect("}")
        return self.node("Block", start.span, end.span, statements=tuple(statements))

    def parse_expression(self, minimum: int = 0) -> Node:
        left = self.parse_prefix()
        while True:
            token = self.peek()
            operator = token.value
            precedence = self.PRECEDENCE.get(operator, -1)
            if precedence < minimum:
                break
            self.take()
            next_min = precedence if operator in self.RIGHT_ASSOC else precedence + 1
            right = self.parse_expression(next_min)
            left = self.node("Assignment" if precedence == 1 else "Binary",
                             left.span, right.span, operator=operator, left=left, right=right)
        return left

    def parse_prefix(self) -> Node:
        token = self.take()
        if token.value in ("-", "+", "!", "not"):
            value = self.parse_expression(9)
            return self.node("Unary", token.span, value.span, operator=token.value, value=value)
        if token.kind == "NUMBER":
            return self.node("Number", token.span, token.span, value=token.value)
        if token.kind == "STRING":
            return self.node("String", token.span, token.span, value=token.value)
        if token.value in ("true", "false", "null"):
            return self.node("Literal", token.span, token.span,
                             value={"true": True, "false": False, "null": None}[token.value])
        if token.kind == "IDENT":
            result = self.node("Name", token.span, token.span, value=token.value)
            return self.parse_postfix(result)
        if token.value == "(":
            expression = self.parse_expression()
            end = self.expect(")")
            return self.parse_postfix(self.node("Group", token.span, end.span, value=expression))
        if token.value == "[":
            items = []
            if not self.at("]"):
                while True:
                    items.append(self.parse_expression())
                    if not self.accept(","):
                        break
                    if self.at("]"):
                        break
            end = self.expect("]")
            return self.node("Array", token.span, end.span, items=tuple(items))
        raise ParseError(f"expected an expression, found {token.value or 'end of file'!r}", token.span)

    def parse_postfix(self, left: Node) -> Node:
        while True:
            if self.accept("("):
                args = []
                if not self.at(")"):
                    while True:
                        args.append(self.parse_expression())
                        if not self.accept(","):
                            break
                        if self.at(")"):
                            break
                end = self.expect(")")
                left = self.node("Call", left.span, end.span, callee=left, args=tuple(args))
            elif self.accept("."):
                member = self.expect_kind("IDENT", "member name")
                left = self.node("Member", left.span, member.span, target=left, name=member.value)
            elif self.accept("["):
                index = self.parse_expression()
                end = self.expect("]")
                left = self.node("Index", left.span, end.span, target=left, index=index)
            else:
                return left


def parse(source: str) -> Node:
    """Parse AKSI Q source into an immutable syntax tree."""
    return Parser(source).parse()
