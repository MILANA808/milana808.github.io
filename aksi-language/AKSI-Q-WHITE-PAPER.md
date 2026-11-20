# AKSI Q — White Paper
## A language for explicit computation, controlled agency, and verifiable execution

**Document status:** engineering white paper, version 0.1  
**Language status:** experimental; multiple prototype profiles, not yet a unified 1.0 language  
**Repository branch:** `aksi-q-site-rewrite`  
**Last reviewed:** 2026-11-19

> AKSI Q is an ambitious language research and engineering project. This document separates implemented behavior from proposed architecture. A feature is not considered implemented merely because it appears in a design example.

## Abstract

AKSI Q explores a programming model in which computation, knowledge, authority, and evidence are explicit parts of a program's design. The intended language is general-purpose: it should eventually support algorithms, data models, applications, user interfaces, mathematical workloads, and carefully controlled interaction with external systems.

Its central research direction is the combination of:

1. a small, understandable language core;
2. explicit types and effects;
3. capability-based access to host resources;
4. first-class mathematical and symbolic representations;
5. bounded execution and structured concurrency;
6. reproducible, machine-readable execution records;
7. a unified path from application logic to declarative UI.

This combination is a design hypothesis, not a proven world-first invention. The project must earn any claim of superiority through reproducible tests, independent review, benchmarks, and real user workloads.

## 1. Mission and design principles

AKSI Q is being designed around six principles:

- **Clarity:** syntax and semantics should be learnable and predictable.
- **Control:** a program receives only the authority explicitly granted by its host.
- **Evidence:** execution records should make inputs, outputs, errors, and external effects inspectable.
- **Mathematical honesty:** numerical approximations, uncertainty, and simulation boundaries must be visible.
- **Local-first portability:** the core should run without a remote model or mandatory cloud service.
- **Composability:** UI, computation, data, and workflows should share one type and module system rather than become unrelated mini-languages.

Novelty is not a goal by itself. Every feature must justify its complexity with a concrete use case and conformance tests.

## 2. Current implementation — verified project baseline

The repository currently contains several related prototypes. They are not yet one fully integrated compiler/runtime.

### 2.1 Language front end

- A bounded lexer with source locations and location-aware errors.
- A declaration parser and Pratt expression parser producing immutable, source-spanned AST nodes.
- An initial name resolver for scopes, declarations, unknown names/types, mutability, and control-flow context.
- An initial primitive type checker for literals, bindings, function boundaries, operators, conditions, arrays, and known calls.

The new front end is not yet the sole front end for every runtime profile. The resolver and type checker are not yet a complete type/effect system.

### 2.2 Python AST interpreter

The experimental AST interpreter executes a documented subset including functions, bindings, expressions, conditionals, loops, returns, arrays, and output. It runs static analysis by default and rejects unsupported syntax.

It applies resource bounds and has no ambient filesystem, network, process, browser, or arbitrary FFI access. A typed host-capability interface exists in the Python prototype, with argument/result checks and call quotas. Declared effect labels are metadata; they are not a complete sandbox or effect checker.

The interpreter is not yet unified with the legacy expression runtime or browser runtime.

### 2.3 Mathematical and state-vector profile

The expression runtime provides elementary mathematics, complex values, vectors, tensor operations, interference, probabilities, and a bounded state-vector simulator.

The current quantum profile simulates state vectors classically, up to the documented register limit. It does not use quantum hardware and does not demonstrate quantum advantage. Floating-point arithmetic is not exact symbolic arithmetic; interval/error-bound arithmetic is not yet implemented.

### 2.4 Symbolic knowledge profile

The current concept store supports explicit concept definitions and typed relations. Its documented transitive inference is limited to `is_a` graph reachability. It is not a general theorem prover, causal engine, or open-domain natural-language reasoner.

### 2.5 Browser UI profile

A separate bounded declarative UI grammar parses page structures and renders through safe DOM APIs such as `createElement` and `textContent`. It supports constrained local state, text, buttons, conditional display, and limited event effects. It does not grant source programs arbitrary DOM or browser access.

### 2.6 Validation boundaries

Automated repository tests establish behavior only for the cases they execute. They do not prove security, production readiness, complete language conformance, or superiority over other languages. A full unification and real-browser acceptance effort remains necessary.

## 3. The proposed language

The following is target design, not a promise that every example currently runs.

