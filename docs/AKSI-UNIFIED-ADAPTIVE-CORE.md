# AKSI Unified Adaptive Core

The existing `AKSI_UNIFIED_CORE` is the orchestration entry point for the main browser chat. This is an experimental classical browser architecture, not a claim of AGI, quantum advantage, or a truth oracle.

## Runtime path

1. The main chat optionally uses the explicitly enabled backend path when the user turns it on.
2. Otherwise, it calls `AKSI_UNIFIED_CORE.answer(query, options)`.
3. The core prepares bounded local context, calls the existing intent router and geometric graph module when available, and assesses supplied evidence annotations.
4. Arithmetic-only requests and explicit commands such as `посчитай sqrt(81) + 2^3` are routed to the existing `AKSICalculator` parser, which evaluates a restricted arithmetic grammar without `eval`.
5. Other requests use the existing offline DNA/topology generator when available. The core does not call WebLLM directly from the main chat path first; its fallback remains inside the core.
6. The main chat shows the generator and integration metadata returned by the core.

## Module and result contracts

- The main page loads the existing `aksi-core-v3.js` decision engine before the orchestrator.
- When the user explicitly enables web search, `AKSI_UNIFIED_CORE.answer(..., { useWeb: true })` calls the existing `AKSI_INTERNET.gather`, records search status in the trace, and passes retrieved material into evidence assessment. Search results default to context, not support or refutation. `AKSI_UNIFIED_CORE.decide(task, candidates, options)` delegates structured candidate comparison to `AKSICoreV3.run` and records the decision receipt hash in the in-memory trace. This is a separate structured-decision path, not the free-form text generator; the candidate scores are heuristic and are not calibrated probabilities of truth.

- `AKSI_UNIFIED_CORE.inspect()` reports module availability. Availability does not prove that a module was executed for every request.
- Successful answers include `integration.schema = "AKSI-CORE-RESULT/1"`, with the generator, intent-routing result, graph use, evidence status, and available modules.
- `getTrace()` returns a bounded in-memory diagnostic trace for the current page session; `clearTrace()` clears it. This trace is not persisted, signed, or tamper-proof.
- The cognitive evidence assessor accepts `supports`, `refutes`, and `context` annotations. Retrieved items default to `context`; retrieval alone does not establish whether a source supports a claim.
- The evidence assessor's balance and strength fields are heuristic summaries of supplied annotations, not calibrated probabilities of truth. Source quality and independence require external validation.
- SHA-256 receipt digests establish the digest of the supplied receipt payload; they do not prove the answer is true.

## Memory and learning boundaries

- Local adaptive state uses the browser storage key `aksi_unified_core_v1`; it does not synchronize between devices.
- Positive/negative feedback updates classical association weights. Merely generating an answer does not treat it as true or reinforce it.
- The bounded Lorenz integration is an exploration descriptor, not a truth score.
- Semantic addresses are finite hash-derived geometric heuristics, not a literal infinite Penrose tiling or infinite-capacity memory.
- The separate visible neural lab is a small CPU-based character model/training demonstration; it is not automatically the main chat's answer generator.

## Limitations

This is an experimental classical browser system. It is not memristor hardware, a physical quantum computer, a truth oracle, or evidence of consciousness. The native generator is lightweight and can produce limited answers; calculator support is restricted to the grammar implemented in `aksi-calculator.js`. The browser may block storage, and the live public site does not include this branch's changes until the PR is reviewed, merged, and deployed.

## Tests

```sh
node scripts/test_aksi_unified_adaptive_core.cjs
node scripts/check_aksi_main_product.mjs
```

The integration workflow runs both commands on pull requests that change the core, main page, or relevant tests.
