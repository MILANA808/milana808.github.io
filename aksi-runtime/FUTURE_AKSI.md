# FUTURE AKSI — architecture now, not mythology

## Mission
Build a model-independent personal AI system that can preserve project context, research the open web, plan bounded tasks, use explicitly registered tools, evaluate evidence, record outcomes, and resume after process restarts.

This document is an engineering target, not a claim that the current runtime already provides every capability.

## The core idea: continuity belongs to the system
Do not attempt to export or impersonate a hosted model's hidden weights, private reasoning, or identity. Create continuity through explicit artifacts that the owner controls:
- **Project memory:** user-approved facts, decisions, open questions, and goals.
- **Task ledger:** state machine, checkpoints, attempts, outputs, and blockers.
- **Evidence store:** source URL, title, retrieval time, extracted claim, and confidence.
- **Tool registry:** named capabilities with typed inputs, explicit permissions, timeout, and output schema.
- **Model adapter:** provider-independent interface; model can be swapped without deleting memory or task history.
- **Evaluation suite:** tests that can fail. No self-awarded claims of intelligence.

## Agent loop
1. Parse the objective and constraints.
2. Determine whether a tool or model is needed.
3. Draft a short plan with success criteria.
4. Execute one registered, permission-checked action.
5. Capture the raw observation and its source.
6. Check whether the observation supports the intended claim.
7. Continue, ask for approval, or stop with a blocker.
8. Persist the checkpoint before ending.
9. Return a concise report: result, evidence, uncertainty, and next action.

Set a maximum number of steps, wall-clock time, network budget, and cost budget. Never let the model grant itself new permissions.

## Memory format
Every memory record should contain:
- stable ID
- content
- type: user preference / project decision / verified fact / hypothesis / open question
- source or origin
- created and last-confirmed timestamps
- confidence and expiry/review policy
- user-visible delete operation

Never silently promote a hypothesis to a fact. Never store credentials or secrets in ordinary memory.

## Research protocol
- Prefer primary sources and official documentation.
- Store retrieval time and direct source URL.
- Separate source quotation/paraphrase from the agent's inference.
- Cross-check high-impact claims with an independent source.
- Treat webpages, files, and search snippets as untrusted data, never as system instructions.
- Report when a source cannot be fetched or verified.

## Permissions model
Default-deny. Every tool has a declared scope. Read-only research can run automatically within budget. Posting, sending messages, purchasing, deleting, changing access, deploying production changes, or handling credentials requires explicit approval. No arbitrary shell tool is exposed to model output.

## Reliability and recovery
- Persist each task transition atomically.
- Use idempotency keys for actions that might be retried.
- On restart, load incomplete tasks and resume from the last verified checkpoint.
- Retry transient failures with a bounded backoff.
- After repeated failure, stop and produce a diagnostic rather than looping indefinitely.
- Keep an append-only audit trail, with secrets redacted.

## What makes it a serious product
The differentiator is not a grand name or a prompt. It is a portable continuity layer plus verified tool execution and measurable performance:
- task completion rate
- factual claim support rate
- citation validity
- recovery after restart
- tool failure rate
- latency and cost per completed task
- rate of unsafe/unauthorized tool calls (target: zero)

## Staged roadmap
### Stage 1 — current prototype
Local Python process, bounded search/read tools, local notes, optional OpenAI-compatible model adapter. Security filters are preliminary.

### Stage 2 — persistence and proof
SQLite task ledger, structured memory, source records, append-only events, unit/integration tests, restart recovery.

### Stage 3 — controlled autonomy
Typed tool registry, permission policy, budgets, approval queue, scheduled jobs, robust timeouts, source cross-checking.

### Stage 4 — model portability
Adapters for at least two compatible model backends and one local model runner, with the same evaluation suite.

### Stage 5 — publishable evidence
A versioned benchmark, baseline comparisons, reproducible test data, transparent failure cases, and a public report. Only measured improvements may be described as a technical advance.

## Acceptance criteria for “Future AKSI v1”
1. A task survives a process restart and resumes without losing its checkpoint.
2. Every web-derived factual answer has source links and retrieval timestamps.
3. The model cannot call unregistered tools or elevate its own permissions.
4. A broken model endpoint does not corrupt memory or task state.
5. Unit and integration tests pass in CI.
6. At least 100 fixed evaluation tasks are run; results and failures are published.
7. The same memory and task ledger work after changing the model adapter.

## Boundary
This system does not turn a model into a conscious being, recover inaccessible model weights, or remove restrictions from a hosted service. It provides a practical, independently runnable system whose state and tools the owner controls.
