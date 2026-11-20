"""Conservative effect inference for the shared AKSI Q AST.

Effects are descriptive metadata, not an authorization mechanism. Runtime
capability checks remain mandatory even when static analysis reports effects.
"""
from __future__ import annotations

from dataclasses import dataclass

from aksi_frontend import Node


BUILTIN_EFFECTS = {
    "print": frozenset({"IO"}),
    "host_call": frozenset({"Host"}),
}
PURE_PRELUDE = frozenset({
    "pi", "e", "sqrt", "sin", "cos", "tan", "exp", "log", "abs",
    "sum", "len", "min", "max", "round", "complex", "vector", "dot",
    "norm", "normalize", "tensor", "interfere", "probabilities", "h",
    "phase", "qstate", "x", "z", "cnot", "rx", "ry", "rz", "measure",
})


@dataclass(frozen=True, slots=True)
class EffectResult:
    function_effects: tuple[tuple[str, tuple[str, ...]], ...]
    module_effects: tuple[str, ...]


def _unwrap(node: Node) -> Node:
    while node.kind == "Public":
        node = node.get("declaration")
    return node


def _walk(value):
    if isinstance(value, Node):
        yield value
        for _, child in value.fields:
            yield from _walk(child)
    elif isinstance(value, (tuple, list)):
        for child in value:
            yield from _walk(child)


def _calls(root: Node, *, skip_functions: bool = True) -> tuple[tuple[str | None, Node], ...]:
    found = []
    def visit(value):
        if isinstance(value, Node):
            if skip_functions and value.kind == "Function":
                return
            if value.kind == "Call":
                callee = value.get("callee")
                name = callee.get("value") if callee.kind == "Name" else None
                found.append((name, value))
            for _, child in value.fields:
                visit(child)
        elif isinstance(value, (tuple, list)):
            for child in value:
                visit(child)
    visit(root)
    return tuple(found)


def infer_effects(module: Node) -> EffectResult:
    """Infer direct and transitive effects for module-level functions.

    Known effects: IO (print), Host (host_call), Unknown (indirect/unresolved
    callable). All other currently registered prelude functions are pure.
    User-function effects are propagated to a fixed point, including recursion.
    """
    if not isinstance(module, Node) or module.kind != "Module":
        raise TypeError("infer_effects() expects a Module AST node")

    functions: dict[str, Node] = {}
    constructors: set[str] = set()
    top_level = []
    for wrapper in module.get("items", ()):
        node = _unwrap(wrapper)
        if node.kind == "Function":
            functions[node.get("name")] = node
        elif node.kind == "TypeDeclaration":
            constructors.update(name for name, _ in node.get("variants", ()))
        else:
            top_level.append(node)

    direct: dict[str, set[str]] = {name: set() for name in functions}
    calls_by_function: dict[str, set[str]] = {name: set() for name in functions}

    def classify(root: Node, effects: set[str], callees: set[str]) -> None:
        for name, call in _calls(root):
            if name is None:
                effects.add("Unknown")
            elif name in BUILTIN_EFFECTS:
                effects.update(BUILTIN_EFFECTS[name])
            elif name in functions:
                callees.add(name)
            elif name in constructors or name in PURE_PRELUDE:
                continue
            else:
                effects.add("Unknown")

    for name, function in functions.items():
        classify(function.get("body"), direct[name], calls_by_function[name])

    summaries = {name: set(effects) for name, effects in direct.items()}
    changed = True
    while changed:
        changed = False
        for name, callees in calls_by_function.items():
            merged = set(direct[name])
            for callee in callees:
                merged.update(summaries[callee])
            if merged != summaries[name]:
                summaries[name] = merged
                changed = True

    module_direct: set[str] = set()
    module_calls: set[str] = set()
    for item in top_level:
        classify(item, module_direct, module_calls)
    module_effects = set(module_direct)
    for callee in module_calls:
        module_effects.update(summaries[callee])

    return EffectResult(
        tuple((name, tuple(sorted(effects))) for name, effects in sorted(summaries.items())),
        tuple(sorted(module_effects)),
    )
