# AKSI Q — language design RFC 0001

**Status:** proposed architecture; not yet implemented as a complete language
**Scope:** general-purpose programming language and application runtime for AKSI MATRIX
**Principle:** ambitious design, conservative claims, executable evidence

## 1. Mission

AKSI Q is intended to become a general-purpose, readable, safe, local-first programming language. It must be able to express algorithms, data models, user interfaces, application workflows, mathematical computation, and controlled interaction with the outside world.

It must not be described as the world's best language until independent, reproducible benchmarks show where it is better. The engineering target is to make it unusually strong across safety, clarity, developer experience, portability, and verifiable behavior without pretending that one language can be best at every workload.

## 2. Design goals (in priority order)

1. **Safety by default.** No arbitrary code evaluation, implicit network/file/process access, hidden mutation, or ambient authority.
2. **Understandable semantics.** Small number of orthogonal language rules; predictable evaluation order; explicit errors and effects.
3. **General-purpose expressiveness.** Functions, modules, data types, pattern matching, collections, iteration, errors, interfaces/traits, generics, and reusable packages.
4. **Excellent application development.** Declarative UI, state, events, routing, async tasks, storage, and accessibility belong to the language ecosystem, not scattered hand-written glue.
5. **Strong mathematics.** Exact integers where appropriate, checked numeric operations, complex/vector/matrix types, dimensional units, reproducible numerical kernels, and optional differentiable/parallel computation as separately validated libraries.
6. **Portability.** A deterministic reference interpreter first; portable bytecode/WASM backend next; native compilation only when justified.
7. **Interoperability.** Explicit, capability-gated interfaces to JavaScript, Web APIs, Python, and native libraries. No unsafe FFI by default.
8. **Tooling.** Formatter, diagnostics, language server, debugger, package manager, test runner, documentation generator, and reproducible builds.
9. **Verifiability.** Source spans, typed intermediate representation, contracts, property tests, deterministic execution mode, and machine-readable execution receipts.
10. **Local-first operation.** Core compiler and runtime must work offline in the browser and on desktop; network features are optional capabilities.

## 3. Proposed language character

AKSI Q should combine:
- expression-oriented syntax and algebraic data types;
- static type checking with inference for local bindings;
- immutable-by-default values and explicit mutable state;
- ownership/borrowing rules for memory-safe systems code where needed;
- structured concurrency and explicit async effects;
- capability-based security;
- declarative UI as a first-class module, not a separate incompatible grammar;
- deterministic core semantics, with nondeterministic effects declared at boundaries.

Avoid novelty for its own sake. Every feature needs a use case, semantics, tests, and a maintenance cost justification.

## 4. Illustrative syntax (design sketch, not executable today)

```aksi
module hello

type Result<T, E> =
    | Ok(T)
    | Err(E)

fn greet(name: String) -> String {
    "Привет, " + name
}

fn main() -> Result<Unit, Error> {
    let name = "Мир"
    print(greet(name))
    Ok(())
}
```

A UI module should use the same declarations, types, functions, and imports:

```aksi
module app.home

state count: Int = 0

ui page Home {
    text("AKSI MATRIX")
    value(count)
    button("Добавить") {
        count += 1
    }
}
```

A permission must be granted at the application boundary, not silently acquired by a source file:

```aksi
capability weather: Network = grant("weather.read")

task forecast(city: String) -> Result<Forecast, NetworkError>
    uses weather
{
    weather.get("/forecast", query = { city: city })
}
```

These examples are target syntax only. The current v0.4 UI profile does not parse them.

## 5. Core semantic model

### 5.1 Types
- Primitive: Unit, Bool, Int, Float, Decimal (where implemented), String, Bytes.
- Composite: tuples, records, enums/algebraic data types, arrays, slices, maps, sets, option/result.
- Functions are typed values with explicit parameter and return types.
- Generic types and functions use constrained type parameters.
- Numeric conversions are explicit unless proven lossless.
- Null is not a universal value; optionality uses Option<T>.

### 5.2 Mutability and memory
- Bindings are immutable by default.
- Mutation requires an explicit mutable binding or state declaration.
- The implementation must choose and document a memory model before native compilation. The preferred direction is ownership/borrowing with safe shared references; do not claim Rust-level guarantees until the compiler enforces and tests them.
- Browser GC is acceptable as an implementation detail for the first runtime, provided language-level aliasing and mutation semantics remain consistent.

### 5.3 Effects and capabilities
Functions that perform I/O, network access, persistent storage, clock access, randomness, navigation, clipboard, or process execution declare effects/capabilities.
- Pure computation remains deterministic and testable.
- Capabilities are injected by the host and can be denied.
- A denied capability produces a typed error; it must not silently fall back to ambient access.
- Public browser code must never contain secrets.

### 5.4 Errors and concurrency
- Expected failures use Result<T,E>; optional values use Option<T>.
- Unexpected runtime faults remain diagnosable and must not be swallowed.
- Async work uses structured tasks with explicit cancellation and bounded resource budgets.
- Child tasks cannot outlive their owning scope unless explicitly detached under a host policy.
- Race behavior and ordering must be documented and tested.

