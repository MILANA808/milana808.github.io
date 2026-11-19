"""Typed intermediate representation for the AKSI Q compiler prototype.

The IR preserves source locations and carries explicit type annotations. Types
that cannot yet be inferred are marked Unknown rather than guessed.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from aksi_frontend import Node


@dataclass(frozen=True, slots=True)
class IRNode:
    op: str
    type_name: str
    span: tuple[int, int, int, int]
    fields: tuple[tuple[str, Any], ...]

    def get(self, name: str, default: Any = None) -> Any:
        for key, value in self.fields:
            if key == name:
                return value
        return default

    def to_dict(self) -> dict[str, Any]:
        return {
            "op": self.op,
            "type": self.type_name,
            "span": {
                "line": self.span[0], "column": self.span[1],
                "end_line": self.span[2], "end_column": self.span[3],
            },
            "fields": {key: _serialize(value) for key, value in self.fields},
        }


@dataclass(frozen=True, slots=True)
class IRModule:
    schema: str
    name: str | None
    nodes: tuple[IRNode, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "name": self.name,
            "nodes": [node.to_dict() for node in self.nodes],
        }


def _serialize(value: Any) -> Any:
    if isinstance(value, IRNode):
        return value.to_dict()
    if isinstance(value, tuple):
        return [_serialize(item) for item in value]
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _serialize(item) for key, item in value.items()}
    return value


def _type_name(node: Node | None) -> str:
    if node is None:
        return "Unit"
    if node.kind == "ArrayType":
        return "[" + _type_name(node.get("item")) + "]"
    if node.kind == "NamedType":
        args = node.get("args", ())
        suffix = "<" + ",".join(_type_name(arg) for arg in args) + ">" if args else ""
        return node.get("name") + suffix
    return "Unknown"


def _literal_type(node: Node) -> str:
    if node.kind == "Number":
        value = node.get("value")
        return "Float" if any(ch in value.lower() for ch in (".", "e")) else "Int"
    if node.kind == "String":
        return "String"
    if node.kind == "Literal":
        value = node.get("value")
        return "Bool" if isinstance(value, bool) else "Unit"
    if node.kind == "Array":
        items = node.get("items", ())
        if not items:
            return "[Unknown]"
        types = {_literal_type(item) for item in items}
        return "[" + (next(iter(types)) if len(types) == 1 else "Unknown") + "]"
    return "Unknown"


def _convert(value: Any) -> Any:
    if isinstance(value, Node):
        return _lower_node(value)
    if isinstance(value, tuple):
        return tuple(_convert(item) for item in value)
    if isinstance(value, list):
        return tuple(_convert(item) for item in value)
    return value


def _lower_node(node: Node) -> IRNode:
    if not isinstance(node, Node):
        raise TypeError("IR lowering expects AST nodes")
    kind = node.kind
    result_type = _literal_type(node)
    if kind == "Function":
        params = tuple((name, _type_name(annotation)) for name, annotation in node.get("params", ()))
        result_type = _type_name(node.get("result_type"))
        fields = (
            ("name", node.get("name")),
            ("type_parameters", tuple(node.get("type_params", ()))),
            ("parameters", params),
            ("body", _convert(node.get("body"))),
        )
    elif kind == "Binding":
        annotation = node.get("annotation")
        result_type = _type_name(annotation) if annotation is not None else (
            _literal_type(node.get("value")) if node.get("value") is not None else "Unknown"
        )
        fields = tuple((key, _convert(value)) for key, value in node.fields)
    elif kind == "Call":
        fields = tuple((key, _convert(value)) for key, value in node.fields)
    elif kind == "Module":
        fields = tuple((key, _convert(value)) for key, value in node.fields if key != "items")
    else:
        fields = tuple((key, _convert(value)) for key, value in node.fields)
    span = (node.span.line, node.span.column, node.span.end_line, node.span.end_column)
    return IRNode(kind, result_type, span, fields)


def lower(module: Node) -> IRModule:
    """Lower a parsed module to versioned IR; unknown types stay explicit."""
    if not isinstance(module, Node) or module.kind != "Module":
        raise TypeError("lower() expects a Module AST node")
    nodes = tuple(_lower_node(item) for item in module.get("items", ()))
    return IRModule("AKSI-Q-TIR/0.1", module.get("name"), nodes)
