# AKSI Q — executable language prototype

**Language version:** 0.3 browser expression runtime + 0.2 Python reference runtime + 0.3 declarative UI profile  
**Runtimes:** Python 3.10+ reference interpreter; browser-native JavaScript runtimes  
**Mode:** local-first; no server, model API, WebLLM, or network required for language execution.

AKSI Q is an evolving domain-specific language. The expression runtime supports deterministic mathematics, bounded state-vector simulation, and explicit concept relations. The UI-language profile adds a bounded declarative page grammar, local state, numeric event effects, typed conditional blocks, and a capability-limited DOM renderer. It is not yet a general-purpose application language and does not replace the public site.

> Quantum operations in this version are classical state-vector simulations.
> This is not quantum hardware and makes no quantum-advantage claim.

## Run the Python reference runtime

```bash
python aksi_q.py examples/first.aksi
python -m unittest discover -s tests -v
```

No package installation is required.

## Run in the browser

Open [AKSI Research Lab](https://milana808.github.io/research/) and use the
existing AKSI Q editor. The browser interpreter has its own lexer and Pratt
expression parser, math and state-vector functions, explicit concept relations,
resource limits, and a user-controlled IndexedDB memory profile. The browser
profile supports `remember`, `recall`, `search` and `forget` statements.
Memory is local to the current browser and origin; export/import is provided
for backups and transfer. Browser storage is quota-limited and is not infinite
or cloud-synchronized.

The shared `conformance/common-v1.json` corpus is executed by both runtimes in
CI and compares arithmetic, boolean expressions, vectors, concept relations
and state-vector probabilities. The separate quantum differential test
compares selected circuit amplitudes. This is a tested common subset, not full
language parity.

## Declarative UI profile v0.3

The UI profile v0.3 lives in `aksi-ui.js`, with a sample page at
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
text as HTML. State-bound `value` nodes update when their declared button effect
runs. A `when "state" equals scalar { ... }` block appears only while its
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
  conditional blocks but does not yet provide loops, styles, routing,
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

## Migration sequence

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