### 5.5 UI
- UI declarations compile to a typed UI intermediate representation.
- Accessibility properties and keyboard behavior are validated.
- Layout and style use finite, allowlisted tokens or typed values.
- Event handlers are ordinary typed functions with declared effects.
- State transitions are explicit and testable.
- DOM is an output target, not a capability freely exposed to source programs.

## 6. Compiler and runtime architecture

```text
.aksi source
  -> lexer with source spans
  -> parser
  -> syntax AST
  -> name resolution and module graph
  -> type/effect checker
  -> typed IR
  -> optimization passes (only semantics-preserving)
  -> interpreter / portable bytecode / WASM
  -> capability-checked host adapters
```

Required independently testable components:
1. Grammar and parser with stable diagnostics.
2. Resolver and module/package graph.
3. Type checker and effect checker.
4. Typed IR with explicit source maps.
5. Reference interpreter for language semantics.
6. Browser and Python adapters using shared conformance fixtures.
7. WASM backend after interpreter semantics stabilize.
8. Tooling and package ecosystem.
9. UI runtime using the same compiler pipeline.

No stage may use eval, Function constructors, or source-to-HTML injection.

## 7. Differentiators to validate, not merely advertise

- **Evidence-aware execution:** optional receipts record program version, input hashes, capability grants, deterministic outputs, and test results. Receipts prove only the recorded execution facts, not that a program is correct.
- **Math as a first-class domain:** dimension-aware quantities, vector/matrix primitives, numerical error reporting, and reproducible kernels. Performance must be compared against established numerical libraries.
- **Explainable diagnostics:** errors identify source span, violated rule, and a practical correction.
- **Capability-secure apps:** an application can run offline with a minimal explicit permission set.
- **One language across logic and UI:** the same type system, modules, functions, and tests apply to both.

## 8. Implementation roadmap and exit gates

### Stage A — specification and semantic baseline
- Freeze grammar proposal, type rules, evaluation order, errors, mutability and effect model.
- Build a conformance corpus before adding syntax.
- Add negative tests for invalid programs and resource exhaustion.
**Exit:** two independent implementations agree on all shared fixtures; grammar and semantics are versioned.

### Stage B — general-purpose interpreter
- Structured blocks, functions, lexical scopes, modules/imports.
- Types, enums, pattern matching, Option/Result.
- Collections, iteration, recursion limits and execution budgets.
- Formatter and useful diagnostics.
**Exit:** write and test nontrivial algorithms and small CLI-style programs without using UI-only constructs.

### Stage C — unified UI/application language
- Move current UI profile onto the common AST and type checker.
- Add lists, components, typed events, styles/layout, routing and lifecycle.
- Add permissioned storage, navigation and async tasks.
**Exit:** migrate one existing AKSI route with parity, accessibility and browser tests.

### Stage D — portable runtime and tooling
- Bytecode/WASM target, debugger, language server, package manager and reproducible builds.
- Cross-runtime conformance and fuzzing.
**Exit:** same program passes conformance on browser and non-browser runtime; reproducible release artifacts.

### Stage E — performance and ecosystem
- Benchmark against relevant alternatives on identical workloads.
- Optimize only measured bottlenecks; publish methodology and raw results.
- Stable language release and compatibility policy.
**Exit:** independent users can install, learn, test, debug and ship applications without relying on AKSI MATRIX internals.

## 9. Required benchmark suite

Publish source, environment, compiler/runtime versions, warmup policy, repeated measurements, memory use, and correctness checks for:
- integer and floating-point arithmetic;
- strings and Unicode;
- collections and algorithms;
- parsing/serialization;
- concurrency and async I/O;
- UI startup/render/update;
- numerical linear algebra;
- compile time and peak memory;
- binary/WASM size;
- cold-start and offline behavior;
- developer task completion and diagnostic usefulness.

Compare with appropriate baselines (for example Python, JavaScript/TypeScript, Rust, Go, Kotlin, Swift) per workload. Do not collapse all results into one misleading score. Publish wins, losses, and confidence intervals.

## 10. Security and quality requirements

- Parser/compiler fuzzing and malformed-input tests.
- Resource budgets for source size, AST size/depth, recursion, memory and execution time.
- No ambient authority; capability tests for allow and deny cases.
- Dependency audit and reproducible lockfiles.
- Property-based and differential tests.
- Accessibility and browser compatibility tests for UI.
- Clear stable/experimental feature labels.
- No claims of formal verification, memory safety, quantum advantage, or performance superiority without the corresponding proof/evidence.

## 11. Current state (truthful)

The repository currently has:
- a bounded line-oriented expression runtime and a Python reference interpreter;
- a separate declarative UI profile v0.4 with scalar state, text inputs, conditional blocks and restricted button effects;
- an isolated AKSI Q Studio demonstration route in the working branch.

It does not yet have the general-purpose compiler architecture described above: no unified AST/type checker/module system, no user-defined functions in the UI profile, no package manager, no stable bytecode/WASM backend, and no complete self-hosting compiler. The Studio route is not proof that the full AKSI MATRIX website has been migrated.

## 12. Governance

- Semantic changes require an RFC, tests, versioning, and migration notes.
- Stable syntax must not be silently reinterpreted.
- Every release publishes known limitations and conformance status.
- The language belongs to its users: document contribution, licensing, security reporting, and compatibility policy before calling it a public ecosystem.
