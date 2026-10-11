# AKSI-TRACE/1 — локальный протокол проверяемого цифрового следа

Status: public prototype specification  
Canonical page: https://milana808.github.io/trace/  
Source repository: https://github.com/MILANA808/milana808.github.io/tree/main/trace

## Purpose

AKSI-TRACE/1 is a browser-local, portable append-only record format for claims, observations, source references, uncertainty and human-reviewed decisions. It is designed to work on a static HTTPS website without a server, account, API key or external JavaScript dependency.

It is a prototype for verifiable record integrity, not an automatic fact-checker, digital signature system, trusted timestamp authority, legal evidence service, or proof that a claim is true.

## Record fields

Every record contains:
- `protocol`: exactly `AKSI-TRACE/1`
- `seq`: one-based position in the chain
- `created_at`: client-reported ISO-8601 time (not a trusted timestamp)
- `claim`: statement or decision
- `source_url`: optional HTTP(S) source URL
- `observation`: human-entered note
- `status`: `OBSERVATION`, `HYPOTHESIS`, `SUPPORTED`, `REFUTED`, or `UNKNOWN`
- `limitations`: known gaps
- `previous_hash`: previous record hash, or `GENESIS` for the first record
- `hash`: SHA-256 digest of the canonical record payload, excluding the `hash` field itself

## Canonicalization

Canonical JSON is produced recursively:
1. Primitive values use JavaScript `JSON.stringify`.
2. Arrays preserve order and canonicalize each element.
3. Object keys are sorted lexicographically; keys and values are JSON-encoded.
4. No whitespace is added outside encoded strings.

The digest is `SHA-256(UTF-8(canonical_json(payload)))`, where payload is the record without `hash`.

## Chain verification

For record at zero-based index `i`:
1. `protocol` must equal `AKSI-TRACE/1`.
2. `seq` must equal `i + 1`.
3. `previous_hash` must equal `GENESIS` for the first record, otherwise the immediately preceding record's `hash`.
4. Recompute SHA-256 over the canonical payload and compare to `hash`.

A chain that passes means the imported records are internally consistent with the supplied hashes. An attacker who can replace the whole file can recompute the whole chain. To establish that a particular version existed earlier, keep the exported file and/or its final hash in an independently controlled place or publish that hash in a trusted external system. A Git commit proves that a particular code/specification version is present in repository history; it does not automatically anchor a user's private journal.

## Export

Envelope format:
```json
{
  "format": "AKSI-TRACE-EXPORT/1",
  "exported_at": "client-generated ISO-8601 time",
  "protocol": "AKSI-TRACE/1",
  "records": [],
  "integrity_note": "Hashes detect changes relative to a known hash; they do not prove truth, authorship, or trusted time."
}
```

## Privacy and security

- All record content remains in browser localStorage until the user exports it or otherwise shares it.
- Do not enter passwords, private keys, API tokens, sensitive personal data, or confidential third-party information.
- Source links are user-supplied and are not fetched or independently validated by the application.
- Imported JSON is treated as untrusted input and checked before replacing the current local chain.
- SHA-256 is a digest, not a signature. AKSI-TRACE/1 does not claim non-repudiation or proof of authorship.
- A device reset, browser cleanup or private-browsing session can remove local data. Export backups.

## Interoperability

The export envelope and record fields are intentionally plain JSON so a future verifier, command-line utility, backend service or third-party integration can implement the same canonicalization and checks. Interoperability should be tested against shared test vectors before claiming conformance.
