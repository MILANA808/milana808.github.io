# AKSI-VAI/1 — Verifiable AI Interchange

AKSI-VAI is a vendor-neutral envelope for carrying AI work together with the metadata required to inspect its provenance.

## Minimal object

```json
{
  "protocol": "AKSI-VAI/1",
  "agent": "provider-or-agent-id",
  "model": "model-id",
  "intent_hash": "sha256:...",
  "context_hash": "sha256:...",
  "source_refs": [],
  "actions": [],
  "experiments": [],
  "result_hash": "sha256:...",
  "uncertainty": 0.2,
  "status": "OBSERVATION",
  "previous": null,
  "id": "sha256:...",
  "signature": {}
}
```

## Status discipline

`OBSERVATION → HYPOTHESIS → SUPPORTED → VERIFIED`.

An AI-generated answer must not become `VERIFIED` merely because a model says it is true. Verification requires external evidence, a reproducible check, or an explicitly trusted authority.

## Bridges

A bridge adapts an existing AI/runtime to AKSI without replacing the model. The bridge records the request/result hashes and provenance envelope, then passes the result onward.

Supported integration targets are architectural adapters for:

- OpenAI-compatible HTTP APIs
- MCP tool ecosystems
- browser-local models
- self-hosted/local inference
- ordinary HTTP services

The bridge does not grant authority. Policy, identity, and the action gateway remain separate security boundaries.

## Security

SHA-256 provides content integrity. Ed25519 provides cryptographic signatures when a key is available. Neither proves that an AI statement is factually true. Private signing keys must remain outside the public repository.

## Discovery

Machines can discover this protocol through `/.well-known/aksi.json`.

## Product principle

**Any model can remain itself. AKSI adds a verifiable layer around the work.**
