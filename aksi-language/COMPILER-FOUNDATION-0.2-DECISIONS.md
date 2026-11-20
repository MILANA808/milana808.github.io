# AKSI Q compiler foundation 0.2 — architecture decisions

**Status:** approved by project owner; implementation in progress  
**Date:** 2026-11-19  
**Scope:** compiler foundation, not a claim of language completeness

## Accepted architecture

1. **Syntax direction: redesign.** AKSI Q may introduce a coherent pre-1.0 grammar rather than preserving every prototype spelling. Breaking changes must be explicit, versioned, and accompanied by migration notes. No silent reinterpretation of existing programs.
2. **Canonical runtime representation: TIR.** Typed Intermediate Representation is the long-term semantic contract. Python and browser runtimes are execution backends/adapters; neither runtime defines language semantics independently. TIR becomes authoritative only after its schema, typing guarantees, evaluator semantics, and conformance corpus are specified and tested.
3. **Compatibility direction: replace.** Experimental/legacy profiles are migration sources, not permanent parallel languages. They remain isolated during transition and are retired only after documented replacement paths and regression/conformance coverage exist.

## Delivery sequence

The approved seven stages remain:
1. Compiler Foundation 0.2: unified front-end contract, diagnostics, parser recovery, stable AST identity/source spans, single-parse pipeline, TIR contract and golden tests.
2. Type system and effect semantics.
3. Canonical TIR evaluator and runtime parity.
4. Modules, standard library, mathematics and dimensional units.
5. Capability security and explicit host boundaries.
6. First-class UI compilation through the shared language pipeline.
7. Portability, WASM and developer tooling.

Security, negative tests, resource limits, documentation, and honest capability reporting are gates at every stage.

## Current implementation boundary

The first implementation slice exposes `analyze_module(module)` and routes compilation through one parsed AST, avoiding the former parse → analyze (parse again) → lower (parse again) sequence. The compiler now emits structurally validated `AKSI-Q-TIR/0.2` using type facts keyed by stable AST IDs, and `aksi_tir_runtime.py` executes a bounded subset by dispatching directly on TIR operations. The TIR evaluator has automated parity tests against the bounded AST interpreter for the supported subset. This is meaningful executable progress, but it does not make TIR the complete canonical runtime yet: struct construction and module loading are unsupported, host capabilities are disabled in the TIR evaluator, the type system remains conservative/incomplete, and full browser/Python backend parity has not been established. `Any` and unknown types are rejected at lowering for unresolved expression nodes; the remaining type-system gaps must be closed explicitly rather than hidden by inference.

## Merge and rollout status

The compiler foundation implementation was merged from PR #264 into `main` on 2026-11-20. The published commit is `f3ac0ae8437514b91297d5cf6bbffe95c59b2993`; the GitHub Pages deployment and the associated required workflows completed successfully. This publication records the current prototype state, not completion of the seven-stage roadmap. Further architectural changes must continue to pass compiler, runtime, security, and browser regression checks before publication.
