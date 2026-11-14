# AKSI Q Integration Plan

## Existing canonical components inspected

The first integration pass inspected these files on main in
MILANA808/milana808.github.io:

| Existing component | Confirmed role | Integration decision |
|---|---|---|
| aksi-quantum.js | State-vector simulator, gates, controlled gates, Bell pair, QFT/Grover experiments, optional IBM adapter | Reuse as reference and cross-check; do not copy blindly |
| aksi-semantic-reasoning.js | Built-in concept graph, aliases, definitions, ancestor paths, relation explanations | Preserve as canonical Russian concept source; export/version data for AKSI Q |
| aksi-symbolic-inference.js | Explicit facts/rules, variable matching, forward chaining, contradiction detection and proof traces | Port semantics behind a separately tested AKSI Q inference API |
| aksi-native-language-core.js | Russian intent classification and evidence-bounded answer composition | Treat as answer adapter, not language parser or general LLM |
| aksi-core-v3.js | Decision calibration, abstention, receipts, hashing and signing helpers | Integrate through versioned contracts; keep correctness verification separate |
| AKSI-SYSTEM-MAP.md | Canonical ownership, security and runtime boundaries | Use as product architecture baseline |
| docs/AKSI_REPOSITORY_UNIFICATION.md | Repository roles and migration gates | Use as migration policy |

## Important implementation finding

The repository already contains a richer JavaScript quantum simulator than the
initial AKSI Q v0.1 interpreter. The v0.2 prototype adds a native AKSI Pratt expression parser and a bounded Python
state-vector subset (up to 10 qubits, H/X/Z, phase, Rx/Ry/Rz and CNOT) so the
language can express and test Bell-state preparation without browser or network.

This is an independent reference implementation, not yet a line-for-line port
or verified equivalent of aksi-quantum.js. Differential tests must compare the
same circuits and probability distributions before equivalence is claimed.

## Migration order

1. Quantum differential tests: Bell state, Pauli gates, rotations, CNOT,
   QFT/Grover fixtures where mathematically appropriate, normalization and
   deterministic seeded measurement.
2. Semantic export: versioned JSON schema for concept IDs, aliases, definitions,
   kinds, features and typed parent relations. Generate it from existing source
   rather than manually duplicating data.
3. Inference compatibility: stable fact/rule/proof schema and differential
   fixtures for the existing forward-chaining reasoner.
4. Answer composition: connect language programs to semantic/inference results
   through explicit APIs; do not turn unsupported questions into generated facts.
5. Receipts: bind source, runtime version, inputs, output, evidence and proof
   trace into a deterministic receipt. Signature verification stays separate
   from truth/correctness verification.
6. Browser runtime: implemented as an experimental JavaScript interpreter and
   connected to the public Research Lab. The browser profile adds explicit
   IndexedDB memory statements; full Python/JavaScript parity is still open.

## Repository inventory boundary

The account inventory returned 21 repositories. This is a metadata/tree
inventory, not a complete source audit. Principal AKSI candidates include
milana808.github.io, Milana-backend, AKSI-TEST-1, AKSI-, aksi_apps and
AKSI-GROK-HYBRID*. Other repositories include private/unrelated projects,
external/reference mirrors, large upstream-derived codebases and small
placeholders. Classify license, commit ancestry, dependencies, unique code
and tests before migrating any of them.

No source from private repositories or external upstream projects was copied
into this language prototype by this integration pass.

## Exit criteria for an integrated release

- [ ] Versioned grammar and parser conformance suite.
- [ ] Python and JavaScript runtimes pass the same conformance fixtures.
- [ ] Quantum outputs match independent reference fixtures within tolerances.
- [ ] Semantic export is generated from one canonical source.
- [ ] Inference proof traces are deterministic and independently replayable.
- [ ] Resource limits and untrusted-input tests pass.
- [ ] Runtime receipts identify code, inputs, seed and outputs.
- [x] Product UI reports exact runtime capabilities and limitations.
- [x] Browser-native interpreter and user-controlled local memory are available in Research Lab.
- [ ] Browser and Python runtimes pass a shared conformance suite.
- [ ] Memory import/export and record-integrity checks receive browser integration tests.
- [ ] No quantum advantage, AGI or general-understanding claim without independent evidence.
