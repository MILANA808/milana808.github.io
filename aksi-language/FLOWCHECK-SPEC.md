# AKSI Q control-flow analysis — draft 0.1

The static analyzer runs a conservative return-flow pass after name resolution and the initial type checker.

## Rule

A function declared with a non-Unit result type must return a value on every structurally visible path. The current pass recognizes:
- a direct `return`;
- a block containing a statement that itself guarantees return;
- an `if` statement with an `else` branch where both branches guarantee return.

The pass deliberately does not assume that a loop executes, even when its condition is the literal `true`. This avoids treating a possible zero-iteration loop as a guaranteed return. It also does not yet perform full control-flow graph construction, reachability analysis, definite assignment, loop invariant analysis, or exhaustiveness analysis for algebraic data types.

## Diagnostic

`E_MISSING_RETURN` is emitted at the function declaration when a non-Unit function can reach its end without a statically recognized return.

This is a conservative structural check, not a proof of program correctness.
