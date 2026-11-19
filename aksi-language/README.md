# AKSI Q — executable language prototype

**Language version:** 0.3 browser expression runtime + 0.2 Python reference runtime + 0.4 declarative UI profile  
**Runtimes:** Python 3.10+ reference interpreter; browser-native JavaScript runtimes  
**Mode:** local-first; no server, model API, WebLLM, or network required for language execution.

AKSI Q is an evolving programming-language project. The current runtime is still a prototype/DSL; the proposed general-purpose design and roadmap are in [LANGUAGE_DESIGN.md](LANGUAGE_DESIGN.md). The expression runtime supports deterministic mathematics, bounded state-vector simulation, and explicit concept relations. The UI-language profile adds a bounded declarative page grammar, local state, numeric event effects, typed conditional blocks, state-bound text inputs, and a capability-limited DOM renderer. It is not yet a general-purpose application language and does not replace the public site.

> Quantum operations in this version are classical state-vector simulations.
> This is not quantum hardware and makes no quantum-advantage claim.

## Run the Python reference runtime

```bash
python aksi_q.py examples/first.aksi
python aksi_interpreter.py examples/ast-interpreter.aksi
python -m unittest discover -s tests -v
```

No package installation is required.

## Run in the browser

Open the isolated [AKSI Q Studio](https://milana808.github.io/aksi-q-studio/) to edit and execute declarative UI programs. The existing [AKSI Research Lab](https://milana808.github.io/research/) remains the expression-language and math workspace. The browser interpreter has its own lexer and Pratt
expression parser, math and state-vector functions, explicit concept relations,
resource limits, and a user-controlled IndexedDB memory profile. The browser
profile supports `remember`, `recall`, `search` and `forget` statements.
Memory is local to the current browser and origin; export/import is provided
for backups and transfer. Browser storage is quota-limited and is not infinite
or cloud-synchronized.

The shared front-end foundation includes:

- `aksi_lexer.py`: bounded, source-spanned lexer with keyword/identifier/
  number/string/operator tokens, newline preservation, comments, decoded
  string escapes, and location-aware errors. See [LEXER-SPEC.md](LEXER-SPEC.md).
- `aksi_frontend.py`: recursive-descent declaration parser plus Pratt
  expression parser. It creates immutable, source-spanned AST nodes for
  generic functions, structs, algebraic type declarations, imports, `for` loops,
  `match` arms, bindings, blocks, calls, arrays, and member/index expressions. See [PARSER-SPEC.md](PARSER-SPEC.md).
- `aksi_resolver.py`: first lexical name-resolution pass. It checks declaration
  visibility, duplicate names, unknown names/types, mutability, and control-flow
  context. See [RESOLVER-SPEC.md](RESOLVER-SPEC.md).
- `aksi_typechecker.py`: initial primitive type-checking pass for literals,
  annotated bindings, function boundaries, operators, conditions, arrays,
  and known function calls. See [TYPECHECKER-SPEC.md](TYPECHECKER-SPEC.md).
- `aksi_flowcheck.py`: conservative return-flow pass; rejects non-Unit functions that can reach the end without a return on every visible branch. See [FLOWCHECK-SPEC.md](FLOWCHECK-SPEC.md).
- `aksi_ir.py`: source-mapped typed-IR prototype (`AKSI-Q-TIR/0.1`); known types are retained and unresolved expression types remain explicitly `Unknown`.
- `aksi_compile.py`: compiler front-end entry point that runs parse, resolution, type and return-flow checks before producing TIR. It does not yet emit executable bytecode or machine code.

The isolated Python AST interpreter prototype is now available as
`aksi_interpreter.py`. It runs a bounded subset of the shared AST with
functions, bindings, arithmetic/Boolean expressions, conditionals, loops,
returns, arrays, and explicit output. Static analysis runs before execution.
It has no filesystem/network/process/browser/FFI capabilities, rejects
unsupported AST nodes, and bounds captured output and retained results. Its exact subset and limits are documented in
[INTERPRETER-SPEC.md](INTERPRETER-SPEC.md). It is not yet wired into the
legacy `aksi_q.py` runtime or the browser product; the existing interpreter
remains unchanged.

These are front-end analysis components, not yet one production execution
pipeline. The legacy Python expression interpreter still uses
`aksi_parser.py`; it does not execute the new declaration AST. The shared
resolver and type checker must be run explicitly by tooling and have not yet
been integrated into the legacy interpreter or browser runtime. The shared
lexer is not yet the sole lexer for the separate browser UI profile.

The shared `conformance/common-v1.json` corpus is executed by both legacy
runtimes in CI and compares arithmetic, boolean expressions, vectors, concept
relations and state-vector probabilities. The separate quantum differential
test compares selected circuit amplitudes. This is a tested common subset,
not full language parity. The new resolver/type-checker/interpreter suites run in the AKSI Q language CI workflow. The isolated AST interpreter example is also executed there.


## Compiler front-end milestone 0.1

The declaration front end now parses generic function/type parameters, struct declarations, generic enum payloads, import aliases, `for` loops, and block-bodied `match` arms with wildcard, literal, binding, and tuple-constructor patterns. Resolver/type-checker passes cover generic function calls, struct and enum type declarations, loop-variable scopes, and pattern bindings for this supported subset.

Run the compiler pipeline with:

```bash
python -m unittest discover -s tests -v
```

The `aksi_compile.compile_source()` API returns static diagnostics and, only when those passes accept the source, a source-mapped `AKSI-Q-TIR/0.1` representation. The IR explicitly marks expression types it cannot infer as `Unknown`. This is a compiler front-end and typed-IR prototype, not yet a complete optimizing compiler. The new syntax is not yet executable in the legacy expression interpreter or browser runtime. Import aliases are parsed and introduced into lexical scope; module file loading, export validation, dependency resolution, and linking remain future work. Match exhaustiveness and constructor payload type inference also remain future work.

## Declarative UI profile v0.4

The UI profile v0.4 lives in `aksi-ui.js`, with a sample page at
`examples/homepage.aksiui`. It is intentionally separate from the existing
expression runtime until the language profiles can be unified without breaking
the current editor or its saved programs.

Example:

```aksiui
page "home" {
  section {
    text "AKSI MATRIX"
    text "Локальная рабочая среда"
    button "Открыть рабочее пространство" action "open-workspace"
  }
}
```

The parser produces a typed page/section/text/value/button tree, with bounded
state declarations and a restricted numeric `add` event effect. The renderer
creates DOM nodes using `createElement` and `textContent`; it never interprets
text as HTML. State-bound `value` nodes update when their declared button effect or bound text input
changes state. A `when "state" equals scalar { ... }` block appears only while its
comparison is true and reacts to local state updates. Buttons can invoke only the host callback supplied by the application,
with the action name declared in source. The language itself receives no
arbitrary DOM, network, filesystem, or browser API access.

Run its tests with:

```bash
node --test tests/aksi-ui-language.test.cjs tests/aksi-q-studio-page.test.cjs
```

## Language reference

| Form | Meaning |
|---|---|
| `let name = expression` | Bind a value |
| `print expression` | Evaluate and display |
| `assert expression` | Stop with an error unless true |
| `concept "x" means "definition"` | Add an explicit concept |
| `relate "x" -> "y" as "is_a"` | Add a typed relation |
| `ask "x"` | Return the stored definition and outgoing relations |
| `infer "x"` | Follow transitive `is_a` relations |
| `page "name" { ... }` | Declare a UI page in the separate UI profile |
| `section { ... }` | Group UI nodes |
| `text "..." ` | Render literal text |
| `state "name" = 0` | Declare bounded page-local scalar state |
| `value "name"` | Render a live binding to page state |
| `input "Name" state "name"` | Bind a bounded text input to string state |
| `button "..." action "id" state "name" add 1` | Add a finite number to a numeric state when clicked |
| `button "..." action "id"` | Render a button wired to a named host action |
| `when "state" equals true { ... }` | Render a block while a scalar state matches |

Built-ins include `vector`, `dot`, `norm`, `normalize`, `tensor`,
`interfere`, `probabilities`, `h`, `phase`, `measure`, `sqrt`,
`sin`, `cos`, `exp`, `log`, `complex`, and common collection helpers.

## Design boundaries

- The mathematical expression runtime is currently line-oriented; blocks,
  user-defined functions, modules, static type checking, and compilation to
  native machine code are not yet present there.
- The UI profile is a deliberately small separate grammar. It supports typed
  conditional blocks and bounded text inputs, but does not yet provide loops, styles, routing,
  lifecycle hooks, or async tasks.
- The UI renderer now drives the isolated `/aksi-q-studio/` demonstration route.
  The production homepage and remaining public routes still use their existing
  HTML/CSS and JavaScript; the site has not been fully migrated.
- No arbitrary Python attribute access, imports, file access, network calls,
  or arbitrary DOM access are available to AKSI source programs.
- The concept graph is explicit symbolic data generated from the canonical
  `aksi-semantic-reasoning.js` source; it is not open-domain natural-language
  understanding. Use `--knowledge data/semantic-graph.json` to load it.
- The state-vector simulator supports up to 10 qubits with H/X/Z, phase and
  Rx/Ry/Rz rotations, CNOT, probability extraction and seeded measurement.
  It is a classical simulator, not quantum hardware.
- An `assert` checks a runtime condition; it is not a formal mathematical proof.

## White paper\n\nThe evidence-based architecture, implemented/proposed feature boundary, security model, execution-receipt design, benchmark policy and staged roadmap are documented in [AKSI-Q-WHITE-PAPER.md](AKSI-Q-WHITE-PAPER.md). The paper deliberately distinguishes prototype behavior from future design goals.\n\n## General-purpose language direction\n\nThe target architecture, proposed syntax, type/effect model, compiler pipeline, security requirements, benchmark suite and staged acceptance gates are specified in [LANGUAGE_DESIGN.md](LANGUAGE_DESIGN.md). That RFC describes a target, not features already implemented.\n\n## Migration sequence

1. Continue stabilizing the declarative UI grammar and its security/resource tests.
2. Add structured state updates, inputs, lists and accessible interaction primitives,
   then route/lifecycle primitives with explicit host capabilities.
3. Unify UI and expression profiles under a versioned AKSI Q module/runtime
   model and shared conformance fixtures.
4. Migrate one isolated route and verify accessibility, mobile behavior,
   feature parity, offline behavior, and rollback.
5. Migrate the homepage and remaining routes only after route-level acceptance.

A UI language test passing does not mean the website has been rewritten.
Every migrated page must actually be driven by AKSI Q source and pass its
browser and regression checks before the old implementation is removed.
