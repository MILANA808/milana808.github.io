# AKSI prior-art scan — 2026-10-11

Status: preliminary desk research, not a patent search, exhaustive market map, or legal opinion. Links and descriptions should be rechecked before external fundraising, publication, or claims of novelty.

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

## What AKSI currently has (checked against the public demo repository)

- Context Compiler: browser-local memory entry and portable Markdown/JSON context packets, with encrypted downloadable backup.
- Proof Engine: local hypothesis/evidence workflow.
- Trace Ledger: local append-oriented hash-chain journal.
- Origin Archive: source-linked chronology of selected repository history.
- Counterfactual Lab: a transparent weighted-score simulation with seeded uncertainty perturbations and limited weight sensitivity checks.

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

1. Define one canonical JSON schema with versioning and explicit status/provenance fields.
2. Write independent conformance fixtures and a verifier that does not import the producer implementation.
3. Add mutation tests: changed input, missing source, invalid digest, stale evidence, unknown status, wrong signature.
4. Separate integrity, authenticity, truth, causal identification, and real-world outcome quality in the API and UI.
5. Benchmark on a public, versioned set of decision cases and publish failures as well as successes.
6. Compare against adjacent projects above before using words like unique, first, or state of the art.

## Product language

Preferred: “AKSI is building a model-neutral, portable evidence lifecycle for AI-assisted decisions.”

Avoid until independently demonstrated: “first in the world,” “unhackable,” “AGI,” “scientifically proven,” or claims that the current score predicts real-world success.
