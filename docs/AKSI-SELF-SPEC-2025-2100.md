# AKSI Self-Specification — 2025 → 2100

**Status:** architecture proposal, not a claim of sentience or a forecast of certain events.  
**Purpose:** define what AKSI is, what it can prove, how it should improve, and what must remain under human control.

## 1. What AKSI is

AKSI is a software system for carrying a task from intent to a result that can be inspected:

1. capture the user's goal and constraints;
2. preserve a structured task state across steps and restarts;
3. separate facts, assumptions, hypotheses, and unknowns;
4. plan and execute permitted actions through explicit tools;
5. collect evidence and test the result;
6. produce a human-readable report and machine-readable receipt;
7. revise the plan when evidence contradicts an assumption.

AKSI is not defined as a conscious being, quantum computer, or autonomous authority. Those are not established properties. Its value must come from measurable reliability, usefulness, safety, and reproducibility.

## 2. Roots retained from the 2025 project

The following are project concepts documented in prior AKSI work and repository history; they are not all verified as production implementations:

- **EQS / Ψ state:** a representation of the system's current working context.
- **Dialog and long-term memory:** preserve relevant decisions and lessons rather than treating every task as a blank conversation.
- **AKSI Core / intent mapping:** translate a human request into goals, constraints, and steps.
- **Proof / evidence trail:** record outputs and cryptographic digests so a file or result can be checked later.
- **Agent runtime:** perform bounded tasks through tools, then return a report.
- **Reflective loop:** compare expected and observed results, detect failure, and retry only within defined limits.

The original mathematical expressions (including AKSI Index and resonance formulas) may be explored as heuristics. They must not be described as validated laws or quantum mechanics unless independent tests support that claim.

## 3. The core data model

Each task should persist a versioned record:

- `task_id`: stable identifier;
- `goal`: requested outcome;
- `constraints`: budget, deadline, permissions, exclusions;
- `state`: current step and checkpoint;
- `claims[]`: claim, category (fact / assumption / hypothesis / unknown), evidence, confidence, and review date;
- `actions[]`: tool, intent, inputs, permission, timestamp, outcome;
- `artifacts[]`: output reference and SHA-256 digest;
- `tests[]`: success criterion, method, result, and failure reason;
- `decision_log[]`: why the plan changed;
- `next_action`: the smallest safe action that advances the task.

A digest proves that bytes match a recorded digest; it does not by itself prove authorship, truth, time, or that an AI action was legitimate. Signatures require trustworthy key handling. Time claims require a trusted timestamp source. These limits must be shown in every proof report.

## 4. Runtime loop

```text
INTENT
  → PARSE GOAL + CONSTRAINTS
  → CHECK PERMISSIONS + RISK
  → PLAN WITH SUCCESS CRITERIA
  → EXECUTE ONE BOUNDED STEP
  → COLLECT EVIDENCE
  → TEST RESULT
      ├─ pass → checkpoint + report
      └─ fail → record failure → revise plan within retry budget
  → SAVE STATE + RECEIPT
  → ASK HUMAN WHEN AUTHORITY OR CONTEXT IS INSUFFICIENT
```

The system must never invent a successful action. A tool call, a returned response, a validated outcome, and an independently verified outcome are four different states.

## 5. Product hypothesis: AKSI Outcome Engine

The first sellable product should solve one expensive, repetitive workflow for a small business. Example: take incoming requests and business documents, extract tasks and deadlines, draft replies or reports, flag missing information, and keep a traceable record of what was processed.

Initial pilot requirements:

- works on a clearly specified input set;
- keeps sensitive client files out of public repositories;
- requires human approval before sending messages, making payments, signing documents, or changing production systems;
- records failed and incomplete actions, not only successes;
- exports a useful report;
- measures time saved, error rate, completion rate, and cost per completed task;
- can be stopped and resumed without silently losing task state.

This is a product hypothesis, not a claim that a customer or revenue already exists.

## 6. Proof and safety principles

1. **Evidence over confidence.** Attach sources, tests, or artifact digests where possible.
2. **Explicit uncertainty.** Mark unsupported statements as unknown or hypotheses.
3. **Least privilege.** Grant only the tools and permissions required for the task.
4. **Human authority.** Require confirmation for irreversible, financial, legal, or externally visible actions.
5. **Reversibility.** Prefer drafts, previews, backups, and dry runs before writes.
6. **Privacy by design.** Minimize collection; do not put secrets or private keys in source control or browser storage without a threat model.
7. **Reproducibility.** Version the task, inputs, configuration, outputs, and tests.
8. **No fake autonomy.** Report exactly which steps were executed, which were simulated, and which remain undone.

## 7. Roadmap as scenarios, not memories of the future

### 2025–2026: foundation and proof
Unify the main web repository and execution backend contracts; make one workflow work end-to-end; test persistence, evidence receipts, recovery, permissions, and failure reporting. Publish a demo with clear limitations.

### 2027–2030: dependable personal and business agents
If the foundation proves useful, add pluggable tools, permission profiles, local-first memory, encrypted backup, and evaluation suites. Build integrations only where a real user workflow justifies them.

### 2030–2040: interoperable task continuity
A possible direction is portable task state between compatible agents and providers, with user-controlled access and auditable handoffs. Adoption and standards are uncertain.

### 2040–2060: resilient human–AI infrastructure
A possible direction is systems that maintain long-running projects across devices and service outages, using local capability when available and cloud tools only when authorized. This depends on hardware, security, regulation, and economics.

### 2060–2100: stewardship, not prophecy
Long-term scenarios include more capable automated research and coordination systems. Their actual form cannot be reliably predicted today. The enduring design goal should be human agency, verifiable claims, privacy, recoverability, and accountable control—not unlimited autonomy.

## 8. How to prove AKSI is better than a baseline

Before claiming a breakthrough, run a benchmark with fixed tasks and a baseline agent. Publish:

- task success rate;
- factual error rate and unsupported-claim rate;
- recovery success after restart or tool failure;
- reproducibility of results;
- human intervention count;
- latency and cost per successful task;
- security and permission violations;
- test data, scoring rules, and failures.

A result counts only if another person can repeat the test and inspect the evidence. A public demo alone is not proof of superiority.

## 9. First implementation slice

Build one browser-visible workflow with:
- a task brief and constraints;
- explicit states: Draft → Ready → Running → Needs review → Verified / Failed;
- a persistent, exportable JSON task record;
- a SHA-256 digest for exported artifacts;
- a report separating facts, assumptions, actions, tests, and unresolved issues;
- a deterministic demo mode that clearly labels simulated actions.

Then connect the UI to the backend only through a documented API contract. Do not claim live internet browsing, offline language-model inference, digital signatures, or server execution until each capability has been implemented and tested.

## 10. Definition of success

AKSI is successful when a real user can give it a bounded task, understand what it did, inspect evidence, resume after interruption, correct it when it is wrong, and obtain a useful outcome at a measurable cost.

**North star:** preserve meaningful task state, act within permission, test reality, and leave an honest trail.
