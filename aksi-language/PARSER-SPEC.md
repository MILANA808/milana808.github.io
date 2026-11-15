# AKSI Q unified parser contract — draft 0.1

This parser is the first consumer of the shared source-spanned lexer. It is a
syntax front-end only: parsing never evaluates expressions, imports modules,
executes functions, or grants capabilities.

## Supported syntax in this milestone

- Optional `module dotted.name` header.
- Public declarations via `pub`.
- Functions with named, explicitly typed parameters and optional return type.
- `let`, `const`, and `mut` bindings (immutable bindings require an initializer).
- `return`, `break`, `continue`, `if/else if/else`, and `while` blocks.
- Algebraic type declarations using `type Name = Variant | Other(Type)`.
- Literals, names, arrays, calls, member/index access, unary and binary operators.
- Newline or semicolon statement separators.

## AST and diagnostics

The output is a tree of frozen `Node` records. Each node has a kind, a source
span, and named fields accessible through `Node.get(name)`. Child collections
are tuples. Offsets are zero-based; line and column are one-based.

Lexical and syntax failures raise `LexError` or `ParseError` with a message
and source span. The parser does not recover and continue after a syntax error
in this milestone; multi-error recovery will be added after the grammar is
stable.

## Deliberate exclusions

This is not yet a complete compiler. Generic declarations, match/for syntax,
imports and module resolution, name/type/effect checking, execution, bytecode,
and WASM are not implemented. The legacy expression interpreter remains
separate until conformance and migration tests are in place.
