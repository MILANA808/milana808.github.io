# AKSI Protocol v1

**Status:** experimental specification

AKSI Protocol defines a portable envelope for recording and verifying an AI-agent run. It is an interoperability proposal, not an industry standard.

## Envelope

```json
{
  "protocol": "AKSI/1",
  "run": {"id":"...","startedAt":"...","finishedAt":"..."},
  "request": {"id":"...","hash":"..."},
  "agent": {"id":"...","model":"..."},
  "policy": {"network":false,"tools":[]},
  "provenance": [],
  "memory": [],
  "result": {"answer":"...","uncertainty":"..."},
  "actions": [],
  "proof": {"algorithm":"SHA-256","hash":"...","previousHash":"..."}
}
```

## Semantics

- `policy.network` records whether network access was authorized; it does not claim that a network call occurred.
- `provenance` records reported origins/evidence; provenance is not a truth guarantee.
- `uncertainty` is an agent-reported assessment and must not be treated as calibrated probability unless calibration evidence exists.
- `proof.hash` commits to the canonical record. It proves integrity of the recorded bytes, not truth of the underlying claims.
- External or consequential actions should carry an explicit human approval record when policy requires it.

## Verification

A verifier must canonicalize the signed/hashed fields deterministically, recompute SHA-256, compare the stored digest, and report failures without silently repairing the record.

## Threat model

The protocol is designed to detect post-record tampering. It does not protect against a compromised runtime creating a false record, malicious or incorrect sources, a compromised private key, or a model that lies about its own provenance. Stronger guarantees require trusted execution, authenticated integrations, or independent attestations.

## Compatibility

Unknown fields must be ignored by older readers when safe to do so. Readers must reject unknown protocol major versions rather than guessing semantics.