### 3.1 One language, several execution domains

AKSI Q should use one syntax, type system, module model, and compiler pipeline for:

- pure computation;
- mathematical and scientific programs;
- data and knowledge models;
- UI declarations;
- asynchronous workflows;
- controlled host interactions.

Different domains may have different standard libraries and capability policies, but should not require incompatible language grammars.

### 3.2 Types and data

Target features:

- static types with local inference;
- algebraic data types and exhaustive pattern matching;
- records, tuples, arrays, maps, and sets;
- `Option<T>` and `Result<T, E>` instead of implicit null/error conventions;
- generics with explicit constraints;
- explicit numeric conversions;
- immutable bindings by default and explicit mutable state.

The implementation must define overflow, equality, numeric promotion, collection ordering, and serialization semantics before declaring the type system stable.

### 3.3 Effects and capabilities

External authority should be supplied by the host, not silently acquired by a program.

Target effect classes include reading, writing, network, clock, randomness, storage, navigation, device access, and process execution. A function should declare the effects/capabilities it needs. The host may grant, restrict, meter, or deny them.

A denied capability must produce an explicit error. It must not silently fall back to ambient access.

The compiler should eventually reject effect mismatches statically; runtime checks remain necessary at trust boundaries. A capability system is not automatically a secure sandbox: host implementations, resource limits, and isolation boundaries require separate review.

### 3.4 Mathematical semantics

The math profile should grow carefully:

- arbitrary-precision integers with documented resource limits;
- checked real and complex operations;
- vectors, matrices, tensors, and linear algebra;
- units and dimensional analysis;
- exact symbolic expressions where practical;
- interval arithmetic and propagated numerical error;
- reproducible random-number generators with explicit seeds;
- optional automatic differentiation and parallel execution after validation.

Each numeric type must state whether it is exact, approximate, bounded, or probabilistic. The language must never label a floating-point result as an exact proof.

### 3.5 Symbolic knowledge and evidence

A future knowledge layer may represent concepts, typed relations, claims, sources, and evidence separately. Inference rules must be named, bounded, and inspectable.

A proposed evidence object should distinguish:
- the claim being evaluated;
- the source and exact supporting passage;
- whether the passage supports, contradicts, or does not resolve the claim;
- who or what reviewed it;
- the rule and version used;
- unresolved uncertainty.

A hash can detect later changes to bytes when compared with a trusted reference. A hash alone does not prove truth, authorship, time, or correctness. Semantic inference must not silently turn missing evidence into a fact.

### 3.6 Concurrency and resource control

The target runtime should provide structured concurrency, explicit cancellation, bounded queues, deadlines, and per-task resource budgets. Child tasks should remain owned by their parent scope unless the host explicitly authorizes detachment.

Deterministic execution should be available for the pure subset. Nondeterministic effects must be isolated and recorded at explicit boundaries.

## 4. Compiler and runtime architecture

Proposed pipeline:

```text
Source
  -> Lexer
  -> Parser
  -> Name / module resolution
  -> Type checking
  -> Effect and capability checking
  -> Typed intermediate representation
  -> Optimisation (semantics-preserving)
  -> Interpreter / portable bytecode / WASM
  -> Capability host
  -> Execution receipt
```

The typed intermediate representation (TIR) should become the contract shared by interpreter, browser runtime, and future backends. Backends must pass the same conformance corpus. Optimisations must preserve observable behavior and be tested against the reference interpreter.

A portable bytecode or WASM backend is a future milestone, not a current capability. Native compilation should be considered only after semantics, memory model, and portability requirements are stable.

## 5. Execution receipts

A major proposed differentiator is a standard receipt for every auditable run. A receipt should include, where applicable:

- source digest and language version;
- compiler/runtime version;
- declared and granted capabilities;
- normalized inputs or input digests;
- deterministic seed and execution mode;
- ordered external-effect events;
- outputs and structured errors;
- resource usage and limit outcomes;
- referenced external data and their verification status.

Receipts should be canonical, versioned, and testable. Signing a receipt may establish that a particular key signed those bytes; it does not establish that the computation was correct or the inputs were truthful. Reproducibility requires retaining the actual inputs or durable references, not only hashes.

## 6. Security model

Security goals for the eventual language:

