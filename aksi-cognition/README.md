# AKSI Evidence Kernel

aksi-evidence-kernel.js is the first isolated component of the AKSI cognition foundation.

## Implemented in v0.1.0

- Stores typed claims as subject–predicate–object triples.
- Requires provenance (source) for every claim.
- Records truth polarity, claim kind, and a bounded confidence value.
- Distinguishes supported, refuted, conflicted, and unknown.
- Implements one explicit inference rule: transitivity of is_a.
- Returns premise IDs and a deterministic explanation trace.
- Enforces claim-count, text-length, and inference-depth limits.
- Has no network, filesystem, DOM, dynamic code execution, or automatic persistence.

## Important boundaries

This is a small deterministic symbolic evidence component, not a superintelligence, LLM, autonomous agent, calibrated Bayesian system, or open-domain knowledge engine. Confidence is not a probability of truth. An unknown result is not a false result. Conflicting claims are surfaced rather than silently resolved. Persistence, natural-language understanding, planning, tool use, learning, and TIR integration are not implemented in this first slice.

## Run tests

    node tests/aksi-evidence-kernel.test.cjs

The next milestones are schema-versioned persistence and provenance import/export; composable typed inference rules with proof traces; uncertainty calibration and contradiction handling; language-to-claim parsing with explicit abstention; planner and permission-gated tool execution; then a TIR-backed runtime adapter and benchmark suite.
