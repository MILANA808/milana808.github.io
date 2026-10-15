# AKSI ↔ EQR Conformance Assessment
**Assessment date:** 2026-10-15  
**Target:** Deonté O'dell Watts, `draft-watts-agent-evidence-boundary-00`, revision 00  
**Assessment type:** source inspection of public AKSI repositories; not an independent security certification or live deployment test.

## Executive result

**Status: NOT IMPLEMENTED / NOT DEMONSTRATED as EQR-compatible.** AKSI contains adjacent evidence-ledger, decision-receipt, cryptographic-integrity, and policy-gate prototypes. The inspected code does not implement the EQR v1 data model and verification semantics required by the cited draft. No EQR conformance claim should be made.

This is a protocol-specific finding, not a claim that AKSI has no evidence-related functionality and not a conclusion about copying or infringement.

## Reference document

- Identifier: `draft-watts-agent-evidence-boundary-00`
- Revision: `00`
- Published: 2026-09-12; current IETF Datatracker metadata reviewed on 2026-10-15.
- Status: individual Internet-Draft, intended status Experimental; not an IETF standard.
- Primary source: https://datatracker.ietf.org/doc/html/draft-watts-agent-evidence-boundary-00

Relevant normative areas: Sections 3–4 (non-collapse rules and architecture), 5.1 (evaluation statuses), 5.2 (receipt members), 6 (integrity and issuer authentication), 7 (receipt production), 8–8.1 (verification and fail-closed qualification), 9 (separate authorization), 10 (append-only lifecycle), and 11 (failure/error semantics).

## Source artifacts inspected

Repository: https://github.com/MILANA808/milana808.github.io

- `AKSI-EVIDENCE-LIFECYCLE-1.md` — experimental AKSI lifecycle record proposal.
- `tools/evidence_lifecycle_verify.py` — Python structural/semantic validator for that lifecycle record.
- `tools/evidence-lifecycle-verifier.mjs` — Node.js validator referenced by the documentation.
- `aksi-cognitive-core.js` — deterministic claim/evidence assessment and SHA-256 receipt.
- `aksi-decision-receipt.js` — decision receipt with statement/evidence references and a simple ALLOW/BLOCK gate.
- `integrations/langchain/aksi_permit.py` — signed ECDSA-P256 permit receipt and tool gate.
- `backend/proof.py`, `aksi-proof.js` — integrity/provenance proof implementations.

Repository: https://github.com/MILANA808/Milana-backend

- `app/core/crypto.py` — Ed25519 signing and verification utilities.
- `main.py` and `tests/test_security_contract.py` — backend proof endpoint and a test that explicitly scopes verification to signature integrity.

These artifacts are related components, not an EQR implementation. This assessment does not infer production deployment from the existence of source files.

## Requirement-by-requirement mapping

