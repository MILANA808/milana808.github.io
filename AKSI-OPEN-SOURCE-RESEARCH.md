# AKSI Open-Source Research & Integration Decisions
**Reviewed:** 2026-10-11  
**Primary product repo:** `MILANA808/milana808.github.io`  
**Backend repo:** `MILANA808/Milana-backend`

This is an engineering selection memo, not a claim that AKSI is AGI or that any external framework is automatically secure. The objective is a single reliable AKSI system with testable capabilities, durable tasks, shared memory, evidence, and explicit failure states.

## Executive decision
Do not copy entire AI frameworks into AKSI and do not merge unrelated prototype repositories wholesale. Keep the existing FastAPI backend and static-first web product as the canonical product, then adopt proven patterns behind narrow adapters. The immediate bottleneck is state fragmentation, weak end-to-end evaluation, unclear persistence, and repeated implementations of proofs/keys—not a shortage of model names.

## Open-source projects examined

### 1. LangGraph — durable graph orchestration patterns
- Repository: https://github.com/langchain-ai/langgraph
- Relevant ideas: explicit state graph, checkpointing, resumable runs, interrupt/approval gates, short-term thread state versus long-term store, replay/time-travel debugging.
- Fit for AKSI: high as a design reference; conditional as a runtime dependency.
- Decision: first implement a small AKSI task graph contract and conformance tests. Evaluate LangGraph as an optional backend adapter only after comparing footprint, deployment constraints, existing agent routes, license/dependency posture, and real benchmark results.
- Guardrail: in-memory checkpoints are not production persistence. Durable storage and safe deserialization must be explicitly configured.

### 2. SWE-bench / SWE-agent — execution-backed coding-agent evaluation
- Repositories: https://github.com/SWE-bench/SWE-bench and https://github.com/SWE-agent/SWE-agent
- Relevant ideas: reproduce real GitHub issues in isolated environments, apply a patch, run tests, score resolved tasks, preserve reproducible task IDs and outputs.
- Fit for AKSI: high for the repository repair/autopilot lane.
- Decision: create an AKSI task corpus from real failures: broken links, syntax errors, failed tests, backend contract regressions, stale workflows, and proof-verification failures. Each task must include a clean baseline, expected behavior, tests, a patch diff, and a reproducible result.
- Safety: run untrusted repository code in an isolated container/sandbox with restricted network, least privilege, CPU/memory/time budgets, and no production secrets.

### 3. SWE-bench-Live — freshness and anti-contamination lessons
- Project: https://swe-bench-live.github.io/
- Relevant ideas: periodically refreshed real tasks, multiple languages/OSes, submission verification and agent trajectories.
- Fit for AKSI: medium/high as a later evaluation source; do not use a leaderboard score as proof of general intelligence.
- Decision: track a frozen regression suite plus a separate rolling challenge set. Report success rate, regressions, cost, latency, and failures—not a single opaque “IQ” score.

### 4. Harness — inspect, don't adopt blindly
- Repository: https://github.com/lenileiro/harness
- Relevant ideas described by its repository: durable sessions/tasks, adapters, approvals, sandboxed execution, persistent memory, behavioral A/B evaluations.
- Fit for AKSI: medium as a source of design ideas; independent project maturity, threat model, license, dependencies and maintenance need deeper verification before production use.
- Decision: borrow the evaluation categories and durable-task checklist; do not vendor the code until a time-boxed technical review is completed.

### 5. NIST post-quantum standards — cryptography baseline
- Official overview: https://www.nist.gov/pqc
- Standards: FIPS 203 ML-KEM (key establishment), FIPS 204 ML-DSA (digital signatures), FIPS 205 SLH-DSA (hash-based signatures).
- Decision: use a maintained, interoperable implementation and versioned protocol; do not invent AKSI-specific cryptographic primitives. Hybrid classical/PQ modes must identify each algorithm, bind the same canonical receipt/context, and pass tamper/interoperability tests.
- Security boundary: neither signatures nor hash chains prove that an AI answer is factually true or that a compromised endpoint is safe.

## Proposed single-system architecture

`UI → API Gateway → Task Registry → Policy/Approval Gate → Orchestrator → Model/Tool Adapters → Independent Verifier → Signed Receipt → Memory/Replay`

