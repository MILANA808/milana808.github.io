"""Canonical typed intermediate representation for AKSI Q compiler foundation.

TIR types are supplied by the typechecker and keyed by stable AST node IDs.
The lowerer deliberately does not infer expression types from source syntax.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from aksi_frontend import Node


@dataclass(frozen=True, slots=True)
class IRNode:
    node_id: str
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
            "id": self.node_id,
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


def _declared_type(node: Node) -> str:
    if node.kind == "ArrayType":
        return "[" + _declared_type(node.get("item")) + "]"
    if node.kind == "NamedType":
        args = node.get("args", ())
        suffix = "<" + ",".join(_declared_type(arg) for arg in args) + ">" if args else ""
        return node.get("name") + suffix
    raise TypeError(f"not a type-syntax node: {node.kind}")


def _node_type(node: Node, inferred: Mapping[str, str]) -> str:
    if node.kind in ("ArrayType", "NamedType"):
        return _declared_type(node)
    if node.kind == "Public":
        declaration = node.get("declaration")
        return _node_type(declaration, inferred)
    if node.kind == "Module":
        return "Module"
    if node.kind in ("StructDeclaration", "TypeDeclaration", "Import", "Block",
                     "Break", "Continue", "ExpressionStatement"):
        return inferred.get(node.node_id, "Unit")
    if node.kind == "Function":
        return inferred.get(node.node_id, "Unknown")
    return inferred.get(node.node_id, "Unknown")


def _convert(value: Any, inferred: Mapping[str, str]) -> Any:
    if isinstance(value, Node):
        return _lower_node(value, inferred)
    if isinstance(value, tuple):
        return tuple(_convert(item, inferred) for item in value)
    if isinstance(value, list):
        return tuple(_convert(item, inferred) for item in value)
    return value


def _lower_node(node: Node, inferred: Mapping[str, str]) -> IRNode:
    if not isinstance(node, Node):
        raise TypeError("IR lowering expects AST nodes")
    result_type = _node_type(node, inferred)
    if result_type in ("Unknown", "Any") and node.kind not in ("TypeDeclaration", "StructDeclaration"):
        raise ValueError(
            f"cannot lower {node.kind} node {node.node_id}: type is not statically known"
        )
    if node.kind == "Function":
        normalized = []
        for key, value in node.fields:
            target_key = "type_parameters" if key == "type_params" else (
                "parameters" if key == "params" else key
            )
            normalized.append((target_key, _convert(value, inferred)))
        fields = tuple(normalized)
    else:
        fields = tuple((key, _convert(value, inferred)) for key, value in node.fields)
    span = (node.span.line, node.span.column, node.span.end_line, node.span.end_column)
    return IRNode(node.node_id, node.kind, result_type, span, fields)


def lower(module: Node, inferred_types: Mapping[str, str]) -> IRModule:
    """Lower one analyzed AST using only typechecker-produced expression types."""
    if not isinstance(module, Node) or module.kind != "Module":
        raise TypeError("lower() expects a Module AST node")
    if not isinstance(inferred_types, Mapping):
        raise TypeError("lower() requires a node-id to type mapping from the typechecker")
    nodes = tuple(_lower_node(item, inferred_types) for item in module.get("items", ()))
    return IRModule("AKSI-Q-TIR/0.2", module.get("name"), nodes)


_ALLOWED_OPS = {
    "Module", "Public", "Function", "Binding", "Return", "Break", "Continue",
    "ExpressionStatement", "If", "While", "For", "Match", "Block",
    "TypeDeclaration", "StructDeclaration", "Import", "Name", "Number",
    "String", "Literal", "Group", "Array", "Unary", "Binary", "Assignment",
    "Call", "Index", "Member", "ArrayType", "NamedType", "WildcardPattern",
    "NumberPattern", "StringPattern", "LiteralPattern", "BindingPattern",
    "ConstructorPattern", "Error",
}


def validate_tir(module: IRModule) -> None:
    """Validate the structural TIR contract before it leaves the compiler.

    This checks representation integrity, not program semantics or execution.
    """
    if not isinstance(module, IRModule):
        raise TypeError("validate_tir expects an IRModule")
    if module.schema != "AKSI-Q-TIR/0.2":
        raise ValueError(f"unsupported TIR schema: {module.schema!r}")
    if module.name is not None and not isinstance(module.name, str):
        raise ValueError("TIR module name must be text or null")
    if not isinstance(module.nodes, tuple):
        raise ValueError("TIR module nodes must be an immutable tuple")

    seen: set[str] = set()

    def visit(value: Any) -> None:
        if isinstance(value, IRNode):
            if value.op not in _ALLOWED_OPS:
                raise ValueError(f"unsupported TIR operation: {value.op!r}")
            if not isinstance(value.node_id, str) or len(value.node_id) != 20:
                raise ValueError("TIR node ID must be a 20-character stable identifier")
            if any(ch not in "0123456789abcdef" for ch in value.node_id):
                raise ValueError("TIR node ID must be lowercase hexadecimal")
            if value.node_id in seen:
                raise ValueError(f"duplicate TIR node ID: {value.node_id}")
            seen.add(value.node_id)
            if not isinstance(value.type_name, str) or not value.type_name:
                raise ValueError(f"TIR node {value.node_id} has no type")
            if value.type_name in ("Unknown", "Any"):
                raise ValueError(f"TIR node {value.node_id} has unresolved type {value.type_name}")
            if (not isinstance(value.span, tuple) or len(value.span) != 4
                    or any(type(part) is not int or part < 1 for part in value.span)):
                raise ValueError(f"TIR node {value.node_id} has an invalid source span")
            if not isinstance(value.fields, tuple):
                raise ValueError(f"TIR node {value.node_id} fields must be immutable")
            names = [name for name, _ in value.fields]
            if any(not isinstance(name, str) or not name for name in names):
                raise ValueError(f"TIR node {value.node_id} has an invalid field name")
            if len(names) != len(set(names)):
                raise ValueError(f"TIR node {value.node_id} has duplicate fields")
            for _, child in value.fields:
                visit(child)
            return
        if isinstance(value, (tuple, list)):
            for child in value:
                visit(child)
            return
        if isinstance(value, dict):
            for child in value.values():
                visit(child)
            return
        if value is None or type(value) in (str, int, float, bool):
            return
        raise ValueError(f"unsupported value in TIR: {type(value).__name__}")

    for node in module.nodes:
        visit(node)
