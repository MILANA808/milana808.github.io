"""Conservative expression type checker for the AKSI Q source-spanned AST.

This pass checks primitive expression types and annotated function boundaries.
It is not a complete soundness proof and does not execute programs.
"""
from __future__ import annotations

from dataclasses import dataclass
import re

from aksi_frontend import Node


NUMERIC = frozenset({"Int", "Float"})
BUILTIN_VALUES = {"pi": "Float", "e": "Float"}
BUILTIN_FUNCTIONS = {
    "sqrt": (("Float",), "Float"),
    "sin": (("Float",), "Float"),
    "cos": (("Float",), "Float"),
    "tan": (("Float",), "Float"),
    "exp": (("Float",), "Float"),
    "log": (("Float",), "Float"),
    "abs": (("Any",), "Any"),
    "sum": (("Any",), "Any"),
    "len": (("Any",), "Int"),
    "min": (("Any",), "Any"),
    "max": (("Any",), "Any"),
    "round": (("Float",), "Int"),
    "complex": (("Any",), "Any"),
    "print": (("Any",), "Unit"),
    "host_call": (("String", "[Any]"), "Any"),
}
BUILTIN_TYPES = frozenset({"Int", "Float", "Bool", "String", "Unit", "Any"})


@dataclass(frozen=True, slots=True)
class TypeDiagnostic:
    code: str
    message: str
    line: int
    column: int


@dataclass(frozen=True, slots=True)
class FunctionType:
    parameters: tuple[str, ...]
    result: str
    type_parameters: tuple[str, ...] = ()


class _Scope:
    def __init__(self, parent: "_Scope | None" = None):
        self.parent = parent
        self.values: dict[str, str | FunctionType] = {}

    def get(self, name: str):
        scope = self
        while scope is not None:
            if name in scope.values:
                return scope.values[name]
            scope = scope.parent
        return None

    def put(self, name: str, value: str | FunctionType):
        self.values[name] = value


def _type_name(node: Node | None) -> str:
    if node is None:
        return "Unit"
    if node.kind == "ArrayType":
        return "[" + _type_name(node.get("item")) + "]"
    if node.kind == "NamedType":
        name = node.get("name")
        args = node.get("args", ())
        return name + ("<" + ",".join(_type_name(arg) for arg in args) + ">" if args else "")
    return "Any"


def _same_or_any(left: str, right: str) -> bool:
    if left == right or "Any" in (left, right) or "Unknown" in (left, right):
        return True
    if left.startswith("[") and left.endswith("]") and right.startswith("[") and right.endswith("]"):
        return _same_or_any(left[1:-1], right[1:-1])
    return False


