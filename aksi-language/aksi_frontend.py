"""AKSI Q shared syntax parser (front-end milestone 0.1).

Parses declarations and structured control flow into immutable, source-spanned
syntax nodes. This module never evaluates programs or accesses host resources.
"""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Any

from aksi_lexer import LexError, Span, Token, lex


@dataclass(frozen=True, slots=True)
class Node:
    kind: str
    span: Span
    fields: tuple[tuple[str, Any], ...]
    node_id: str

    def get(self, name: str, default: Any = None) -> Any:
        for key, value in self.fields:
            if key == name:
                return value
        return default

    def to_dict(self) -> dict[str, Any]:
        """Return the versioned, JSON-compatible representation of this AST."""
        return serialize_ast(self)


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

    def __init__(self, source: str, *, recover: bool = False):
        self.source = source
        self.recover = recover
        self.diagnostics: list[ParseError] = []
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
        identity = sha256(("AKSI-Q-AST/2:%s:%d:%d" % (kind, span.start, span.end)).encode("utf-8")).hexdigest()[:20]
        return Node(kind, span, tuple(fields.items()), identity)

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
            before = self.pos
            try:
                items.append(self.parse_declaration())
                self.finish_statement()
            except ParseError as error:
                if not self.recover:
                    raise
                self.diagnostics.append(error)
                items.append(self.recover_statement(error))
            if self.pos == before and self.peek().kind != "EOF":
                self.take()
        end = self.peek().span
        return self.node("Module", start, end, name=module, items=tuple(items))

    def recover_statement(self, error: ParseError) -> Node:
        """Skip malformed input to a statement boundary."""
        start = self.peek().span
        while self.peek().kind not in ("EOF", "NEWLINE") and not self.at(";") and not self.at("}"):
            self.take()
        end = self.peek().span
        if self.peek().kind == "NEWLINE" or self.at(";"):
            self.skip_newlines()
        return self.node("Error", start, end, message=error.message, expected=error.expected)

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
        if token.value == "import":
            return self.parse_import()
        if token.value == "struct":
            return self.parse_struct()
        if token.value == "for":
            return self.parse_for()
        if token.value == "match":
            return self.parse_match()
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

    def parse_import(self) -> Node:
        start = self.expect("import")
        path = self.parse_path()
        alias = None
        if self.accept("as"):
            alias = self.expect_kind("IDENT", "import alias").value
        return self.node("Import", start.span, self.tokens[self.pos - 1].span,
                         path=path, alias=alias or path.split(".")[-1])

    def parse_type_parameters(self) -> tuple[str, ...]:
        if not self.accept("<"):
            return ()
        names = []
        while True:
            names.append(self.expect_kind("IDENT", "type parameter").value)
            if not self.accept(","):
                break
        end = self.expect(">")
        if len(set(names)) != len(names):
            raise ParseError("duplicate type parameter", end.span)
        return tuple(names)

    def parse_struct(self) -> Node:
        start = self.expect("struct")
        name = self.expect_kind("IDENT", "struct name")
        type_params = self.parse_type_parameters()
        self.expect("{")
        self.skip_newlines()
        fields = []
        while not self.at("}") and self.peek().kind != "EOF":
            field = self.expect_kind("IDENT", "field name")
            self.expect(":")
            field_type = self.parse_type()
            fields.append((field.value, field_type))
            if self.at(",") or self.peek().kind == "NEWLINE":
                self.skip_newlines()
            elif not self.at("}"):
                raise ParseError("expected a newline or ',' between fields",
                                 self.peek().span, expected=("newline", ",", "}"))
        end = self.expect("}")
        return self.node("StructDeclaration", start.span, end.span,
                         name=name.value, type_params=type_params, fields=tuple(fields))

    def parse_for(self) -> Node:
        start = self.expect("for")
        name = self.expect_kind("IDENT", "loop variable")
        self.expect("in")
        iterable = self.parse_expression(5)
        body = self.parse_block()
        return self.node("For", start.span, body.span,
                         name=name.value, iterable=iterable, body=body)

    def parse_pattern(self) -> Node:
        token = self.take()
        if token.value == "_":
            return self.node("WildcardPattern", token.span, token.span)
        if token.kind == "NUMBER":
            return self.node("NumberPattern", token.span, token.span, value=token.value)
        if token.kind == "STRING":
            return self.node("StringPattern", token.span, token.span, value=token.value)
        if token.value in ("true", "false", "null"):
            value = {"true": True, "false": False, "null": None}[token.value]
            return self.node("LiteralPattern", token.span, token.span, value=value)
        if token.kind == "IDENT":
            if self.accept("("):
                bindings = []
                if not self.at(")"):
                    while True:
                        bindings.append(self.expect_kind("IDENT", "pattern binding").value)
                        if not self.accept(","):
                            break
                end = self.expect(")")
                return self.node("ConstructorPattern", token.span, end.span,
                                 name=token.value, bindings=tuple(bindings))
            return self.node("BindingPattern", token.span, token.span, name=token.value)
        raise ParseError("expected a match pattern", token.span)

    def parse_match(self) -> Node:
        start = self.expect("match")
        value = self.parse_expression()
        self.expect("{")
        self.skip_newlines()
        arms = []
        while not self.at("}") and self.peek().kind != "EOF":
            pattern = self.parse_pattern()
            self.expect("=>")
            body = self.parse_block()
            arms.append((pattern, body))
            if self.at(",") or self.peek().kind == "NEWLINE":
                self.skip_newlines()
            elif not self.at("}"):
                raise ParseError("expected a newline or ',' between match arms",
                                 self.peek().span, expected=("newline", ",", "}"))
        end = self.expect("}")
        return self.node("Match", start.span, end.span, value=value, arms=tuple(arms))

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
        type_params = self.parse_type_parameters()
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
        declared_effects = None
        if self.accept("!"):
            self.expect("{")
            effects = []
            if not self.at("}"):
                while True:
                    effects.append(self.expect_kind("IDENT", "effect name").value)
                    if not self.accept(","):
                        break
            self.expect("}")
            if len(set(effects)) != len(effects):
                raise ParseError("duplicate effect name", self.tokens[self.pos - 1].span)
            declared_effects = tuple(effects)
        body = self.parse_block()
        return self.node("Function", start.span, body.span, name=name.value,
                         params=tuple(params), type_params=type_params, result_type=result_type,
                         declared_effects=declared_effects, body=body)

    def parse_type_alias(self) -> Node:
        start = self.expect("type")
        name = self.expect_kind("IDENT", "type name")
        type_params = self.parse_type_parameters()
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
                         name=name.value, type_params=type_params, variants=tuple(variants))

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
            before = self.pos
            try:
                statements.append(self.parse_declaration())
                self.finish_statement()
            except ParseError as error:
                if not self.recover:
                    raise
                self.diagnostics.append(error)
                statements.append(self.recover_statement(error))
            if self.pos == before and not self.at("}") and self.peek().kind != "EOF":
                self.take()
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


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Node):
        return {
            "kind": value.kind,
            "id": value.node_id,
            "span": _serialize_value(value.span),
            "fields": {name: _serialize_value(item) for name, item in value.fields},
        }
    if isinstance(value, Span):
        return {
            "start": value.start,
            "end": value.end,
            "line": value.line,
            "column": value.column,
            "end_line": value.end_line,
            "end_column": value.end_column,
        }
    if isinstance(value, tuple):
        return [_serialize_value(item) for item in value]
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _serialize_value(item) for key, item in value.items()}
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    raise TypeError(f"Unsupported AST field value: {type(value).__name__}")


def serialize_ast(node: Node) -> dict[str, Any]:
    """Serialize an AST with a stable schema marker for conformance tooling."""
    if not isinstance(node, Node):
        raise TypeError("serialize_ast expects a Node")
    return {"schema": "AKSI-Q-AST/2", "root": _serialize_value(node)}


@dataclass(frozen=True, slots=True)
class ParseResult:
    tree: Node
    diagnostics: tuple[ParseError, ...]


def parse(source: str) -> Node:
    """Parse AKSI Q source strictly; raise the first syntax error."""
    return Parser(source).parse()


def parse_recovering(source: str) -> ParseResult:
    """Return a partial syntax tree and all recoverable syntax errors."""
    parser = Parser(source, recover=True)
    tree = parser.parse()
    return ParseResult(tree, tuple(parser.diagnostics))
