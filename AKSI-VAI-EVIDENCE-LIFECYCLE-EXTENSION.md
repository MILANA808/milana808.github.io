# AKSI-VAI Evidence Lifecycle Extension v1

**Status:** experimental, additive extension. It does not change the required AKSI-VAI/1 minimal object.

## Purpose

AKSI-VAI records an interchange envelope for AI work. Evidence Lifecycle records the wider claim-and-decision history: context, sources, hypotheses, tests, decision alternatives, outcomes, and revisions. This extension links the two without forcing every bridge to implement the full lifecycle immediately.

## Optional extension object

Producers MAY include the following namespaced member in a VAI envelope:

```json
{
  "protocol": "AKSI-VAI/1",
  "id": "sha256:...",
  "extensions": {
    "org.aksi.evidence_lifecycle": {
      "protocol": "AKSI-EVIDENCE-LIFECYCLE/1",
      "record_uri": "https://example.invalid/records/record-001.json",
      "record_id": "record-001",
      "record_sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "verification_profile": "AKSI-EVIDENCE-LIFECYCLE-SEMANTIC/1"
    }
  }
}
```

The values above are illustrative placeholders, not a valid published record or proof of verification.

### Fields

- `protocol` is the exact lifecycle record version identifier.
- `record_uri` is an optional location for retrieving the full record. It may be omitted for private or local-only records.
- `record_id` identifies the linked record and must match the record's own ID.
- `record_sha256` is an optional digest of the exact published record bytes, computed externally. It must not be computed over a record that embeds that same digest unless a separately specified canonicalization procedure resolves the self-reference.
- `verification_profile` names the checks actually performed. Omit it if no verifier was run. Never infer verification from the presence of this extension.

Unknown extension keys must be preserved or explicitly reported as unsupported; they must not silently change the meaning of core VAI fields.

## Verification sequence

1. Parse and validate the VAI envelope using its declared version.
2. If a lifecycle record is available, parse it and validate against the matching lifecycle schema version.
3. Check that `record_id` matches and, if a digest is supplied, hash the exact retrieved bytes and compare in constant time.
4. Run semantic cross-reference checks for source IDs, tests, and the selected decision alternative.
5. Record the verifier name/version, profile, input digest, time source, and result in the caller's own audit record.
6. Keep the result's scope explicit: schema validity, cross-reference integrity, digest integrity, signature authenticity, source reliability, and factual truth are distinct properties.

## Security and privacy

- Do not embed API keys, private signing keys, private user memory, or sensitive source content in public records.
- A URI is a locator, not an authenticity guarantee. Fetching a mutable URI later may return different bytes.
- A digest establishes equality to a known byte sequence, not who published it or whether it is true.
- A producer-supplied timestamp is not a trusted timestamp.
- A valid lifecycle record does not itself authorize a tool call, payment, deployment, or other side effect.
- Policy enforcement and action authorization remain separate, fail-closed boundaries.

## Compatibility

This is an additive extension. VAI/1 implementations that do not understand it may ignore the namespaced member, but should preserve it when round-tripping envelopes. A consumer that requires lifecycle checks must fail closed when the extension is missing or the declared verification profile is unsupported.

## Implementation status

The AKSI repository currently includes a draft lifecycle schema, a browser checker, Node.js and Python semantic verifiers, and automated checks. These implementations have different scopes and do not yet establish a complete cross-language cryptographic conformance profile. This document is a design proposal, not a claim of formal standardization.
