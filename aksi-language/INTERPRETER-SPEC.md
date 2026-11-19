# AKSI Q AST interpreter 0.1

## Status

This is an isolated, capability-free interpreter prototype for a deliberately
small subset of the shared `AKSI-Q-AST/1` syntax tree. It is not yet a
replacement for `aksi_q.py`, the browser runtime, or the public website.

## Supported statements

- Function declarations with positional parameters and lexical closures.
- `let`, `const`, and initialized `mut` bindings.
- `return`, `if` / `else`, `while`, `break`, and `continue`.
- Expression statements, the `print(...)` host-free output builtin, and
  `host_call(name, args)` for explicitly injected host capabilities.
- Public declaration wrappers are unwrapped and executed.

## Supported expressions

- Integer, floating-point, string, Boolean, and null literals.
- Names, grouping, arrays, array/string indexing, and function calls.
- Unary `+`, `-`, `!`, `not`.
- Arithmetic, equality, ordered comparisons, membership, Boolean short-circuit
  operators, string concatenation, and array concatenation.
- Name assignment, `+=`, and `-=` for mutable bindings.

## Host capability boundary

- Capabilities are injected by the embedding host as a mapping from stable IDs
  to callables. No capability is available by default.
- The host can grant a new capability or revoke an existing grant at runtime.
  Revocation takes effect before the next host_call; duplicate grants are
  rejected rather than silently replacing a handler.
- A deterministic trace records invocation sequence and status without logging
  arguments or returned data (invoked, returned, failed, denied, limit_denied,
  rejected_result).
- Optional typed ABI contracts declare positional argument types, result type,
  effect labels, and a per-capability call quota. When a typed registry is
  supplied, every granted capability must have a contract and every call is
  checked at runtime. Supported ABI types: Any, Unit, Bool, Int, Float, Number,
  String, and one-dimensional lists of those types.
- Arguments and results are restricted to bounded scalar/list data; arbitrary
  Python objects and handles cannot cross the boundary. Arguments are copied
  before calling host code.
- Successful calls are listed in `ExecutionResult.capabilities_used`; total
  attempted calls and the capability trace are returned too.
- Host capability attempts are capped at 128 per interpreter instance by default; failed attempts consume the same budget. Embedders may lower or raise the positive limit explicitly.
- `ExecutionResult.capability_calls` reports attempted calls, while `capabilities_used` records successful calls.
- Effect labels are declarative metadata for host policy and audit; they do not
  inspect or constrain callback internals. The host remains trusted: an injected
  callback can perform arbitrary host actions. This is not an OS sandbox.

## Deliberately rejected / not implemented

- Member access, imports, module loading, FFI, I/O, networking, processes,
  reflection, dynamic code execution, and arbitrary host capabilities.
- Algebraic data type construction/pattern matching, `for`, async tasks,
  generators, exceptions in source code, and bytecode/WASM compilation.
- Uninitialized mutable bindings.
- Assignment to array elements or object members.

Unsupported syntax fails explicitly; it is not silently ignored.

## Safety and resource bounds

- Static analysis (parser, resolver, type checker) runs before execution by
  default. `--no-analysis` exists only for isolated runtime tests and is not
  recommended for normal use.
- Instruction/fuel budget defaults to 100,000 AST operations.
- Function call depth defaults to 64.
- Array literal/operation size defaults to 10,000 elements.
- Strings are capped at 65,536 characters; integer results at 100,000 bits.
- Exponent magnitude is capped at 1,024.
- Captured output is capped at 1,000,000 characters and 10,000 lines.
- Retained expression results are capped at 10,000 items; formatted nesting is capped at 32 levels.
- No `eval`, `exec`, import mechanism, filesystem, network, process, browser,
  or ambient host API is exposed by the interpreter.

These are prototype safeguards, not a formal sandbox against hostile Python
embedding code or interpreter implementation defects. The host process still
owns Python memory and scheduling.

## Run

```bash
cd aksi-language
python aksi_interpreter.py examples/first.aksi
python aksi_interpreter.py --json examples/first.aksi
python -m unittest discover -s tests -v
```

The existing example `first.aksi` uses legacy quantum/vector builtins that are
not part of interpreter 0.1. For a minimal program, use:

```aksi
fn add(x: Int, y: Int) -> Int { return x + y }
let answer: Int = add(2, 3)
print(answer)
```

Expected output: `5`.

## Integration gate

Do not route production execution to this interpreter until:
1. every supported AST node has positive and negative tests;
2. every unsupported AST node fails closed with source-positioned diagnostics;
3. resolver/type-checker/runtime behavior is covered by shared conformance tests;
4. resource-exhaustion and adversarial-input tests pass;
5. browser/Python parity and a migration/rollback plan are reviewed.

The legacy Python expression runtime remains unchanged.
