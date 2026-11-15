# AKSI Q — full-site language migration plan

**Status:** phased implementation; first isolated browser route exists; full-site migration not complete
**Target:** migrate the public AKSI MATRIX site from hand-written page logic to AKSI Q as the primary application language, without breaking the live site during transition.
**Working branch:** aksi-q-site-rewrite

## Truthful starting point

The repository already contains a browser interpreter (aksi-q-browser.js) and a research editor. AKSI Q currently supports bounded, line-oriented programs, expressions, mathematical/vector operations, explicit concept relations, state-vector simulation, and opt-in IndexedDB memory.

It is not yet a general-purpose application language. It does not currently provide a complete module system, user-defined functions, typed application components, DOM rendering, event handlers, routing, CSS/layout, or a permissioned browser capability model. Replacing every page in one untested change would be unsafe.

## Target architecture

AKSI Q source -> lexer -> parser -> typed AST -> validator -> capability-checked runtime -> UI renderer, events/state, router, storage adapter, math/semantic/inference/quantum libraries, evidence receipts -> static browser bundle.

AKSI Q remains the source language. A small, auditable JavaScript host runtime may implement browser primitives; application behavior and page composition must live in AKSI Q source. No eval, Function, arbitrary script execution, implicit network access, or secret storage in public browser code.

## Migration rules

1. Keep main and the current public site deployable throughout migration.
2. Work in vertical slices; every slice includes tests and a working browser demonstration.
3. Do not bulk-convert HTML/CSS/JavaScript into fake .aksi files. A page is migrated only when its actual behavior is driven by AKSI Q.
4. Preserve current URLs, page content, accessibility, mobile layout, local memory, privacy controls, and working features.
5. Keep HTML/CSS as temporary rendering/build substrate until the AKSI Q UI runtime can replace their behavior.
6. Keep external services disconnected by default. Network, file, clipboard, speech, downloads, and navigation require explicit capability grants.
7. Do not merge or deploy a slice until parser/runtime, security, route, and browser smoke tests pass.
8. Document unsupported language features and degraded runtime states honestly.

## Required language milestones

### Q1 — Application language foundation
- Versioned grammar and AST schema.
- Lexical scopes, declarations, functions, modules, structured blocks, source-span errors.
- Static validation and bounded execution budgets.
- Shared Python/browser conformance corpus for every supported construct.

### Q2 — Declarative interface
- Typed UI nodes: page, section, text, input, button, list, panel.
- State declarations and deterministic event handlers.
- Safe renderer with text-only defaults and explicit attribute/style allowlists.
- Accessibility labels, keyboard behavior, responsive layout primitives.
- UI snapshots and browser interaction tests.

### Q3 — Application capabilities
- Router and lifecycle.
- Permission-gated storage, clipboard, speech, downloads, and external navigation.
- Explicit async/task model with cancellation and error propagation.
- No arbitrary DOM access from user-authored programs.

### Q4 — Site migration
- Convert the homepage first as a complete vertical slice.
- Then migrate Research Lab, Math/Quantum Lab, memory, diagnostics, and remaining routes in dependency order.
- Keep legacy routes as tested adapters until each replacement passes parity checks.
- Remove old page logic only after route-by-route parity and rollback checks.

## Acceptance gates

A slice is complete only when its AKSI Q source is the source of truth for the migrated behavior; the browser runtime executes it without dynamic code evaluation; supported constructs pass conformance tests; unit, security, accessibility, route, and browser interaction tests pass; no public route or essential feature regresses; and CI plus deployment are explicitly verified.

## Implemented slices (branch aksi-q-site-rewrite)

- Bounded declarative UI AST and safe DOM renderer.
- Page-local scalar state, live value bindings, numeric button effects.
- Typed reactive conditional blocks using `when "state" equals scalar { ... }`.
- Bounded text inputs bound to declared string state.
- Isolated `/aksi-q-studio/` route linked from the homepage in the working branch; its source is executed by the browser runtime.
- CI coverage for UI parser/renderer, Studio route wiring and interactions, Python interpreter, examples, cross-runtime fixtures and quantum state-vector parity.

These changes are still in a draft PR. They have not been merged or deployed to the public site. The actual public homepage remains on its existing implementation.

## Next implementation slices

1. Add repeatable lists, safe layout/style tokens, and accessible input/button semantics.
2. Unify UI and expression profiles under a versioned module/runtime model with shared typed values and diagnostics.
3. Add a permissioned route adapter and lifecycle/task model.
4. Add a real-browser test harness before declaring route behavior verified in a browser.
5. Migrate one existing low-risk route, compare behavior/accessibility/mobile/offline behavior, and keep rollback.
6. Migrate the homepage only after route-level acceptance gates pass.

## Non-claims

This migration does not by itself create a trained foundation model, general intelligence, quantum hardware, or quantum advantage. AKSI Q is an evolving programming language/runtime. Its reasoning capabilities must be measured separately with held-out tasks and evidence-based evaluation.