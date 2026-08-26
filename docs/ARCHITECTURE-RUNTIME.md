# AKSI Runtime Contract

This module is an orchestration boundary around the existing stable `aksi-core.js` v5.x. It does not replace or rewrite Core.

## Rules

1. Core is the stable local cognitive fallback.
2. LLM, Neuro, Mesh, P2P, DKV, Vision and Self are providers/modules, not competing brains.
3. Human-to-human communication must not auto-answer on behalf of a participant.
4. `integrity` means that a record was not changed; it does not mean the claim is true.
5. Every future answer surface should be able to expose source, kind, confidence and citations.

## Target architecture

```text
UI
 ↓
AKSI Runtime
 ├─ Core v5.x
 ├─ Providers (LLM / Neuro / Web)
 ├─ Memory
 ├─ Verification / provenance
 └─ Communication (chat / audio / video)
```

This is an incremental compatibility layer. Existing experimental modules remain available while their contracts are consolidated.
