# AKSI Evidence Lifecycle v1

**Status:** experimental draft. This is an interoperability contract proposal, not a frozen standard.

## Goal

Provide one portable record that connects what a system knew, what it claimed, which sources were available, which hypotheses were tested, what decision was made, what happened afterward, and why the record was later revised.

The format is model-neutral. A record can be created by a person, a browser tool, a local model, or a server. A verifier must not need the original producer implementation to inspect its JSON shape.

## Files

- JSON Schema: [aksi-evidence-lifecycle-v1.schema.json](./schemas/aksi-evidence-lifecycle-v1.schema.json)
- Example record: [aksi-evidence-lifecycle-v1.example.json](./schemas/fixtures/aksi-evidence-lifecycle-v1.example.json)

## Required sections

- `context`: summary plus versionable items, each labeled as fact, assumption, constraint, goal, task, source note, or decision.
- `sources`: source URI, type, retrieval time, and optional SHA-256 of captured content.
- `claims`: claim text, evidence source IDs, and an explicit epistemic status.
- `hypotheses`: falsifiable statements and associated tests with observed outcomes.
- `decision`: alternatives, chosen alternative (or null), rationale, and constraints.
- `outcomes`: later observations that can confirm, weaken, or contradict the original decision.
- `revisions`: an explicit record of why an earlier field or status changed.
- `integrity`: optional SHA-256 digest and optional future signature metadata.

## Status semantics

- `unknown`: not assessed or insufficient information.
- `hypothesis`: proposed but not adequately supported.
- `supported`: evidence currently supports the statement under disclosed assumptions.
- `verified`: passed a declared, reproducible verification procedure. The record must identify that procedure in the test/source trail; the label alone proves nothing.
- `refuted`: available evidence contradicts the statement under the declared test.
- `superseded`: retained for history but no longer the current statement.

These statuses do not represent calibrated probabilities. A cryptographic digest does not prove a claim true. A source URL does not prove that its content was captured correctly. A timestamp written by the producer is not a trusted timestamp.

## Required verifier checks beyond JSON Schema

JSON Schema validates structure only. A conforming semantic verifier should additionally:

1. Reject duplicate IDs within each namespace.
2. Resolve every `source_ids` reference to a source in the same record.
3. Check that `selected_alternative_id` is null or matches exactly one alternative.
4. Reject a `verified` claim if its declared verification procedure or result is absent.
5. Validate digest length and recompute any digest according to a separately specified canonicalization profile.
6. Distinguish content integrity, signer authenticity, source reliability, truth, and causal identification.
7. Preserve unknown extension fields only when they are namespaced and do not silently alter core semantics.
8. Produce stable, machine-readable failure codes and test vectors.

## Integrity profile

This draft intentionally does **not** yet define canonical JSON bytes for signatures. Do not sign `JSON.stringify` output across languages and assume interoperability. Until a canonicalization profile and test vectors are published, SHA-256 may be used as a local fingerprint of exact bytes only.

## What is not promised

This draft does not prove factual truth, causal effects, legal compliance, model quality, or that a producer recorded every event. It does not enforce action policy. It is not yet a production standard and has not undergone independent implementation review.

## Next milestone

Implement an independent verifier and conformance fixtures in at least two implementations (for example JavaScript and Python), then freeze the serialization and integrity profile only after the implementations agree on the same test vectors.