class TypeChecker:
    def __init__(self):
        self.diagnostics: list[TypeDiagnostic] = []
        self.scope = _Scope()
        self.functions: dict[str, FunctionType] = {}
        self.current_return: str | None = None
        self.custom_types: set[str] = set()
        self.type_parameters: list[set[str]] = []
        self.node_types: dict[str, str] = {}

    def error(self, code: str, message: str, node: Node):
        self.diagnostics.append(TypeDiagnostic(
            code, message, node.span.line, node.span.column
        ))

    @staticmethod
    def unwrap(node: Node) -> Node:
        while node.kind == "Public":
            node = node.get("declaration")
        return node

    def collect(self, module: Node):
        for wrapper in module.get("items", ()):
            node = self.unwrap(wrapper)
            if node.kind in ("TypeDeclaration", "StructDeclaration"):
                self.custom_types.add(node.get("name"))
            if node.kind == "TypeDeclaration":
                parameters = tuple(node.get("type_params", ()))
                result_type = node.get("name")
                if parameters:
                    result_type += "<" + ",".join(parameters) + ">"
                for variant_name, payload in node.get("variants", ()):
                    self.scope.put(
                        variant_name,
                        FunctionType(tuple(_type_name(item) for item in payload), result_type, parameters),
                    )
        for wrapper in module.get("items", ()):
            node = self.unwrap(wrapper)
            if node.kind == "Function":
                signature = FunctionType(
                    tuple(_type_name(annotation) for _, annotation in node.get("params", ())),
                    _type_name(node.get("result_type")),
                    tuple(node.get("type_params", ())),
                )
                self.functions[node.get("name")] = signature
                self.scope.put(node.get("name"), signature)
        self.scope.put("pi", "Float")
        self.scope.put("e", "Float")
        for name, (params, result) in BUILTIN_FUNCTIONS.items():
            self.scope.put(name, FunctionType(params, result))

    def declared_type(self, name: str, node: Node) -> str:
        if node.kind == "ArrayType":
            self.declared_type(_type_name(node.get("item")), node.get("item"))
            return name
        base = name.split("<", 1)[0]
        generic = any(base in parameters for parameters in self.type_parameters)
        if base not in BUILTIN_TYPES and base not in self.custom_types and not generic:
            self.error("E_UNKNOWN_TYPE", f"unknown type '{name}'", node)
        if node.kind == "NamedType":
            for argument in node.get("args", ()):
                self.declared_type(_type_name(argument), argument)
        return name

    def check(self, module: Node) -> tuple[TypeDiagnostic, ...]:
        if not isinstance(module, Node) or module.kind != "Module":
            raise TypeError("check() expects a Module AST node")
        self.collect(module)
        self.node_types[module.node_id] = "Module"
        for wrapper in module.get("items", ()):
            node = self.unwrap(wrapper)
            if node.kind != "Function":
                self.visit(node)
        for wrapper in module.get("items", ()):
            node = self.unwrap(wrapper)
            if node.kind == "Function":
                self.visit_function(node)
        return tuple(self.diagnostics)

    def visit_function(self, node: Node):
        previous = self.scope
        self.scope = _Scope(previous)
        signature = self.functions[node.get("name")]
        self.type_parameters.append(set(signature.type_parameters))
        for (name, annotation), type_name in zip(node.get("params", ()), signature.parameters):
            self.declared_type(type_name, annotation)
            self.scope.put(name, type_name)
        if node.get("result_type") is not None:
            self.declared_type(signature.result, node.get("result_type"))
        self.current_return = signature.result
        self.visit_block(node.get("body"))
        self.node_types[node.node_id] = "Function"
        self.current_return = None
        self.type_parameters.pop()
        self.scope = previous

    def visit_block(self, block: Node):
        previous = self.scope
        self.scope = _Scope(previous)
        for statement in block.get("statements", ()):
            self.visit(self.unwrap(statement))
        self.node_types[block.node_id] = "Unit"
        self.scope = previous

    def bind_pattern(self, pattern: Node, value_type: str) -> None:
        if pattern.kind == "BindingPattern":
            self.scope.put(pattern.get("name"), value_type)
        elif pattern.kind == "ConstructorPattern":
            for name in pattern.get("bindings", ()):
                self.scope.put(name, "Unknown")

    def visit(self, node: Node | None) -> str:
        if node is None:
            return "Unit"
        inferred = self._visit(node)
        self.node_types[node.node_id] = inferred
        return inferred

    def _visit(self, node: Node | None) -> str:
        if node is None:
            return "Unit"
        kind = node.kind
        if kind == "Binding":
            annotation = node.get("annotation")
            expected = _type_name(annotation) if annotation is not None else None
            if expected is not None:
                self.declared_type(expected, annotation)
            actual = self.visit(node.get("value")) if node.get("value") is not None else "Unknown"
            if expected and not _same_or_any(expected, actual):
                self.error("E_TYPE_MISMATCH",
                           f"binding '{node.get('name')}' expects {expected}, got {actual}", node)
            result = expected or actual
            self.scope.put(node.get("name"), result)
            return result
        if kind == "Return":
            actual = self.visit(node.get("value"))
            if self.current_return is not None and not _same_or_any(self.current_return, actual):
                self.error("E_RETURN_TYPE_MISMATCH",
                           f"function returns {self.current_return}, got {actual}", node)
            return "Never"
        if kind == "If":
            condition = self.visit(node.get("condition"))
            if condition not in ("Bool", "Any", "Unknown"):
                self.error("E_CONDITION_TYPE", f"if condition must be Bool, got {condition}", node)
            self.visit_block(node.get("then"))
            otherwise = node.get("otherwise")
            if otherwise is not None:
                if otherwise.kind == "Block":
                    self.visit_block(otherwise)
                else:
                    self.visit(otherwise)
            return "Unit"
        if kind == "While":
            condition = self.visit(node.get("condition"))
            if condition not in ("Bool", "Any", "Unknown"):
                self.error("E_CONDITION_TYPE", f"while condition must be Bool, got {condition}", node)
            self.visit_block(node.get("body"))
            return "Unit"
        if kind == "For":
            iterable_type = self.visit(node.get("iterable"))
            if iterable_type.startswith("[") and iterable_type.endswith("]"):
                item_type = iterable_type[1:-1]
            elif iterable_type == "String":
                item_type = "String"
            elif iterable_type in ("Any", "Unknown"):
                item_type = "Unknown"
            else:
                self.error("E_NOT_ITERABLE", f"value of type {iterable_type} is not iterable", node)
                item_type = "Unknown"
            previous = self.scope
            self.scope = _Scope(previous)
            self.scope.put(node.get("name"), item_type)
            self.visit_block(node.get("body"))
            self.scope = previous
            return "Unit"
        if kind == "Match":
            self.visit(node.get("value"))
            for pattern, body in node.get("arms", ()):
                previous = self.scope
                self.scope = _Scope(previous)
                self.bind_pattern(pattern, "Unknown")
                self.visit_block(body)
                self.scope = previous
            return "Unit"
        if kind == "Block":
            self.visit_block(node)
            return "Unit"
        if kind == "ExpressionStatement":
            return self.visit(node.get("expression"))
        if kind == "Name":
            name = node.get("value")
            value = self.scope.get(name)
            if isinstance(value, FunctionType):
                return "Function"
            return value if isinstance(value, str) else "Unknown"
        if kind == "Number":
            value = node.get("value")
            return "Float" if any(ch in value.lower() for ch in (".", "e")) else "Int"
        if kind == "String":
            return "String"
        if kind == "Literal":
            value = node.get("value")
            return "Bool" if isinstance(value, bool) else "Unit"
        if kind == "Group":
            return self.visit(node.get("value"))
        if kind == "Array":
            values = [self.visit(item) for item in node.get("items", ())]
            if not values:
                return "[Any]"
            first = values[0]
            for item in values[1:]:
                if not _same_or_any(first, item):
                    self.error("E_ARRAY_ELEMENT_MISMATCH",
                               f"array elements must have one type, got {first} and {item}", node)
                    return "[Any]"
            return "[" + first + "]"
        if kind == "Unary":
            value = self.visit(node.get("value"))
            operator = node.get("operator")
            if operator in ("!", "not"):
                if value not in ("Bool", "Any", "Unknown"):
                    self.error("E_OPERATOR_TYPE", f"{operator} requires Bool, got {value}", node)
                return "Bool"
            if value not in NUMERIC and value not in ("Any", "Unknown"):
                self.error("E_OPERATOR_TYPE", f"{operator} requires a number, got {value}", node)
            return value
        if kind == "Binary":
            left, right = self.visit(node.get("left")), self.visit(node.get("right"))
            operator = node.get("operator")
            if operator in ("and", "or", "&&", "||"):
                if left not in ("Bool", "Any", "Unknown") or right not in ("Bool", "Any", "Unknown"):
                    self.error("E_OPERATOR_TYPE", f"{operator} requires Bool operands", node)
                return "Bool"
            if operator in ("==", "!=", "<", "<=", ">", ">=", "in"):
                if operator in ("<", "<=", ">", ">="):
                    ordered = (left in NUMERIC and right in NUMERIC) or (left == right == "String")
                    if not ordered and "Any" not in (left, right) and "Unknown" not in (left, right):
                        self.error("E_OPERATOR_TYPE",
                                   f"values of type {left} and {right} cannot be ordered", node)
                elif operator != "in" and not _same_or_any(left, right):
                    self.error("E_OPERATOR_TYPE", f"incompatible comparison: {left} and {right}", node)
                return "Bool"
            if operator == "+" and left == right == "String":
                return "String"
            if left not in NUMERIC and left not in ("Any", "Unknown"):
                self.error("E_OPERATOR_TYPE", f"{operator} requires numeric operands, got {left}", node)
            if right not in NUMERIC and right not in ("Any", "Unknown"):
                self.error("E_OPERATOR_TYPE", f"{operator} requires numeric operands, got {right}", node)
            return "Float" if "Float" in (left, right) or operator == "/" else "Int"
        if kind == "Assignment":
            left = node.get("left")
            right_type = self.visit(node.get("right"))
            if left.kind == "Name":
                target = self.scope.get(left.get("value"))
                if isinstance(target, str) and not _same_or_any(target, right_type):
                    self.error("E_ASSIGNMENT_TYPE_MISMATCH",
                               f"cannot assign {right_type} to {target}", node)
                return target if isinstance(target, str) else "Unknown"
            self.visit(left)
            return "Unknown"
        if kind == "Call":
            callee = node.get("callee")
            args = node.get("args", ())
            if callee.kind == "Name":
                name = callee.get("value")
                signature = self.scope.get(name)
                argument_types = [self.visit(arg) for arg in args]
                if isinstance(signature, FunctionType):
                    if len(argument_types) != len(signature.parameters):
                        self.error("E_ARGUMENT_COUNT",
                                   f"{name} expects {len(signature.parameters)} arguments, got {len(argument_types)}", node)
                    substitutions = {}
                    generic_names = set(signature.type_parameters)
                    for actual, expected in zip(argument_types, signature.parameters):
                        if expected in generic_names:
                            previous_type = substitutions.get(expected)
                            if previous_type is not None and not _same_or_any(previous_type, actual):
                                self.error("E_GENERIC_TYPE_MISMATCH",
                                           f"generic parameter {expected} receives incompatible types {previous_type} and {actual}", node)
                            else:
                                substitutions[expected] = actual
                    for index, (actual, expected) in enumerate(zip(argument_types, signature.parameters)):
                        resolved_expected = substitutions.get(expected, expected)
                        if expected not in generic_names and not _same_or_any(actual, resolved_expected):
                            self.error("E_ARGUMENT_TYPE",
                                       f"argument {index + 1} of {name} expects {resolved_expected}, got {actual}", args[index])
                    resolved_result = signature.result
                    for parameter, actual in substitutions.items():
                        if resolved_result == parameter:
                            resolved_result = actual
                        else:
                            resolved_result = resolved_result.replace("<" + parameter + ">", "<" + actual + ">")
                    return resolved_result
                return "Unknown"
            self.visit(callee)
            for arg in args:
                self.visit(arg)
            return "Unknown"
        if kind == "Index":
            target = self.visit(node.get("target"))
            index = self.visit(node.get("index"))
            if index not in ("Int", "Any", "Unknown"):
                self.error("E_INDEX_TYPE", f"array index must be Int, got {index}", node)
            if target.startswith("[") and target.endswith("]"):
                return target[1:-1]
            return "Unknown"
        if kind == "Member":
            self.visit(node.get("target"))
            return "Unknown"
        if kind == "TypeDeclaration":
            self.type_parameters.append(set(node.get("type_params", ())))
            for _, args in node.get("variants", ()):
                for argument in args:
                    self.declared_type(_type_name(argument), argument)
            self.type_parameters.pop()
            return "Unit"
        if kind == "StructDeclaration":
            self.type_parameters.append(set(node.get("type_params", ())))
            for _, field_type in node.get("fields", ()):
                self.declared_type(_type_name(field_type), field_type)
            self.type_parameters.pop()
            return "Unit"
        if kind == "Import":
            return "Unit"
        if kind in ("Break", "Continue"):
            return "Unit"
        if kind == "Public":
            return self.visit(node.get("declaration"))
        self.error("E_UNSUPPORTED_AST_NODE", f"type checker does not support AST node '{kind}'", node)
        return "Unknown"


@dataclass(frozen=True, slots=True)
class TypeCheckResult:
    diagnostics: tuple[TypeDiagnostic, ...]
    node_types: tuple[tuple[str, str], ...]


def check_with_types(module: Node) -> TypeCheckResult:
    """Return diagnostics and inferred types keyed by stable AST node identity."""
    checker = TypeChecker()
    diagnostics = checker.check(module)
    return TypeCheckResult(diagnostics, tuple(sorted(checker.node_types.items())))


def check(module: Node) -> tuple[TypeDiagnostic, ...]:
    """Return type diagnostics for a parsed module."""
    return check_with_types(module).diagnostics
