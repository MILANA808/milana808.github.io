# AKSI Evidence Lifecycle Verifier

**Status:** experimental developer tool, merged into the public AKSI repository. The Python verifier uses only the Python standard library.

## Quick start

From the repository root:

```bash
python tools/aksi_evidence_verify.py schemas/fixtures/aksi-evidence-lifecycle-v1.example.json --pretty
```

Validate JSON from standard input:

```bash
cat record.json | python tools/aksi_evidence_verify.py - --pretty
```

The command prints a machine-readable JSON report. Exit code `0` means semantic checks passed, `1` means the record failed checks, and `2` means input could not be read or parsed.

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

The verifier does not yet implement the complete JSON Schema standard, signature verification, or a cross-language canonical JSON digest profile. The browser verifier and Python verifier have different scopes; do not treat them as identical implementations of full schema conformance.

## Source files

- [Python verifier](https://github.com/MILANA808/milana808.github.io/blob/main/tools/aksi_evidence_verify.py)
- [Unit tests](https://github.com/MILANA808/milana808.github.io/blob/main/tests/test_aksi_evidence_verify.py)
- [GitHub Actions workflow](https://github.com/MILANA808/milana808.github.io/blob/main/.github/workflows/aksi-independent-verifier.yml)
- [Record schema](https://github.com/MILANA808/milana808.github.io/blob/main/schemas/aksi-evidence-lifecycle-v1.schema.json)
- [Example record](https://github.com/MILANA808/milana808.github.io/blob/main/schemas/fixtures/aksi-evidence-lifecycle-v1.example.json)
