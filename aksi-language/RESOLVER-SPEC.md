# AKSI Q name resolver — draft 0.1

The resolver consumes the immutable AST produced by `aksi_frontend.parse()`.
It is a semantic-analysis pass only: it does not execute code, infer expression
types, load modules, or authorize host operations.

## Public API

```python
from aksi_frontend import parse
from aksi_resolver import resolve, resolve_source

diagnostics = resolve(parse(source))
diagnostics = resolve_source(source)
```

Both functions return an immutable tuple of `Diagnostic` records. Each record
contains a stable diagnostic code, human-readable message, and one-based
source line and column. Syntax errors from the parser are allowed to propagate.

## Current checks

- Unknown value names, except for the explicit built-in prelude.
- Unknown named types; built-in types are `Int`, `Float`, `Bool`,
  `String`, `Unit`, and `Any`.
- Duplicate declarations in the same lexical scope.
- Lexical shadowing in nested scopes.
- Function parameters, function names, type names, and algebraic variant
  constructors.
- Assignment only to names declared with `mut`; `let` and `const` are
  immutable in this milestone.
- `return` only inside a function.
- `break` and `continue` only inside a loop belonging to the current
  function (loop context does not leak into nested functions).
- Type references nested in array types and algebraic variant payloads.

Module-level functions and types are predeclared. Module-level bindings are
collected before function bodies are resolved, so functions can refer to
module bindings regardless of their textual order. Within a block, ordinary
binding initializers are resolved in source order; nested function bodies are
resolved after the block's declarations have been visited.

## Explicit limitations

This is not a type checker. It does not verify operand compatibility, function
argument counts/types, return-value compatibility, generic constraints,
exhaustiveness, definite assignment, or effect/capability rules. Member names
are not resolved against record/interface declarations. Imports and packages
are not implemented. The prelude is a language/runtime contract placeholder
and must be reconciled with the eventual standard library before it is treated
as authoritative.

A clean resolver result means only that this pass found no errors in the
checks listed above. It is not proof that a program is type-safe or executable.
