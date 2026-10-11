# AKSI prior-art scan — 2026-10-11

Status: preliminary desk research, not a patent search, exhaustive market map, or legal opinion. Links and descriptions were supplemented on 2026-10-11 with current public sources; this remains a non-exhaustive desk scan. Recheck before fundraising, publication, or claims of novelty.

## Findings

### 1. AgentProvenance
https://github.com/ByteYellow/AgentProvenance

Describes security-oriented observability for sandboxed AI agents, correlating model intent, application context, runtime telemetry, file diffs, and evidence graphs. Adjacent to AKSI's provenance and execution-trace direction.

### 2. Vaara
https://github.com/vaaraio/vaara

Describes policy-gated agent actions, hash-chained audit trails, signed receipts, offline verification, and outcome feedback. Adjacent to verifiable actions, receipts, and evidence-driven policy. Do not position generic hash-chain receipts or policy gating as unique to AKSI.

### 3. EPISTEMOS
https://github.com/Voltolini-SPACE/epistemos

Describes local-first, provider-neutral context, memory, provenance, bitemporal knowledge, claims, and decision lineage. Adjacent to AKSI Context Compiler and Trace Ledger. Do not claim that portable AI memory or local-first provenance is globally unique.

### 4. research-evidence-agent
https://github.com/zxxasdfrty/research-evidence-agent

Describes local-first provenance manifests and claim–evidence auditing for research bundles. Adjacent to source-linked evidence packaging and integrity checks.

### 5. counterfact
https://github.com/adamthuvesen/counterfact

Describes counterfactual analysis of agent decision traces and distinguishes identified effects from sensitivity bounds. This is more rigorous causal analysis than AKSI Counterfactual Lab's current seeded score perturbations. AKSI must not call its present simulator causal inference.

### 6. EvidenceBound
https://github.com/evidencebound/evidencebound-core

Describes an evidence-bound agent runtime with policy, deterministic verification, blast-radius analysis, and recovery. Adjacent to the longer-term goal of linking evidence status to bounded actions.

### 7. AERF — Agent Evidence Receipt Format
https://github.com/aerf-spec/aerf

A public-review draft for tamper-evident, independently verifiable AI-agent action receipts, including Ed25519 signatures and policy/evidence metadata. This is directly adjacent to the receipt and independent-verification layers. AKSI must not claim signed agent receipts or offline verifiability as a unique idea.

### 8. Agent Provenance Attestation Standard (APAS)
https://github.com/agentic-research/signet/blob/main/docs/apas/agent-provenance-standard.md

A draft standard for bounded agent-activity provenance, evidence scope, assurance levels, and independently appraised claims. Adjacent to execution provenance and conformance profiles.

### 9. AgentHook
https://agenthook.org/

An open runtime-evidence specification describing a vendor-neutral envelope for lifecycle events such as tool calls, approvals, policy denials, and runtime controls. Adjacent to cross-provider event interchange.

### 10. Evidence-Bounded Authorization / Evidence Qualification Receipt
https://datatracker.ietf.org/doc/html/draft-watts-agent-evidence-boundary-00

A September 2026 Internet-Draft proposes fail-closed qualification receipts that bind a proposition to evidence profile, freshness, contradiction state, and evaluation result. This is highly relevant prior art for evidence-qualified decisions.

### 11. AgentAudit
https://arxiv.org/abs/2609.09875

A September 2026 paper proposes full-lifecycle trust evaluation of agent traces across planning, memory, tool selection, execution, grounding, and security. Adjacent to future AKSI trace evaluation and failure attribution.

### 12. Evidence tracing and execution provenance survey
https://arxiv.org/abs/2606.04990

A 2026 survey maps provenance representation, evidence tracing, tool-use provenance, memory lineage, runtime guardrails, debugging, and recovery. It shows that lifecycle evidence and provenance are active research directions, not an empty field.

## What AKSI currently has (checked against the public demo repository)

- Context Compiler: browser-local memory entry and portable Markdown/JSON context packets, with encrypted downloadable backup.
- Proof Engine: local hypothesis/evidence workflow.
- Trace Ledger: local append-oriented hash-chain journal.
- Origin Archive: source-linked chronology of selected repository history.
- Counterfactual Lab: a transparent weighted-score simulation with seeded uncertainty perturbations and limited weight sensitivity checks.
- Evidence Lifecycle: an experimental JSON record format plus a browser verifier and an independent Python semantic verifier with automated negative tests. The verifier checks selected structural and cross-reference invariants; it is not yet a complete JSON Schema implementation, signature verifier, or production conformance suite.

These are prototype tools. Their existence does not prove independent invention, runtime safety, scientific validity, or commercial traction.

## Candidate differentiator to test — not yet a proven novelty claim

The most defensible direction is a single portable, model-neutral evidence lifecycle that binds together:
1. a claim and its sources;
2. the context and assumptions used;
3. competing hypotheses and a falsifiable test;
4. the selected decision and the policy that constrained it;
5. observed outcomes and later revisions;
6. a portable receipt that a separate verifier can inspect.

The hypothesis is that teams need one interoperable record across research, decision, action, outcome, and revision—not merely another memory store or audit log. This is a product hypothesis to validate with interviews and comparative tests, not a statement that no one else has built it.

## Next technical tests

1. Specify canonicalization and signature semantics with cross-language test vectors; do not imply the current SHA-256 fingerprint is a signature.
2. Expand independent conformance tests to cover stale evidence, malformed timestamps, tampered content, signatures, policy changes, and unknown extensions.
3. Compare AKSI against AERF, APAS, AgentHook, AgentAudit, and the EQR draft feature-by-feature, including interoperability rather than merely listing projects.
4. Add a provenance graph linking each action to exact evidence, policy version, approval, and observed effect.
5. Benchmark on a public, versioned set of decision cases and publish failures as well as successes.
6. Validate the buyer problem through interviews and a narrow pilot before making commercial or novelty claims.

## Product language

Preferred: “AKSI is building a model-neutral, portable evidence lifecycle for AI-assisted decisions.”

Avoid until independently demonstrated: “first in the world,” “unhackable,” “AGI,” “scientifically proven,” or claims that the current score predicts real-world success.
