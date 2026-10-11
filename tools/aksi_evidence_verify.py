#!/usr/bin/env python3
"""Independent semantic verifier for AKSI Evidence Lifecycle records.

This checks semantic invariants using only the Python standard library.
It does not implement the complete JSON Schema specification and does not
prove that sources, claims, timestamps, or outcomes are truthful.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

PROTOCOL = "AKSI-EVIDENCE-LIFECYCLE-VERIFIER/1"
RECORD_VERSION = "AKSI-EVIDENCE-LIFECYCLE/1"
STATUSES = {"unknown", "hypothesis", "supported", "verified", "refuted", "superseded"}
SOURCE_TYPES = {"web", "document", "dataset", "code", "experiment", "human_statement", "other"}
OUTCOMES = {"pending", "supports", "refutes", "inconclusive", "blocked"}
OUTCOME_STATUSES = {"observed", "partially_observed", "not_observed", "unknown"}
ID_PATTERN = re.compile(r"^[^\\s]{1,160}$")
SHA256_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")


def _is_object(value: Any) -> bool:
    return isinstance(value, dict)


def _is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _parse_datetime(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return "T" in value
    except ValueError:
        return False


def _parse_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def verify_record(record: Any) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    info: list[dict[str, str]] = []

    def issue(bucket: list[dict[str, str]], code: str, path: str, message: str) -> None:
        bucket.append({"code": code, "path": path, "message": message})

    if not _is_object(record):
        issue(errors, "ROOT_NOT_OBJECT", "$", "Record root must be a JSON object.")
        return {"protocol": PROTOCOL, "valid": False, "errors": errors, "warnings": warnings, "info": info}

    required = ["schema_version", "record_id", "created_at", "subject", "context",
                "sources", "claims", "hypotheses", "decision", "outcomes", "revisions"]
    for key in required:
        if key not in record:
            issue(errors, "REQUIRED_FIELD_MISSING", "$." + key, "Required field is missing.")

    if record.get("schema_version") != RECORD_VERSION:
        issue(errors, "UNSUPPORTED_SCHEMA_VERSION", "$.schema_version", "Unsupported schema version.")
    if not _is_nonempty_string(record.get("record_id")) or not ID_PATTERN.match(record.get("record_id", "")):
        issue(errors, "INVALID_RECORD_ID", "$.record_id", "record_id must be a non-empty string without whitespace.")
    if not _parse_datetime(record.get("created_at")):
        issue(errors, "INVALID_DATETIME", "$.created_at", "created_at must be an ISO 8601 date-time.")

    subject = record.get("subject")
    if not _is_object(subject):
        issue(errors, "INVALID_SUBJECT", "$.subject", "subject must be an object.")
    else:
        for key in ("type", "description"):
            if not _is_nonempty_string(subject.get(key)):
                issue(errors, "INVALID_SUBJECT_FIELD", "$.subject." + key, key + " must be a non-empty string.")

    context = record.get("context")
    if not _is_object(context):
        issue(errors, "INVALID_CONTEXT", "$.context", "context must be an object.")
        context_items: list[Any] = []
    else:
        if not isinstance(context.get("summary"), str):
            issue(errors, "INVALID_CONTEXT_SUMMARY", "$.context.summary", "summary must be a string.")
        context_items = context.get("items", [])
        if not isinstance(context_items, list):
            issue(errors, "INVALID_CONTEXT_ITEMS", "$.context.items", "items must be an array.")
            context_items = []

    array_names = ("sources", "claims", "hypotheses", "outcomes", "revisions")
    arrays: dict[str, list[Any]] = {}
    for name in array_names:
        value = record.get(name, [])
        if not isinstance(value, list):
            issue(errors, "INVALID_ARRAY", "$." + name, name + " must be an array.")
            arrays[name] = []
        else:
            arrays[name] = value

    decision = record.get("decision")
    if not _is_object(decision):
        issue(errors, "INVALID_DECISION", "$.decision", "decision must be an object.")
        decision = {}
    if not _is_nonempty_string(decision.get("question")):
        issue(errors, "INVALID_DECISION_QUESTION", "$.decision.question", "question must be a non-empty string.")
    alternatives = decision.get("alternatives", [])
    if not isinstance(alternatives, list) or len(alternatives) < 1:
        issue(errors, "INVALID_ALTERNATIVES", "$.decision.alternatives", "At least one alternative is required.")
        alternatives = []

    def collect_ids(items: list[Any], path: str, bucket_name: str) -> set[str]:
        seen: set[str] = set()
        for index, item in enumerate(items):
            item_path = f"{path}[{index}]"
            if not _is_object(item):
                issue(errors, "ITEM_NOT_OBJECT", item_path, "Array item must be an object.")
                continue
            item_id = item.get("id")
            if not _is_nonempty_string(item_id):
                issue(errors, "ID_MISSING", item_path + ".id", "Every item must have a non-empty id.")
                continue
            if item_id in seen:
                issue(errors, "DUPLICATE_ID", item_path + ".id", f"Duplicate ID in {bucket_name}: {item_id}.")
            seen.add(item_id)
        return seen

    source_ids = collect_ids(arrays["sources"], "$.sources", "sources")
    context_ids = collect_ids(context_items, "$.context.items", "context.items")
    claim_ids = collect_ids(arrays["claims"], "$.claims", "claims")
    hypothesis_ids = collect_ids(arrays["hypotheses"], "$.hypotheses", "hypotheses")
    outcome_ids = collect_ids(arrays["outcomes"], "$.outcomes", "outcomes")
    revision_ids = collect_ids(arrays["revisions"], "$.revisions", "revisions")
    alternative_ids = collect_ids(alternatives, "$.decision.alternatives", "decision.alternatives")

    # IDs are unique within each collection; tests are unique across all hypotheses.
    test_ids: set[str] = set()
    for hi, hypothesis in enumerate(arrays["hypotheses"]):
        hp = f"$.hypotheses[{hi}]"
        if not _is_object(hypothesis):
            continue
        if not _is_nonempty_string(hypothesis.get("statement")):
            issue(errors, "HYPOTHESIS_STATEMENT_MISSING", hp + ".statement", "Hypothesis statement must be non-empty.")
        if hypothesis.get("status") not in STATUSES:
            issue(errors, "UNKNOWN_STATUS", hp + ".status", "Unknown hypothesis status.")
        tests = hypothesis.get("tests", [])
        if not isinstance(tests, list):
            issue(errors, "INVALID_TESTS", hp + ".tests", "tests must be an array.")
            continue
        for ti, test in enumerate(tests):
            tp = f"{hp}.tests[{ti}]"
            if not _is_object(test):
                issue(errors, "ITEM_NOT_OBJECT", tp, "Test must be an object.")
                continue
            tid = test.get("id")
            if not _is_nonempty_string(tid):
                issue(errors, "ID_MISSING", tp + ".id", "Test must have a non-empty id.")
            elif tid in test_ids:
                issue(errors, "DUPLICATE_TEST_ID", tp + ".id", f"Duplicate test ID: {tid}.")
            else:
                test_ids.add(tid)
            if test.get("outcome") not in OUTCOMES:
                issue(errors, "UNKNOWN_TEST_OUTCOME", tp + ".outcome", "Unknown test outcome.")
            refs = test.get("source_ids", [])
            if not isinstance(refs, list):
                issue(errors, "INVALID_SOURCE_REFS", tp + ".source_ids", "source_ids must be an array.")
            else:
                for ri, source_id in enumerate(refs):
                    if not isinstance(source_id, str) or source_id not in source_ids:
                        issue(errors, "SOURCE_REF_UNRESOLVED", f"{tp}.source_ids[{ri}]", f"Unknown source ID: {source_id}.")

    def check_source_refs(items: list[Any], path: str) -> None:
        for i, item in enumerate(items):
            if not _is_object(item):
                continue
            refs = item.get("source_ids", [])
            if not isinstance(refs, list):
                issue(errors, "INVALID_SOURCE_REFS", f"{path}[{i}].source_ids", "source_ids must be an array.")
                continue
            if len(refs) != len(set(x for x in refs if isinstance(x, str))):
                issue(errors, "DUPLICATE_SOURCE_REF", f"{path}[{i}].source_ids", "source_ids must not contain duplicates.")
            for j, source_id in enumerate(refs):
                if not isinstance(source_id, str) or source_id not in source_ids:
                    issue(errors, "SOURCE_REF_UNRESOLVED", f"{path}[{i}].source_ids[{j}]", f"Unknown source ID: {source_id}.")

    check_source_refs(context_items, "$.context.items")
    check_source_refs(arrays["claims"], "$.claims")
    check_source_refs(arrays["outcomes"], "$.outcomes")
    check_source_refs(arrays["revisions"], "$.revisions")

    selected = decision.get("selected_alternative_id")
    if selected is not None and (not isinstance(selected, str) or selected not in alternative_ids):
        issue(errors, "SELECTED_ALTERNATIVE_UNRESOLVED", "$.decision.selected_alternative_id", "Selected alternative must be null or match an alternative ID.")
    if selected is None:
        issue(warnings, "DECISION_NOT_SELECTED", "$.decision.selected_alternative_id", "No alternative has been selected.")

    for i, source in enumerate(arrays["sources"]):
        if not _is_object(source):
            continue
        sp = f"$.sources[{i}]"
        if not _is_nonempty_string(source.get("uri")):
            issue(errors, "SOURCE_URI_MISSING", sp + ".uri", "Source URI must be a non-empty string.")
        elif not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", source["uri"]):
            issue(errors, "SOURCE_URI_INVALID", sp + ".uri", "Source URI must have a scheme.")
        if source.get("source_type") not in SOURCE_TYPES:
            issue(errors, "UNKNOWN_SOURCE_TYPE", sp + ".source_type", "Unknown source_type.")
        if "retrieved_at" in source and not _parse_datetime(source["retrieved_at"]):
            issue(errors, "INVALID_DATETIME", sp + ".retrieved_at", "retrieved_at must be an ISO 8601 date-time.")
        if "content_sha256" in source and not SHA256_PATTERN.fullmatch(str(source["content_sha256"])):
            issue(errors, "INVALID_SHA256", sp + ".content_sha256", "content_sha256 must be 64 hexadecimal characters.")

    for i, item in enumerate(context_items):
        if not _is_object(item):
            continue
        ip = f"$.context.items[{i}]"
        if item.get("kind") not in {"fact", "assumption", "constraint", "goal", "task", "source_note", "decision"}:
            issue(errors, "UNKNOWN_CONTEXT_KIND", ip + ".kind", "Unknown context item kind.")
        if item.get("status") not in STATUSES:
            issue(errors, "UNKNOWN_STATUS", ip + ".status", "Unknown context status.")
        if "valid_until" in item and not _parse_date(item["valid_until"]):
            issue(errors, "INVALID_DATE", ip + ".valid_until", "valid_until must be an ISO date.")

    for i, claim in enumerate(arrays["claims"]):
        if not _is_object(claim):
            continue
        cp = f"$.claims[{i}]"
        if not _is_nonempty_string(claim.get("text")):
            issue(errors, "CLAIM_TEXT_MISSING", cp + ".text", "Claim text must be non-empty.")
        if claim.get("status") not in STATUSES:
            issue(errors, "UNKNOWN_STATUS", cp + ".status", "Unknown claim status.")
        if claim.get("confidence_label") is not None and claim["confidence_label"] not in {"low", "medium", "high", "not_assessed"}:
            issue(errors, "UNKNOWN_CONFIDENCE_LABEL", cp + ".confidence_label", "Unknown confidence label.")
        if claim.get("status") == "verified":
            tests_for_claim = claim.get("verification", None)
            if not tests_for_claim:
                issue(warnings, "VERIFIED_WITHOUT_PROCEDURE", cp, "Claim is labeled verified without a declared verification procedure; the label is not proof.")

    for i, outcome in enumerate(arrays["outcomes"]):
        if not _is_object(outcome):
            continue
        op = f"$.outcomes[{i}]"
        if not _parse_datetime(outcome.get("observed_at")):
            issue(errors, "INVALID_DATETIME", op + ".observed_at", "observed_at must be an ISO 8601 date-time.")
        if not _is_nonempty_string(outcome.get("description")):
            issue(errors, "OUTCOME_DESCRIPTION_MISSING", op + ".description", "Outcome description must be non-empty.")
        if outcome.get("status") not in OUTCOME_STATUSES:
            issue(errors, "UNKNOWN_OUTCOME_STATUS", op + ".status", "Unknown outcome status.")

    for i, revision in enumerate(arrays["revisions"]):
        if not _is_object(revision):
            continue
        rp = f"$.revisions[{i}]"
        if not _parse_datetime(revision.get("revised_at")):
            issue(errors, "INVALID_DATETIME", rp + ".revised_at", "revised_at must be an ISO 8601 date-time.")
        if not _is_nonempty_string(revision.get("reason")):
            issue(errors, "REVISION_REASON_MISSING", rp + ".reason", "Revision reason must be non-empty.")

    if not arrays["sources"]:
        issue(warnings, "NO_SOURCES", "$.sources", "No sources are recorded.")
    if record.get("integrity") is not None:
        issue(warnings, "INTEGRITY_NOT_VERIFIED", "$.integrity", "Integrity metadata is not verified by this semantic checker; digest canonicalization and signatures need a separate profile.")

    info.append({"code": "CHECK_SCOPE", "path": "$", "message": "Semantic checks passed over required fields, identifiers, enums, dates, and cross-references."})
    info.append({"code": "TRUTH_LIMIT", "path": "$", "message": "A valid record is not proof that its sources or claims are true."})
    return {
        "protocol": PROTOCOL,
        "record_id": record.get("record_id"),
        "valid": len(errors) == 0,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
        "info": info,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Check an AKSI Evidence Lifecycle JSON record.")
    parser.add_argument("record", help="Path to a JSON record, or '-' to read stdin.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the JSON report.")
    args = parser.parse_args()
    try:
        raw = sys.stdin.read() if args.record == "-" else Path(args.record).read_text(encoding="utf-8")
        record = json.loads(raw)
    except (OSError, json.JSONDecodeError) as exc:
        report = {"protocol": PROTOCOL, "valid": False, "error_count": 1,
                  "errors": [{"code": "INPUT_READ_FAILED", "path": "$", "message": str(exc)}],
                  "warnings": [], "info": []}
        print(json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None))
        return 2
    report = verify_record(record)
    print(json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None, sort_keys=True))
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
