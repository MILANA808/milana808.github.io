# AKSI Q unified parser contract — draft 0.2

**Status:** evolving pre-1.0 grammar  
**Direction:** syntax redesign approved on 2026-11-19

The parser is a syntax-only front end over the shared source-positioned lexer. It never evaluates programs, resolves imports, executes functions, or grants capabilities. AKSI Q is pre-1.0: grammar changes are allowed, but every breaking change must be explicit, versioned, and documented with migration guidance.

## Current implemented syntax

- Optional `module dotted.name` header.
- Public declarations via `pub`.
- Functions with typed parameters, optional generic parameters and return type.\n- Optional upper-bound effect declarations after the return type: `fn f() -> Int !{IO, Host} { ... }`; `!{}` declares a pure function.
- `let`, `const`, and `mut` bindings.
- `return`, `break`, `continue`, `if/else if/else`, `while`, and `for` blocks.
- Struct declarations and algebraic type declarations with payload variants.
- `match` with literal, wildcard, binding, and constructor patterns.
- Imports with optional aliases (parsing only; no module loader yet).
- Literals, names, arrays, calls, member/index access, unary and binary operators.
- Newline or semicolon statement separators.

## AST and diagnostics

The output is a tree of frozen `Node` records. Each node has a kind, source span, and named fields accessible through `Node.get(name)`. Child collections are tuples. Offsets are zero-based; line and column are one-based. AST serialization currently advertises `AKSI-Q-AST/2`.

Lexical and strict syntax failures raise `LexError` or `ParseError` with source position. `parse_recovering()` returns a partial AST with `Error` nodes and multiple recoverable diagnostics. Each AST node has a deterministic 20-character identity derived from its kind and source offsets.

## Compiler pipeline contract

`analyze_module(module)` accepts an already parsed Module AST. `compile_source(source)` parses once, analyzes that AST, and lowers that same AST to the current TIR prototype. This removes redundant parse passes and gives later compiler stages one shared syntax tree.

`AKSI-Q-TIR/0.2` receives inferred expression types from the typechecker, keyed by stable AST node ID; the lowerer no longer guesses expression types from literal syntax. It is a typed structural IR, not yet an executable canonical runtime format.

## Explicitly incomplete

- Error recovery is statement-boundary based; it is not yet a full IDE-grade incremental parser.
- Complete type/effect system and strict rejection of unresolved/unknown types. Effect declarations currently constrain only the inferred `IO`, `Host`, and `Unknown` effects.
- Executable module loading and package resolution.
- Canonical TIR execution semantics and a TIR evaluator.
- Full Option/Result semantics, memory model, async semantics, bytecode, and WASM.
- Unified compilation of the existing UI profile.

These limitations are tracked rather than hidden behind a claim of language completeness.
