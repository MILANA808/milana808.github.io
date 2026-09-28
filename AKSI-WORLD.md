# AKSI World — public product brief

## What AKSI is
**AKSI is an AI Decision & Action Integrity Runtime.**

It is not a new foundation model. It is a controllable execution layer around replaceable AI models and tools.

**Task → Plan → Evidence → Candidates → Evaluation → Policy Gate → Action → Memory → Receipt**

### What a user can do
Give AKSI a job instead of a single question.

Example: Research a topic on the public web, compare sources, produce a report, and show the evidence trail.

The public World demo can:
- run a local deterministic path;
- use optional WebLLM when the device supports it;
- persist user-approved memory locally;
- evaluate candidate answers with ADIA;
- create a SHA-256 Bond receipt;
- submit a task to the AKSI backend;
- let the backend search public web pages and build a report;
- use browser read-mode when explicitly enabled.

### Safety and truth boundaries
- A cryptographic hash proves integrity of a recorded payload, not truth.
- A receipt records provenance; it does not prove that an external claim is correct.
- The browser agent defaults to no side-effecting external actions.
- The quantum layer in the browser is a classical simulation.
- Existing foundation models remain replaceable components.
- AKSI is not presented as AGI.

## Public surfaces
- `/world/` — product presentation + live demo + real agent task interface.
- `/` — existing AKSI application hub.
- `/superpose/` — candidate/superposition interface.
- `aksi-runtime.js` — public runtime contract.

## Product architecture
**UI → Runtime → Stack → Evaluator → Authority → Tools → Memory → Bond**

The intended production loop is:
1. User defines the job.
2. AKSI creates a plan.
3. Evidence is collected.
4. Multiple candidates are generated.
5. ADIA evaluates and gates the result.
6. Authorized tools execute permitted actions.
7. The result is verified and summarized.
8. Memory stores what the user asked to retain.
9. Bond records an integrity receipt.

## Current status
This repository is an experimental public prototype. The strongest next production work is to add task-specific evaluators, richer evidence cards, server-side signature management, and explicit approval workflows for every real-world side effect.