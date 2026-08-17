# AKSI Learning Rules v1

AKSI can be taught without pretending that a base LLM has been retrained.

## Three levels

1. **Memory** — stores user-approved examples locally and retrieves relevant ones.
2. **Policy** — stores explicit preferences/rules and applies them before generation.
3. **Model training** — optional future operation performed by a real training pipeline; it is not claimed by the browser app.

## Trust

User-provided lessons are not automatically facts about the world. Each lesson keeps its source and approval state. Retrieval is local. Removing a lesson removes it from the local learning store.

## Safety

High-risk instructions must not become autonomous policy merely because a user taught them. Sensitive data should not be entered unless the user understands the local storage implications.

## Goal

AKSI should become more useful to its owner through explicit, inspectable, reversible learning — not through invisible personality drift.
