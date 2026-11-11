# AKSI Explainable Concept Relations v1

## New dialogue capability

AKSI can answer:
- "Как связаны нейронная сеть и языковая модель?"
- "Как связаны геометрия и математика?"
- "Что общего между X и Y?"

The relation engine checks the built-in concept hierarchy and returns one of four explicit outcomes:

- `directed_relation`: one concept is classified under the other; the exact parent path is shown.
- `shared_category`: both concepts reach a nearest shared category; both paths are shown.
- `no_shared_path`: no shared classification path exists in the current graph. This is not proof that no relationship exists in reality.
- `unknown_concept`: one or both concepts could not be resolved reliably.

## Evidence boundary

These are ontology/classification relations, not causal claims. A shared parent does not mean one concept causes the other, and a missing path does not mean two concepts are unrelated. The proof trace records the source graph and exact path.

## Tests

Regression tests cover a shared category (neural network / language model), a directed relation (geometry / mathematics), a missing path (logic / physics), and an unknown concept.
