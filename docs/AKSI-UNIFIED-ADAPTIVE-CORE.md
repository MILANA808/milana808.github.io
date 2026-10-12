# AKSI Unified Adaptive Core

Browser-local adaptive memory integrated into the main AKSI chat.

## Runtime

- `aksi-unified-adaptive-core.js` prepares a bounded context from local episodes and concept memory.
- `index.html` calls the unified core for local WebLLM answer generation and exposes explicit helpful/not-helpful feedback controls.
- The existing `AKSI_WEBLLM` is still the language model. The adaptive core does not replace it or claim to train its neural weights.
- The local state is stored under `aksi_unified_core_v1` in this browser only. It does not synchronize between devices.
- Positive/negative feedback updates small classical association weights. Merely generating an answer does not treat it as true or reinforce it.
- A deterministic, bounded Lorenz integration supplies an exploration descriptor, not a truth score. The semantic address is a finite hash-derived geometric heuristic, not an actual Penrose tiling or infinite-capacity memory.

## Limits

This is an experimental classical CPU/browser module, not memristor hardware, a quantum computer, a truth oracle, or evidence of consciousness. Model answers require the selected WebLLM model to be successfully downloaded and loaded; browser WebGPU and memory support vary. The local adaptive memory cannot by itself generate fluent answers without that model.

## Test

```sh
node scripts/test_aksi_unified_adaptive_core.cjs
```

## User behavior

Use the 👍 / 👎 controls shown under generated local-model answers. Ratings update local association weights and are persisted in browser localStorage. The user can clear this memory with the existing clear-memory control.
