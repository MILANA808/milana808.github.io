# AKSI — Acquisition Package

## Product thesis

**AKSI is a trust and execution layer for AI agents.**

The buyer does not acquire a chatbot. The buyer acquires a system that can sit between a human/company and an AI agent and turn agent work into an auditable, portable record.

### Core loop

TASK → AUTHORIZATION → PLAN → TOOLS/WEB → EVIDENCE → ANALYSIS → POLICY GATE → RECEIPT → VERIFY

## What already exists in the ecosystem

- Agent runtime and web-research components.
- Browser runtime with navigation/read/screenshot/click/type primitives and approval controls.
- Evidence and structured reporting.
- SHA-256 receipt/integrity mechanisms.
- Ed25519 signing and verification infrastructure.
- Decision Receipt protocol.
- Static proof/signature/verification interfaces.
- Runtime and product CI checks.
- Product and provenance documentation.

## The commercial product

### AKSI Agent Trust Gateway

A deployable service/API that accepts an agent task and returns:

1. authorization record;
2. execution trace;
3. evidence bundle;
4. policy decision;
5. cryptographic receipt;
6. independent verification result.

## Acquisition deliverables

- Full source repositories and Git history.
- Runtime and browser-agent components.
- Trust/crypto modules.
- Verification tooling.
- Protocol specification.
- Demo and UI.
- Deployment configuration.
- Provenance dossier.
- Implemented-vs-experimental inventory.

## Claim boundary

A cryptographic receipt does not prove that an AI statement is objectively true. It proves the captured execution/decision and its integrity under the specified policy and capture boundary.

## The demo

Open `/proof/` to demonstrate the proof/verification layer.

Open `/ask.html` for the Decision Receipt concept.

## Positioning

**AI agents can act. AKSI makes those actions accountable.**

This is the technology package to offer for licensing, strategic partnership, white-label deployment, or acquisition.
