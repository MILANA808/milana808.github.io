# AKSI Core v1 — verifiable foundation

A small, dependency-free JavaScript core intended to be testable in a browser and in modern Node.js. This is a foundation, not a claim of AGI, quantum computation, calibrated Bayesian inference, or production security certification.

## Guarantees in this version
- Pure deterministic normalization and policy evaluation for identical inputs.
- Explicit outcomes: `SUPPORTED`, `INSUFFICIENT_EVIDENCE`, `CONFLICTING_EVIDENCE`, `REJECTED`.
- Claims are not promoted to facts just because a model generated them.
- Evidence must be supplied by the caller; source text, timestamp, and integrity metadata are recorded.
- Append-only in-memory trace events are hash-chained with SHA-256 when Web Crypto is available.
- Bounded input sizes and no dynamic code execution, network calls, or implicit persistence.
- No fabricated confidence percentages. The core reports rule-based status and evidence counts.

## API
`createAKSICore({ maxClaims, maxEvidencePerClaim, maxTextLength })`
- `evaluate({ claim, evidence, contradictions })`
- `record(event)`
- `getTrace()`
- `verifyTrace()`
- `reset()`

Evidence items: `{ id, text, source, observedAt, supports }`, where `supports` is `true`, `false`, or `"unknown"`. This is explicit caller-supplied annotation, not independently verified truth. The core never fetches or authenticates a source on its own.

## Run tests
From this directory, with Node.js 20+:
`node --test tests/core.test.mjs`

## Known limits
- SHA-256 hash chaining detects accidental/tampered changes only if the expected chain head is stored independently; it does not sign events or establish who created them.
- An in-memory trace disappears on reload.
- `observedAt` is caller-provided and not a trusted timestamp.
- Rule-based support is not a calibrated probability and does not establish real-world truth.
- Caller annotations may be wrong or malicious.
- For a real deployment, add source-specific verification, durable storage, key management, access control, privacy review, and browser integration tests.

## Design rule
Keep the reasoning engine separate from model adapters, UI, memory storage, and network providers. Those are replaceable layers; this core must remain small enough to test.
