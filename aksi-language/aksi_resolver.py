"""Lexical name resolver for the AKSI Q source-spanned AST.

This pass validates declaration visibility and control-flow context only. It does
not infer expression types, execute code, or grant host capabilities.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from aksi_frontend import Node, parse


BUILTIN_TYPES = frozenset({"Int", "Float", "Bool", "String", "Unit", "Any"})
DEFAULT_PRELUDE = frozenset({
    "print", "pi", "e", "sqrt", "sin", "cos", "tan", "exp", "log",
    "abs", "sum", "len", "min", "max", "round", "complex", "host_call", "vector",
    "dot", "norm", "normalize", "tensor", "interfere", "probabilities",
    "h", "phase", "qstate", "x", "z", "cnot", "rx", "ry", "rz", "measure",
})


@dataclass(frozen=True, slots=True)
class Diagnostic:
    code: str
    message: str
    line: int
    column: int


@dataclass(frozen=True, slots=True)
class Symbol:
    name: str
    kind: str
    mutable: bool
    line: int
    column: int


class _Scope:
    def __init__(self, parent: "_Scope | None" = None):
        self.parent = parent
        self.symbols: dict[str, Symbol] = {}

    def lookup(self, name: str) -> Symbol | None:
        scope: _Scope | None = self
        while scope is not None:
            found = scope.symbols.get(name)
            if found is not None:
                return found
            scope = scope.parent
        return None

    def declare(self, symbol: Symbol) -> bool:
        if symbol.name in self.symbols:
            return False
        self.symbols[symbol.name] = symbol
        return True


class Resolver:
    """Resolve lexical names and report deterministic source-positioned errors."""

    def __init__(self, prelude: Iterable[str] = DEFAULT_PRELUDE):
        self.prelude = frozenset(prelude)
        self.diagnostics: list[Diagnostic] = []
        self.scope = _Scope()
        self.function_depth = 0
        self.loop_depth = 0
        self._declared_functions: set[int] = set()
        self._declared_types: set[int] = set()
        self.type_parameters: list[set[str]] = []

    def error(self, code: str, message: str, node: Node) -> None:
        self.diagnostics.append(Diagnostic(
            code, message, node.span.line, node.span.column
        ))

    @staticmethod
    def unwrap(node: Node) -> Node:
        while node.kind == "Public":
            node = node.get("declaration")
        return node

    def declare(self, name: str, kind: str, node: Node, *, mutable: bool = False) -> None:
        symbol = Symbol(name, kind, mutable, node.span.line, node.span.column)
        if not self.scope.declare(symbol):
            self.error("E_DUPLICATE_DECLARATION",
                       f"duplicate declaration of '{name}' in the same scope", node)

    def predeclare(self, statements: tuple[Node, ...]) -> None:
        for wrapper in statements:
            node = self.unwrap(wrapper)
            if node.kind == "Function":
                self.declare(node.get("name"), "function", node)
                self._declared_functions.add(id(node))
            elif node.kind in ("TypeDeclaration", "StructDeclaration"):
                name = node.get("name")
                self.declare(name, "type", node)
                self._declared_types.add(id(node))
                for variant, _args in node.get("variants", ()):
                    self.declare(variant, "constructor", node)

    def resolve_type(self, node: Node | None) -> None:
        if node is None:
            return
        if node.kind == "ArrayType":
            self.resolve_type(node.get("item"))
        elif node.kind == "NamedType":
            name = node.get("name")
            symbol = self.scope.lookup(name)
            generic = any(name in parameters for parameters in self.type_parameters)
            if name not in BUILTIN_TYPES and not generic and (symbol is None or symbol.kind != "type"):
                self.error("E_UNKNOWN_TYPE", f"unknown type '{name}'", node)
            for argument in node.get("args", ()):
                self.resolve_type(argument)

    def resolve(self, module: Node) -> tuple[Diagnostic, ...]:
        if not isinstance(module, Node) or module.kind != "Module":
            raise TypeError("resolve() expects a Module AST node")
        self.predeclare(module.get("items", ()))
        items = module.get("items", ())
        # Module-level functions are resolved after globals are collected, so
        # functions can refer to declarations regardless of source order.
        for wrapper in items:
            node = self.unwrap(wrapper)
            if node.kind != "Function":
                self.visit(node)
        for wrapper in items:
            node = self.unwrap(wrapper)
            if node.kind == "Function":
                self.visit_function(node)
        return tuple(self.diagnostics)

    def visit_block(self, block: Node) -> None:
        previous = self.scope
        self.scope = _Scope(previous)
        statements = block.get("statements", ())
        self.predeclare(statements)
        for wrapper in statements:
            node = self.unwrap(wrapper)
            if node.kind != "Function":
                self.visit(node)
        for wrapper in statements:
            node = self.unwrap(wrapper)
            if node.kind == "Function":
                self.visit_function(node)
        self.scope = previous

    def visit_function(self, node: Node) -> None:
        previous = self.scope
        self.scope = _Scope(previous)
        self.function_depth += 1
        enclosing_loop_depth = self.loop_depth
        self.loop_depth = 0
        parameters = set(node.get("type_params", ()))
        self.type_parameters.append(parameters)
        for name, annotation in node.get("params", ()):
            self.resolve_type(annotation)
            self.declare(name, "parameter", node)
        self.resolve_type(node.get("result_type"))
        self.visit_block(node.get("body"))
        self.type_parameters.pop()
        self.function_depth -= 1
        self.loop_depth = enclosing_loop_depth
        self.scope = previous

    def visit_pattern(self, pattern: Node) -> None:
        if pattern.kind == "BindingPattern":
            name = pattern.get("name")
            if name != "_":
                self.declare(name, "pattern_binding", pattern)
        elif pattern.kind == "ConstructorPattern":
            name = pattern.get("name")
            symbol = self.scope.lookup(name)
            if symbol is None or symbol.kind != "constructor":
                self.error("E_UNKNOWN_VARIANT", f"unknown variant '{name}'", pattern)
            for binding in pattern.get("bindings", ()):
                self.declare(binding, "pattern_binding", pattern)
        elif pattern.kind in ("WildcardPattern", "NumberPattern", "StringPattern", "LiteralPattern"):
            return
        else:
            self.error("E_UNSUPPORTED_PATTERN", f"unsupported pattern '{pattern.kind}'", pattern)

    def visit(self, node: Node | None) -> None:
        if node is None:
            return
        kind = node.kind
        if kind == "Binding":
            self.resolve_type(node.get("annotation"))
            self.visit(node.get("value"))
            mode = node.get("mode")
            self.declare(node.get("name"), "binding", node, mutable=(mode == "mut"))
        elif kind == "TypeDeclaration":
            self.type_parameters.append(set(node.get("type_params", ())))
            for _variant, args in node.get("variants", ()):
                for argument in args:
                    self.resolve_type(argument)
            self.type_parameters.pop()
        elif kind == "StructDeclaration":
            self.type_parameters.append(set(node.get("type_params", ())))
            seen = set()
            for field_name, field_type in node.get("fields", ()):
                if field_name in seen:
                    self.error("E_DUPLICATE_FIELD", f"duplicate struct field '{field_name}'", node)
                seen.add(field_name)
                self.resolve_type(field_type)
            self.type_parameters.pop()
        elif kind == "Import":
            self.declare(node.get("alias"), "module", node)
        elif kind == "ExpressionStatement":
            self.visit(node.get("expression"))
        elif kind == "Return":
            if self.function_depth == 0:
                self.error("E_RETURN_OUTSIDE_FUNCTION", "return outside a function", node)
            self.visit(node.get("value"))
        elif kind in ("Break", "Continue"):
            if self.loop_depth == 0:
                self.error("E_LOOP_CONTROL_OUTSIDE_LOOP",
                           f"{kind.lower()} outside a loop", node)
        elif kind == "If":
            self.visit(node.get("condition"))
            self.visit_block(node.get("then"))
            otherwise = node.get("otherwise")
            if otherwise is not None:
                if otherwise.kind == "Block":
                    self.visit_block(otherwise)
                else:
                    self.visit(otherwise)
        elif kind == "While":
            self.visit(node.get("condition"))
            self.loop_depth += 1
            self.visit_block(node.get("body"))
            self.loop_depth -= 1
        elif kind == "For":
            self.visit(node.get("iterable"))
            previous = self.scope
            self.scope = _Scope(previous)
            self.declare(node.get("name"), "loop_binding", node)
            self.loop_depth += 1
            self.visit_block(node.get("body"))
            self.loop_depth -= 1
            self.scope = previous
        elif kind == "Match":
            self.visit(node.get("value"))
            for pattern, body in node.get("arms", ()):
                previous = self.scope
                self.scope = _Scope(previous)
                self.visit_pattern(pattern)
                self.visit_block(body)
                self.scope = previous
        elif kind == "Block":
            self.visit_block(node)
        elif kind == "Name":
            name = node.get("value")
            if self.scope.lookup(name) is None and name not in self.prelude:
                self.error("E_UNKNOWN_NAME", f"unknown name '{name}'", node)
        elif kind == "Assignment":
            left = node.get("left")
            if left.kind != "Name":
                self.error("E_INVALID_ASSIGNMENT_TARGET",
                           "assignment target must be a mutable local name", left)
            else:
                symbol = self.scope.lookup(left.get("value"))
                if symbol is None:
                    self.error("E_UNKNOWN_NAME",
                               f"unknown name '{left.get('value')}'", left)
                elif not symbol.mutable:
                    self.error("E_IMMUTABLE_ASSIGNMENT",
                               f"cannot assign to immutable '{symbol.name}'", left)
            self.visit(node.get("right"))
        elif kind in ("Binary",):
            self.visit(node.get("left"))
            self.visit(node.get("right"))
        elif kind == "Unary":
            self.visit(node.get("value"))
        elif kind == "Call":
            self.visit(node.get("callee"))
            for argument in node.get("args", ()):
                self.visit(argument)
        elif kind == "Array":
            for item in node.get("items", ()):
                self.visit(item)
        elif kind == "Group":
            self.visit(node.get("value"))
        elif kind == "Member":
            self.visit(node.get("target"))
        elif kind == "Index":
            self.visit(node.get("target"))
            self.visit(node.get("index"))
        elif kind in ("Number", "String", "Literal"):
            return
        else:
            self.error("E_UNSUPPORTED_AST_NODE",
                       f"resolver does not support AST node '{kind}'", node)


def resolve(module: Node, *, prelude: Iterable[str] = DEFAULT_PRELUDE) -> tuple[Diagnostic, ...]:
    """Return all lexical-resolution diagnostics for a parsed module."""
    return Resolver(prelude=prelude).resolve(module)


def resolve_source(source: str, *, prelude: Iterable[str] = DEFAULT_PRELUDE) -> tuple[Diagnostic, ...]:
    """Parse and resolve source, allowing parser errors to propagate unchanged."""
    return resolve(parse(source), prelude=prelude)