| EQR requirement | Observed AKSI behavior | Result |
|---|---|---|
| Versioned EQR v1 receipt with the draft's defined fields | AKSI uses separate schemas such as `AKSI-EVIDENCE/1`, `AKSI-RECEIPT/1`, `aksi-decision-receipt/v1`, `aksi-permit/v1`, and `AKSI-VAI/1`. No EQR schema was found in the inspected source. | **NOT IMPLEMENTED** |
| Evidence profile identified by URI and digest of exact profile bytes | AKSI lifecycle records have a general schema; inspected decision/permit receipts do not bind an EQR profile URI plus profile digest. | **NOT IMPLEMENTED** |
| Exact proposition binding by claim identifier and SHA-256 digest | Some receipts record text statements or a goal and evidence IDs. The inspected EQR-shaped fields `claim.id`, `claim.hash_alg`, and `claim.digest` are absent. | **PARTIAL / NOT EQR** |
| Issuer identity authenticated and trusted by verifier | AKSI has Ed25519 backend signatures and ECDSA-P256 permit signatures. The permit receipt includes a public JWK, but the inspected verification method verifies using receipt-supplied key material and does not by itself establish a trusted issuer. No EQR issuer trust profile was found. | **PARTIAL: integrity mechanism exists; EQR issuer semantics not demonstrated** |
| Evidence descriptors bind digest and evidence class; SHA-256/base64url profile | Some modules hash evidence records, and other records store source/snippet metadata. The inspected EQR descriptor contract is not implemented consistently across these schemas. | **PARTIAL / NOT EQR** |
| Freshness: issued_at, expires_at, evidence fresh_until, verifier checks | Lifecycle records include timestamps/source retrieval metadata, but no inspected EQR verifier enforces receipt expiry and evidence freshness against a declared profile. | **NOT DEMONSTRATED** |
| Contradiction state and blocking contradictions | Some backend cognitive responses expose a `contradictions` field; decision receipts do not implement the EQR contradiction object/semantics or require zero blocking contradictions for PASS. | **PARTIAL / NOT EQR** |
| Exactly PASS / FAIL / INDETERMINATE with required fail-closed semantics | AKSI components use other vocabularies: `ALLOW/BLOCK`, claim status labels, and structural `valid/invalid`. No EQR evaluator with the three required statuses was found. | **NOT IMPLEMENTED** |
| Empty required-condition set must not yield PASS | No EQR profile evaluator was found to enforce this rule. | **NOT IMPLEMENTED** |
| Integrity validity kept separate from evidence sufficiency | Documentation and backend test explicitly say a valid signature proves integrity only, not factual truth. This is conceptually aligned. | **CONCEPTUALLY ALIGNED; not EQR conformance** |
| Qualification separated from authorization and execution | AKSI has a permit/tool gate, but it mainly checks whether evidence is present and its declared tier; it does not consume an EQR qualification result. The gate's ALLOW is not evidence that EQR qualification has passed. | **PARTIAL; EQR boundary not implemented** |
| Append-only EQR lifecycle; changed evidence yields successor receipt with `supersedes` | Some AKSI ledgers are append-oriented/hash-chained. The inspected receipts do not implement the EQR successor receipt contract or enforce immutable predecessor/supersession semantics. | **PARTIAL / NOT EQR** |
| Reproducible positive and adversarial EQR conformance fixtures | AKSI has lifecycle verifier tests, but the reviewed notes explicitly list stale evidence, malformed timestamps, tampered content, signature, policy-change, and unknown-extension tests as future work. No EQR-specific conformance fixture suite was found. | **NOT DEMONSTRATED** |
| Interoperability with the draft | No EQR parser/serializer or independent EQR verifier was identified in the inspected paths. | **NOT DEMONSTRATED** |
| Operational deployment | Repository code exists, but this source review did not test the live service, browser deployment, or a real EQR production flow. | **NOT CLAIMED / NOT VERIFIED** |

## Important distinction about existing cryptography

- SHA-256 hashes/fingerprints can detect changes only when the exact bytes/canonicalization and expected digest are known.
- A valid Ed25519 or ECDSA signature establishes integrity and possession/association with a key under the verification model. It does not establish source reliability, factual truth, evidence sufficiency, or EQR conformance.
- A receipt's `ALLOW` / `BLOCK` result is an AKSI-specific gate result, not the EQR `PASS` / `FAIL` / `INDETERMINATE` result.
- A valid EQR `PASS`, if implemented in the future, must remain only an input to a separate authorization decision; it must never itself grant permission to execute.

## Conformance tests required before any future claim

A dedicated implementation should be built against the exact draft revision, not retrofitted by renaming an existing AKSI receipt. At minimum, add versioned positive and adversarial fixtures for:

1. valid receipt/profile/claim/evidence digests;
2. missing required profile condition → `indeterminate`;
3. known violated requirement → `fail`;
4. empty required-condition set cannot yield `pass`;
5. expired receipt and stale evidence;
6. malformed or timezone-less timestamps;
7. changed claim, action, context, profile bytes, or evidence digest;
8. unresolved blocking contradiction;
9. invalid signature and untrusted issuer;
10. tampered receipt and unsupported/malformed status;
11. replay/nonce mismatch where a nonce is required;
12. a `pass` receipt with authorization policy denying the action;
13. a non-`pass` receipt never satisfying a policy that requires `pass`;
14. append-only successor receipt with `supersedes`, while preserving the predecessor;
15. cross-language canonicalization and digest test vectors;
16. hostile evidence-reference handling (no arbitrary dereference/SSRF).

Record the runtime/interpreter versions, exact commit, fixture hashes, expected results, actual results, and known failures. Run in CI and publish the results. Do not label this conformance until all normative requirements applicable to the selected profile are covered.

## Safe statement to send to the draft author

> AKSI currently has independent, experimental evidence-lifecycle, decision-receipt, integrity-proof, and permit-gate components. We have not established that these implement or conform to draft-watts-agent-evidence-boundary-00. In particular, an EQR-specific profile digest, exact proposition digest binding, freshness/contradiction semantics, PASS/FAIL/INDETERMINATE evaluation, and EQR-specific conformance fixtures have not been demonstrated. We therefore make no EQR adoption, interoperability, conformance, or operational-deployment claim. We regard the draft as related prior art for a future feature-by-feature comparison.

## Scope and limitations

This is a repository source review, not a legal opinion, independent security audit, formal verification, complete history/provenance analysis, or live deployment test. It does not prove when every AKSI idea was first conceived. It records only what was visible in the inspected public source at the assessment date.
