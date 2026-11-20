# AKSI Q type checker — draft 0.1

The type checker consumes the immutable AST produced by `aksi_frontend.parse()`. The separate `aksi_effects.py` pass computes conservative effect summaries and is included in the unified analysis result.
It is a conservative first-pass checker for primitive expression types and
annotated function boundaries. It does not execute source code.

## API

```python
from aksi_frontend import parse
from aksi_typechecker import check

diagnostics = check(parse(source))
```

The result is an immutable tuple of diagnostics with stable codes and
one-based source coordinates. Run `aksi_resolver.resolve(module)` first:
the resolver is responsible for unknown value names and lexical declaration
rules; the type checker is responsible for type compatibility.

## Implemented checks

- Numeric literal inference as `Int` or `Float`.
- String, Boolean and null/unit literal inference.
- Annotated binding initializer compatibility.
- Function argument count and annotated argument compatibility for known
  functions and the currently declared scalar built-ins.
- Generic `abs<T>(T) -> T` signature: the argument type is preserved instead
  of leaking `Any` into the inferred result.
- Precise collection built-ins: `sum([T]) -> T` for numeric arrays,
  `min([T]) -> T` / `max([T]) -> T` for numeric or string arrays, and
  `len(String | [T]) -> Int`.
- Dynamic `complex` calls are rejected until a stable static type contract exists.
  `host_call` remains available to the isolated AST interpreter, but the compiler
  refuses to lower its unresolved dynamic result into typed TIR.
- Function return-value compatibility when a result type is declared or
  implied as `Unit`.
- Numeric and Boolean unary/binary operator constraints.
- Boolean `if` and `while` conditions.
- Homogeneous array literals and integer array indices.
- Assignment value compatibility when the target's type is known.
- Unknown type names in function parameter annotations and local annotations.

## Current type vocabulary

Primitive types: `Int`, `Float`, `Bool`, `String`, `Unit`, `Any`.
Array types are represented as `[T]`. Declared algebraic type names are
recognized as nominal names, but constructor typing and pattern matching are
not implemented.

`Any` and `Unknown` remain limited prototype escape hatches. They are not
accepted as emitted TIR result types. Unresolved names, member access and
untyped dynamic calls are rejected by analysis or by the compiler's lowering
boundary. `host_call` is intentionally still accepted by the isolated AST
interpreter so its capability registry, ABI checks, quotas and revocation
behavior remain testable; it is not yet lowerable to TIR because its result
contract is dynamic.

## Limitations — do not interpret a clean result as proof of safety

This pass is not yet sound or complete. It does not implement generic type
checking, overload resolution, complete built-in signatures, structural or
nominal subtype relations, type inference across recursive functions,
definite-assignment analysis, exhaustiveness, nullability, effect checking,
ownership/borrowing, or capability enforcement. It does not currently prove
that every control-flow path returns a value. The standard-library signatures
are provisional and must be aligned with the actual runtime before production
use.

A clean result means only that this pass found no issue among the checks above.
It does not prove that a program is executable, safe, or correct.


## Effect inference (analysis metadata)

`aksi_effects.infer_effects(module)` reports sorted effects for each
module-level function and for top-level module statements. The current effect
vocabulary is:

- `IO`: calls to `print`.
- `Host`: calls to `host_call`.
- `Unknown`: indirect or unresolved callable expressions.

Effects from direct user-function calls are propagated to a fixed point, so
recursive call graphs receive transitive summaries. Known prelude math and
collection functions and enum constructors are treated as pure.

The unified analysis schema is `AKSI-Q-ANALYSIS/4` and exposes
`effect_summaries` and `module_effects`. This is descriptive static
metadata only: it does not grant or revoke capabilities, and does not replace
runtime ABI validation, quotas, revocation, or host-side authorization. There
Function declarations may add an upper-bound effect set after the optional return type,
for example `fn read() !{Host} { ... }` or `fn pure() !{} { ... }`. The compiler
rejects inferred effects outside the declared set (`E_EFFECT_NOT_DECLARED`) and
unknown annotation names (`E_UNKNOWN_EFFECT`). `Unknown` must be listed explicitly
when a function contains an indirect or unresolved call. An annotation is not a
capability grant; runtime authorization remains mandatory.
