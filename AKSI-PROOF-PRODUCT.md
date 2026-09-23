# AKSI Proof — product package

## What is being sold

AKSI Proof is a trust layer for AI agents: an agent can execute a task, collect evidence, apply an explicit policy gate, and produce a portable decision receipt that can be verified independently.

Core flow:

TASK → AUTHORIZATION → PLAN → TOOLS/WEB → EVIDENCE → ANALYSIS → POLICY GATE → RECEIPT → VERIFY

## Why it is valuable

Companies increasingly want AI agents to act, not merely answer. The missing commercial layer is accountability: what did the agent do, under which authority, using which evidence, and can the result be audited later?

AKSI turns an agent run into an auditable object.

## Existing implementation

The MILANA808 ecosystem already contains:
- web-agent and browser-agent runtime components;
- browser actions with approval controls;
- evidence/report generation;
- SHA-256 receipts;
- Ed25519 signing infrastructure;
- verification workflows;
- a Decision Receipt protocol;
- a static proof/verification demonstration.

## Product architecture

1. Agent runtime — performs the task.
2. Evidence layer — records sources and observations.
3. Policy gate — ALLOWED / DEFERRED.
4. Receipt layer — canonical JSON + hash/signature + previous-receipt linkage.
5. Verify layer — independently checks the receipt.
6. Export layer — portable evidence bundle for a customer, auditor or another system.

## Commercial form

The technology can be sold as:
- SDK/API for existing agent platforms;
- enterprise self-hosted trust gateway;
- white-label AI-agent audit system;
- acquisition of the complete IP/code/documentation package.

## Important claim discipline

AKSI does not claim that a receipt proves that an AI statement is objectively true. It proves the recorded execution/decision under the specified policy and evidence chain, subject to the system's capture boundary.

## Acquisition package

A serious buyer should receive:
- source repositories and commit history;
- runtime and browser-agent modules;
- crypto and verification modules;
- product documentation;
- protocol specification;
- deployment configuration;
- reproducible demo;
- list of implemented vs experimental components;
- IP/provenance dossier.

## North-star demo

Give an agent one real task. Let it research and act. Then show, on one screen:

WHAT WAS ASKED → WHAT THE AGENT DID → WHAT IT FOUND → WHY IT WAS ALLOWED/DEFERRED → SIGNED RECEIPT → VERIFY

That is the product story.
