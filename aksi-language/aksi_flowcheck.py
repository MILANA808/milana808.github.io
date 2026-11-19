"""Conservative control-flow analysis for AKSI Q function bodies.

This pass checks a narrow, explicit guarantee: a function declared with a
non-Unit result must return a value on every statically visible path.
It intentionally does not treat loops as guaranteed to execute.
"""
from __future__ import annotations

from dataclasses import dataclass

from aksi_frontend import Node


@dataclass(frozen=True, slots=True)
class FlowDiagnostic:
    code: str
    message: str
    line: int
    column: int


def _unwrap(node: Node) -> Node:
    while node.kind == "Public":
        node = node.get("declaration")
    return node


def _type_name(node: Node | None) -> str:
    if node is None:
        return "Unit"
    if node.kind == "ArrayType":
        return "[" + _type_name(node.get("item")) + "]"
    if node.kind == "NamedType":
        name = node.get("name")
        args = node.get("args", ())
        if args:
            return name + "<" + ",".join(_type_name(arg) for arg in args) + ">"
        return name
    return "Any"


def _returns_on_all_paths(node: Node) -> bool:
    """Return true only when the node structurally guarantees a return."""
    if node.kind == "Return":
        return True
    if node.kind == "Block":
        for statement in node.get("statements", ()):
            current = _unwrap(statement)
            if _returns_on_all_paths(current):
                return True
        return False
    if node.kind == "If":
        otherwise = node.get("otherwise")
        if otherwise is None:
            return False
        return (
            _returns_on_all_paths(node.get("then"))
            and _returns_on_all_paths(otherwise)
        )
    # A loop may execute zero times. Do not infer a return from its body.
    return False


def check(module: Node) -> tuple[FlowDiagnostic, ...]:
    if not isinstance(module, Node) or module.kind != "Module":
        raise TypeError("check() expects a Module AST node")
    diagnostics: list[FlowDiagnostic] = []
    for wrapper in module.get("items", ()):
        function = _unwrap(wrapper)
        if function.kind != "Function":
            continue
        result_node = function.get("result_type")
        result_type = _type_name(result_node)
        if result_type == "Unit":
            continue
        body = function.get("body")
        if not _returns_on_all_paths(body):
            diagnostics.append(FlowDiagnostic(
                "E_MISSING_RETURN",
                f"function '{function.get('name')}' declares {result_type} "
                "but does not return a value on every path",
                function.span.line,
                function.span.column,
            ))
    return tuple(diagnostics)