One versioned contract per boundary:
- **Task:** task ID, intent, scope, deadline, budget, permitted capabilities, approval state, idempotency key.
- **Capability:** stable ID, adapter version, health state (`ready/degraded/offline/unconfigured/failed`), last verified time, failure reason.
- **Evidence:** URI, retrieval timestamp, content hash, source/extraction method, trust label, independently verified flag.
- **Decision packet:** candidate outputs, evidence references, uncertainty, policy decision, verifier outcome, abstention reason.
- **Receipt:** protocol version, canonicalization version, task ID, input/result/evidence hashes, model/runtime IDs, signer key ID, algorithm IDs, signature, parent event and verification result.
- **Memory:** scoped records with provenance, retention, export/delete, encrypted sensitive values, conflict handling and explicit separation of user facts from model-generated hypotheses.
- **Replay:** immutable task manifest and tool-result fixtures; replay must not repeat external side effects by default.

## Current confirmed engineering blockers
1. The main site had a stale `/proof-lab/` link while the real page lived at `/proof/`. Added `proof-lab/index.html` as a compatibility redirect. The new static validation workflow should assert both routes.
2. Multiple browser modules persist/export private key material to browser storage. Keep issue #124 open until every module is migrated and tested. Treat existing keys as potentially exposed; do not use them for production identity.
3. The backend proof route previously asserted verification with a placeholder. It now signs/verifies an Ed25519 receipt; regression tests are present and CI has passed on the inspected commit. Verify the live host separately.
4. Backend signing identity can be ephemeral unless `AKSI_PRIVATE_KEY_B64` is configured through the hosting secret manager or a durable key directory is used. `/health` reports the signing key mode. Configure and test the production secret before relying on identity continuity.
5. Hundreds of historical Autopilot issues were created one per failure. The workflow now updates a rolling tracker for new failures; legacy issues still need reviewed deduplication/closure rather than blind mass-closing.
6. Several recent commits were superseded by later commits; cancelled Actions runs are not code failures. Use latest run per workflow and commit SHA, not the number of red icons in history.

## Roadmap: prioritize reliability before “superintelligence”
### P0 — Green and trustworthy
- Require HTML asset validation, JavaScript syntax checks, Python tests, API contract tests and secret scanning.
- Add one route/capability health manifest and truthful failure state.
- Keep all model/tool calls behind one gateway; use bounded retries, timeouts and idempotency.
- Verify signatures independently and test one-byte tampering.

### P1 — One persistent agent
- Durable task/checkpoint storage, resume after restart, approval interrupts, cancellation, dead-letter/error classification.
- Unified memory API and event/receipt schema; legacy modules become adapters, not parallel sources of truth.
- Browser and web tools execute in constrained workers, not in the public UI process.

### P2 — Measurable intelligence
- Create an AKSI Regression Bench with 30–50 first-party tasks before expanding.
- Track completion, verified correctness, evidence quality, calibration/abstention, latency, token/tool cost, and unsafe-action rate.
- Compare model/router variants against the same frozen tasks. Promote a change only if it improves outcomes without increasing regressions.
- Separate classical quantum-algorithm simulation from real quantum hardware; separate vector/state-space math from claims of AGI.

### P3 — Security hardening
- Remove private-key JWK/PKCS#8 persistence in localStorage.
- WebAuthn/passkeys for user authentication; server-side signing keys in secret manager/KMS/HSM where available.
- AES-GCM for encrypted records with strict nonce management and key rotation; standard KDFs, scoped authorization and replay protection.
- Introduce ML-KEM/ML-DSA only through maintained, reviewed implementations and a documented hybrid protocol.
- Pin GitHub Actions to full commit SHAs, scan dependencies, least-privilege CI tokens, secret scanning and isolated execution.

## Acceptance gates
- A single UI can start, inspect, approve, cancel and resume a task.
- Task state survives backend restart in the configured durable store.
- Every capability reports actual health and a useful error when unavailable.
- Exported receipts verify independently; one-byte tampering fails.
- Re-running a completed task does not repeat external side effects without authorization.
- All required CI checks are green on the current main SHA, and a live HTTP smoke test confirms deployment.
- Benchmark results are repeatable and include raw task-level results; no “superintelligence” claim without independent evidence.

## References
- LangGraph: https://github.com/langchain-ai/langgraph
- LangGraph persistence: https://github.com/langchain-ai/langgraph/blob/main/libs/checkpoint/README.md
- SWE-bench: https://github.com/SWE-bench/SWE-bench
- SWE-agent: https://github.com/SWE-agent/SWE-agent
- SWE-bench-Live: https://swe-bench-live.github.io/
- Harness: https://github.com/lenileiro/harness
- NIST PQC: https://www.nist.gov/pqc