1. No implicit ambient authority.
2. No arbitrary code evaluation in the core runtime.
3. Explicit, typed capability boundaries.
4. Fail-closed handling of unsupported syntax and invalid values.
5. Bounded memory, CPU steps, recursion, output, and external calls.
6. Structured errors with source locations.
7. Conformance, fuzz, differential, and adversarial testing.
8. Independent security review before running untrusted programs in a service.

These are engineering goals. The existing prototypes do not constitute a formal security proof or a hardened hostile-code sandbox.

## 7. Potentially distinctive features — and what remains unproven

The most promising combination is not a single magical syntax feature. It is the attempt to bring together:

- capability-aware application programming;
- explicit evidence and provenance records;
- mathematical and symbolic computation;
- bounded, inspectable execution;
- UI and workflow declarations in the same language ecosystem.

Many individual ideas already exist in programming languages, proof systems, workflow engines, scientific computing, and secure runtimes. AKSI Q must therefore demonstrate value in the integration, developer experience, and measurable guarantees. No claim is made that these ideas are globally unique or that AKSI Q is already superior to established languages.

## 8. Roadmap and release gates

### Phase A — unify semantics
- Publish a versioned grammar and normative value/evaluation semantics.
- Choose one canonical AST and typed IR.
- Align Python and browser parsing and runtime behavior.
- Define exact conformance fixtures and error contracts.

**Gate:** the same conformance suite passes across supported runtimes; mismatches are documented, not hidden.

### Phase B — complete the type and effect system
- Finish type inference and function signatures.
- Add algebraic data types and pattern matching.
- Specify effect rows/capability declarations.
- Reject invalid effect usage before execution where statically knowable.

**Gate:** positive and negative compiler tests, property tests, and explicit soundness boundaries.

### Phase C — trustworthy runtime
- Implement canonical execution receipts.
- Add deterministic replay for the pure subset.
- Harden quotas, cancellation, and capability host boundaries.
- Fuzz lexer, parser, type checker, interpreter, and receipt parser.

**Gate:** reproducible test runs, adversarial test report, independent security review.

### Phase D — application language
- Unify UI declarations with the main AST and type system.
- Add structured async tasks, storage abstractions, routing, and accessibility checks.
- Build formatter, package tooling, debugger, and language server.

**Gate:** a real application built end-to-end without a parallel incompatible DSL.

### Phase E — portable compiler
- Stabilize typed IR.
- Add portable bytecode or WASM backend.
- Differentially test backend output against the reference interpreter.
- Publish performance, memory, startup, and portability benchmarks.

**Gate:** independent reproducible benchmarks on declared workloads.

## 9. Benchmark policy

AKSI Q should be compared with relevant established tools, not with a vague claim that it is “better than all languages.” Workloads should include:

- arithmetic and numeric kernels;
- parsing and data transformation;
- algorithms and collections;
- application startup and memory use;
- UI rendering and interaction;
- async task scheduling;
- capability denial and audit overhead;
- deterministic replay and receipt verification;
- developer task completion and error diagnosis.

Publish source code, hardware/software environment, workload definitions, warm-up rules, repeated measurements, and raw results. Report regressions as well as wins.

## 10. What AKSI Q must never claim without evidence

- That it is the world's best or most advanced programming language.
- That it has quantum advantage or runs on quantum hardware.
- That a hash proves truth, authorship, or trusted time.
- That a prototype is a complete operating system or secure sandbox.
- That a symbolic graph is a general reasoning engine.
- That a model-free runtime is an open-domain intelligent system.
- That a passing CI suite proves production readiness.

## 11. References inside this repository

- [Language specification](LANGUAGE-SPEC.md)
- [Language design RFC 0001](LANGUAGE_DESIGN.md)
- [Lexer specification](LEXER-SPEC.md)
- [Parser specification](PARSER-SPEC.md)
- [Resolver specification](RESOLVER-SPEC.md)
- [Type checker specification](TYPECHECKER-SPEC.md)
- [Interpreter specification](INTERPRETER-SPEC.md)
- [Repository README](README.md)

## Conclusion

AKSI Q should aim to be a language in which computation is expressive, authority is explicit, mathematics is honest, and execution is inspectable. That is a serious and testable research direction. Its distinction will be established only when the proposed semantics are implemented consistently, independent users can build useful software with it, and public benchmarks demonstrate measurable advantages.

**The ambition is large. The claims must remain smaller than the evidence — until the evidence catches up.**
