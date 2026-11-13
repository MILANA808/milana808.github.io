# AKSI Q — executable language prototype

**Version:** 0.2.0  
**Runtime:** Python 3.10+; standard library only  
**Mode:** local-first; no server, model API, WebLLM, or network required.

AKSI Q is a small domain-specific language for deterministic mathematical work,
small quantum-state simulations, and explicit concept relations. The interpreter
uses its own lexer and Pratt expression parser. It never calls Python eval or
exec and does not use Python AST for expression parsing.

> Quantum operations in this version are classical state-vector simulations.
> This is not quantum hardware and makes no quantum-advantage claim.

## Run

\`\`\`bash
python aksi_q.py examples/first.aksi
python -m unittest discover -s tests -v
\`\`\`

No package installation is required.

## Language sample

\`\`\`aksi
# ordinary deterministic mathematics
let a = vector(3, 4)
print norm(a)
print dot(a, vector(3, 4))

# one-qubit state-vector simulation
let start = [1, 0]
let balanced = h(start)
print probabilities(balanced)
print measure(balanced, shots=20, seed=7)

# two-qubit Bell state
let register = qstate(2)
let superposed = h(register, 0)
let bell = cnot(superposed, 0, 1)
print probabilities(bell)

# a tiny explicit concept graph
concept "cat" means "a domesticated mammal"
concept "mammal" means "a warm-blooded vertebrate"
concept "animal" means "a living organism that can move"
relate "cat" -> "mammal" as "is_a"
relate "mammal" -> "animal" as "is_a"
ask "cat"
infer "cat"
\`\`\`

## v0.1 language reference

| Form | Meaning |
|---|---|
| \`let name = expression\` | Bind a value |
| \`print expression\` | Evaluate and display |
| \`assert expression\` | Stop with an error unless true |
| \`concept "x" means "definition"\` | Add an explicit concept |
| \`relate "x" -> "y" as "is_a"\` | Add a typed relation |
| \`ask "x"\` | Return the stored definition and outgoing relations |
| \`infer "x"\` | Follow transitive \`is_a\` relations |

Built-ins include \`vector\`, \`dot\`, \`norm\`, \`normalize\`, \`tensor\`,
\`interfere\`, \`probabilities\`, \`h\`, \`phase\`, \`measure\`, \`sqrt\`,
\`sin\`, \`cos\`, \`exp\`, \`log\`, \`complex\`, and common collection helpers.

## Design boundaries

- No arbitrary Python attribute access, imports, file access, or network calls
  are available to AKSI source programs.
- The v0.1 parser is line-oriented; blocks, user-defined functions, modules,
  static type checking, and compilation to native machine code are not yet present.
- The concept graph is explicit symbolic data, not open-domain natural-language
  understanding.
- The state-vector simulator supports up to 10 qubits with H/X/Z, phase and
  Rx/Ry/Rz rotations, CNOT, probability extraction and seeded measurement.
  It is a classical simulator, not quantum hardware.
- An \`assert\` checks a runtime condition; it is not a formal mathematical proof.

## Roadmap

1. Freeze grammar and add parser conformance tests.
2. Add typed values and multi-qubit state-vector operations with strict size limits.
3. Add a proof object format and deterministic replay.
4. Add a browser/WASM runtime only after the language semantics are stable.
5. Benchmark against equivalent Python/NumPy and established quantum simulators.
