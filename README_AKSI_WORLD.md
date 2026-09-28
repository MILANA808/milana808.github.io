# AKSI — AI Decision & Action Integrity Runtime

AKSI is an experimental, local-first agentic runtime designed to take a job rather than only answer a question.

**Task → candidates → evaluation → policy gate → action → memory → receipt**

## Product layers
- Memory — persistent browser-local context.
- Neuro / Knowledge — lightweight local candidate generation.
- Superpose — multiple candidate states and visible selection.
- WebLLM — optional local model when WebGPU/device support allows it.
- ADIA — heuristic evaluator: score → rank → claim throttle → gate → seal.
- Bond — SHA-256 integrity receipts for recorded payloads.
- Authority — permission boundary for real actions.
- Backend agent — optional research/browser execution layer.

## Important boundaries
A hash proves integrity of a recorded payload, not that its claim is true. The quantum layer is a classical simulation. WebLLM uses existing models. Multi-agent orchestration is an architecture pattern. AKSI is not presented as AGI.

## Public demo
Open `/world/` for the product presentation and live local demo. The existing hub remains at `/`, with Superpose at `/superpose/`.

## Product thesis
**AI thinks. Tools search. Memory remembers. Evaluator checks. Authority permits. Bond records. Human decides.**

## Next production step
Connect the existing permission-gated backend research/browser worker to this runtime, stream evidence cards, require explicit action approvals, and add server-side signing with a genuine private-key boundary.