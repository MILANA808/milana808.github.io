# AKSI Q Language Specification — Draft 0.3

**Status:** executable prototype specification; subject to change before 1.0.
**Runtime targets:** Python 3.10+ reference interpreter (v0.2) and browser-native JavaScript runtime (v0.3 profile). **Encoding:** UTF-8.
**File extension:** .aksi.

## 1. Design goals

AKSI Q is a domain-specific language for deterministic mathematical computation,
explicit symbolic knowledge, and reproducible state-vector experiments.

The language aims to be readable, testable, explicit about facts and hypotheses,
deterministic where possible, bounded in resource use, and independent of its
reference implementation. It is not currently a general-purpose replacement
for Python, Rust, C, JavaScript, or a foundation language model.

## 2. Lexical conventions

- One statement per physical line; # starts a comment outside strings.
- Identifiers match [A-Za-z_][A-Za-z0-9_]*.
- Strings use single or double quotes; numbers are integers or floats.
- Lists use square brackets; tuples use parentheses.
- Expressions support arithmetic, comparisons, boolean operators, indexing,
  and direct calls to registered built-ins.
- Attribute access, imports, comprehensions, lambdas, arbitrary object access,
  and indirect function calls are not part of the language.

## 3. Statement forms

    let name = expression
    print expression
    assert expression
    concept "name" means "definition"
    relate "subject" -> "object" as "relation"
    ask "name"
    infer "name"

A binding evaluates its expression once and stores it in the current program
environment. Built-in names cannot be overwritten. Print returns an evaluated
value. Assert stops execution with a source-located error if false.

Concept stores an explicit definition. Relate stores an explicit typed edge.
Ask retrieves a stored definition and outgoing relations. Infer follows
transitive is_a edges only; it does not infer unstated facts or causes.

## 4. Value model

The reference runtime currently supports booleans, integers, real and complex
numbers, strings, null, lists, tuples, finite-dimensional complex vectors, and
explicit concept/relation records. Static user-visible types, structs, modules,
functions and a persistent heap are not implemented.

## 5. Mathematical built-ins

The reference interpreter exposes elementary functions and vector, dot, norm,
normalize, tensor, interfere and probabilities. Dot is conjugate-linear in
the first argument. Normalize rejects the zero vector. Tensor is bounded.
Interfere adds corresponding amplitudes and requires equal vector lengths.
Probabilities returns normalized squared amplitude magnitudes.

Numerical results use Python floating-point and complex arithmetic. Exact
symbolic arithmetic and interval/error-bound arithmetic are not implemented.

## 6. Quantum state-vector operations

A state is a complex vector of length 2^n, with 1 <= n <= 10. Qubit index 0 is
the least-significant bit of the computational-basis index.

- qstate(n) creates |0...0>.
- h(state) applies H to a one-qubit state.
- h(state, target) applies H to a register qubit.
- x(state, target=0) and z(state, target=0) apply Pauli gates.
- phase(state, theta) or phase(state, theta, target) applies a phase gate.
- rx, ry, rz apply single-qubit rotation gates.
- cnot(state, control, target) applies a controlled-X gate.
- measure(state, shots=1, seed=0) samples the computational basis.

Measurement is pseudo-random and reproducible for the same state, shot count,
seed and runtime version. It is not a physical measurement and demonstrates
no quantum advantage. Invalid indices, repeated CNOT qubits, non-power-of-two
state lengths, zero-norm states and registers above 10 qubits are rejected.


## 8. Browser runtime and persistent memory profile (v0.3)

The browser runtime implements the expression grammar and bounded mathematical,
concept and state-vector operations in JavaScript. It exposes the following
additional statements, which are currently browser-profile extensions and are
not yet implemented by the Python v0.2 reference runtime:

    remember "key" = expression
    recall "key"
    search "query"
    forget "key"

The browser profile stores explicitly requested records in IndexedDB on the
current origin and browser. It does not automatically store conversations or
synchronize data to a server. Browser storage is quota-limited and may be
cleared by browser settings; users should export backups for portability.
A record SHA-256 digest detects changes relative to the stored digest but does
not prove truth, authorship or trusted time. Import validates the export schema
and record size bounds. Cross-device sync, end-to-end encrypted sync, automatic
conversation ingestion and unbounded storage are not implemented.

The browser runtime is not yet claimed to be fully conformant with the Python
reference implementation. The shared fixtures and differential tests remain
release gates.

## 9. Symbolic knowledge

The concept store is explicit and local to one runtime instance. The current
inference rule is intentionally narrow: A is_a B and B is_a C imply that
infer A includes B and C. This is graph reachability, not a general theorem
prover. It does not infer causality, temporal order or natural-language
equivalence. An unknown relation is not automatically false.

## 8. Safety and resource limits

The reference interpreter never invokes Python eval or exec. It evaluates a
restricted AST allowlist and rejects imports, attribute access, indirect calls
and arbitrary code objects. It limits source size, line length/count, expression
length, AST nodes, vector length, tensor output, exponent size and qubit count.

These controls reduce accidental and some adversarial resource use. They are
not a formal security proof. Fuzzing and security review are required before
executing untrusted programs in a service.

## 9. Errors and reproducibility

Errors include a source line number where possible. A program executes
statements in order and stops at the first runtime error. Rollback and
transaction semantics are not promised.

A future reproducibility receipt should include source bytes and SHA-256,
language/runtime versions, deterministic seed, inputs, external data references,
outputs, error status and environment metadata. Hashes/signatures establish
integrity or attribution, not mathematical correctness or factual truth.

## 10. Compatibility

Before version 1.0, grammar and built-ins may change. Every breaking change
must update this document, examples, tests and version number together.
