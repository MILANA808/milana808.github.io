# AKSI Evidence Lifecycle Verifier

**Status:** experimental developer tool, merged into the public AKSI repository. The canonical Python verifier uses only the Python standard library; a Node.js verifier is also maintained.

## Quick start

From the repository root:

```bash
python tools/evidence_lifecycle_verify.py schemas/fixtures/aksi-evidence-lifecycle-v1.example.json
```

Validate JSON from standard input:

```bash
cat record.json | python tools/evidence_lifecycle_verify.py -
```

The Python verifier prints a machine-readable JSON report. The Node.js verifier can be used for equivalent checks in JavaScript. See each script's usage output for its command-line contract.

## Checks performed

- required top-level fields and supported schema version;
- non-empty identifiers and duplicate IDs within collections;
- duplicate test IDs across hypotheses;
- source references in context, claims, tests, outcomes, and revisions;
- selected decision alternative references;
- supported status and outcome enums;
- basic ISO date/date-time parsing;
- source URI scheme and SHA-256 field format.

GitHub Actions runs the verifier's unit tests and validates the example fixture.

## What a pass means

A passing report means only that the record passed this implementation's semantic checks. It does not prove that sources are authentic or reliable, claims are true, the record is complete, an event actually occurred, the author is who they claim to be, or a timestamp is trusted.

The verifiers perform selected semantic and draft-schema checks, not a claim of full formal JSON Schema conformance. Signature verification and a cross-language canonical JSON digest profile remain separate work. The browser, Node.js, and Python verifiers have different scopes; do not treat them as interchangeable proof of truth.

## Source files

- [Python verifier](https://github.com/MILANA808/milana808.github.io/blob/main/tools/evidence_lifecycle_verify.py)
- [Node.js verifier](https://github.com/MILANA808/milana808.github.io/blob/main/tools/evidence-lifecycle-verifier.mjs)
- [Python conformance tests](https://github.com/MILANA808/milana808.github.io/blob/main/tests/test_evidence_lifecycle.py)
- [GitHub Actions workflow](https://github.com/MILANA808/milana808.github.io/blob/main/.github/workflows/evidence-lifecycle.yml)
- [Record schema](https://github.com/MILANA808/milana808.github.io/blob/main/schemas/aksi-evidence-lifecycle-v1.schema.json)
- [Example record](https://github.com/MILANA808/milana808.github.io/blob/main/schemas/fixtures/aksi-evidence-lifecycle-v1.example.json)
