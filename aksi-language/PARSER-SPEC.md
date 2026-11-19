# AKSI Q unified parser contract — draft 0.2

**Status:** evolving pre-1.0 grammar  
**Direction:** syntax redesign approved on 2026-11-19

The parser is a syntax-only front end over the shared source-positioned lexer. It never evaluates programs, resolves imports, executes functions, or grants capabilities. AKSI Q is pre-1.0: grammar changes are allowed, but every breaking change must be explicit, versioned, and documented with migration guidance.

## Current implemented syntax

- Optional `module dotted.name` header.
- Public declarations via `pub`.
- Functions with typed parameters, optional generic parameters and return type.
- `let`, `const`, and `mut` bindings.
- `return`, `break`, `continue`, `if/else if/else`, `while`, and `for` blocks.
- Struct declarations and algebraic type declarations with payload variants.
- `match` with literal, wildcard, binding, and constructor patterns.
- Imports with optional aliases (parsing only; no module loader yet).
- Literals, names, arrays, calls, member/index access, unary and binary operators.
- Newline or semicolon statement separators.

## AST and diagnostics

The output is a tree of frozen `Node` records. Each node has a kind, source span, and named fields accessible through `Node.get(name)`. Child collections are tuples. Offsets are zero-based; line and column are one-based. AST serialization currently advertises `AKSI-Q-AST/1`.

Lexical and syntax failures raise `LexError` or `ParseError` with source position. The parser currently stops at the first syntax error. Multi-error parser recovery and stable node identity are still required Compiler Foundation 0.2 work; they are not claimed as implemented.

## Compiler pipeline contract

`analyze_module(module)` accepts an already parsed Module AST. `compile_source(source)` parses once, analyzes that AST, and lowers that same AST to the current TIR prototype. This removes redundant parse passes and gives later compiler stages one shared syntax tree.

The current `AKSI-Q-TIR/0.1` is not yet a complete typed executable IR. Typechecker-derived node typing, canonical IR semantics, and runtime conformance are subsequent foundation work.

## Explicitly incomplete

- Parser error recovery and stable AST node IDs.
- Complete type/effect system and strict rejection of unresolved/unknown types.
- Executable module loading and package resolution.
- Complete typed TIR and canonical TIR evaluator.
- Full Option/Result semantics, memory model, async semantics, bytecode, and WASM.
- Unified compilation of the existing UI profile.

These limitations are tracked rather than hidden behind a claim of language completeness.
