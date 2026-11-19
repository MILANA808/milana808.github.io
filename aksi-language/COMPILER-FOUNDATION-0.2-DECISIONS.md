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

The first implementation slice exposes `analyze_module(module)` and routes compilation through one parsed AST, avoiding the former parse → analyze (parse again) → lower (parse again) sequence. The existing `AKSI-Q-TIR/0.1` remains a prototype: it is not yet the canonical, fully typed executable representation. The current type checker still has permissive `Any`/unknown behavior, and IR lowering still contains syntax-based type inference. Those are explicit Stage 1/2 work items, not solved by this decision record.

## Merge and rollout policy

All work stays on `aksi-q-site-rewrite` and in draft PR #264 until reviewed. No merge to `main` and no public deployment are authorized by this plan.
