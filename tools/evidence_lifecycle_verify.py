#!/usr/bin/env python3
"""Dependency-free semantic and draft-schema checks for AKSI Evidence Lifecycle v1."""
from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCHEMA = ROOT / "schemas" / "aksi-evidence-lifecycle-v1.schema.json"


def _is_type(value, kind):
    if kind == "null": return value is None
    if kind == "object": return isinstance(value, dict)
    if kind == "array": return isinstance(value, list)
    if kind == "boolean": return isinstance(value, bool)
    if kind == "integer": return isinstance(value, int) and not isinstance(value, bool)
    if kind == "number": return isinstance(value, (int, float)) and not isinstance(value, bool)
    if kind == "string": return isinstance(value, str)
    return False


def _resolve_ref(root, ref):
    if not ref.startswith("#/"):
        raise ValueError("Only local JSON Schema refs are supported: " + ref)
    node = root
    for part in ref[2:].split("/"):
        key = part.replace("~1", "/").replace("~0", "~")
        node = node.get(key) if isinstance(node, dict) else None
    return node


def validate_against_schema(value, schema, root=None, location="$", issues=None):
    """Validate the subset of JSON Schema keywords used in the current AKSI v1 schema."""
    if root is None: root = schema
    if issues is None: issues = []
    if "$ref" in schema:
        target = _resolve_ref(root, schema["$ref"])
        if target is None:
            issues.append({"code":"SCHEMA_REF_UNRESOLVED","path":location,"message":"Unresolved schema reference: "+schema["$ref"]})
            return issues
        return validate_against_schema(value, target, root, location, issues)
    if "const" in schema and value != schema["const"]:
        issues.append({"code":"CONST_MISMATCH","path":location,"message":"Value must equal "+json.dumps(schema["const"])})
    if "enum" in schema and value not in schema["enum"]:
        issues.append({"code":"ENUM_MISMATCH","path":location,"message":"Value is not an allowed enum member"})
    if "type" in schema:
        kinds = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_is_type(value, kind) for kind in kinds):
            issues.append({"code":"TYPE_MISMATCH","path":location,"message":"Expected type "+" or ".join(kinds)})
            return issues
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            issues.append({"code":"STRING_TOO_SHORT","path":location,"message":"String is shorter than minLength"})
        if "pattern" in schema and not re.search(schema["pattern"], value):
            issues.append({"code":"PATTERN_MISMATCH","path":location,"message":"String does not match required pattern"})
        if schema.get("format") == "date-time":
            try: datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError: issues.append({"code":"FORMAT_DATE_TIME","path":location,"message":"Expected an ISO date-time string"})
        if schema.get("format") == "date":
            try: date.fromisoformat(value)
            except ValueError: issues.append({"code":"FORMAT_DATE","path":location,"message":"Expected an ISO date string"})
        if schema.get("format") == "uri":
            parsed = urlparse(value)
            if not parsed.scheme: issues.append({"code":"FORMAT_URI","path":location,"message":"Expected an absolute URI"})
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            issues.append({"code":"ARRAY_TOO_SHORT","path":location,"message":"Array has fewer than minItems"})
        if schema.get("uniqueItems"):
            serialized = [json.dumps(item, sort_keys=True, separators=(",", ":")) for item in value]
            if len(set(serialized)) != len(serialized):
                issues.append({"code":"ARRAY_NOT_UNIQUE","path":location,"message":"Array items must be unique"})
        if "items" in schema:
            for index, item in enumerate(value):
                validate_against_schema(item, schema["items"], root, f"{location}[{index}]", issues)
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                issues.append({"code":"REQUIRED_MISSING","path":location+"."+key,"message":"Required property is missing"})
        properties = schema.get("properties", {})
        for key, child in value.items():
            if key in properties:
                validate_against_schema(child, properties[key], root, location+"."+key, issues)
            elif schema.get("additionalProperties") is False:
                issues.append({"code":"ADDITIONAL_PROPERTY","path":location+"."+key,"message":"Additional property is not allowed"})
    return issues


def validate_evidence_record(record, schema):
    schema_issues = validate_against_schema(record, schema)
    semantic_issues = []
    if not isinstance(record, dict):
        return {"valid":False,"schemaIssues":schema_issues,"semanticIssues":[{"code":"ROOT_NOT_OBJECT","path":"$","message":"Record root must be an object"}]}

    groups = [
        ("sources", record.get("sources")), ("claims", record.get("claims")),
        ("hypotheses", record.get("hypotheses")), ("outcomes", record.get("outcomes")),
        ("revisions", record.get("revisions")),
        ("context.items", (record.get("context") or {}).get("items") if isinstance(record.get("context"), dict) else None),
        ("decision.alternatives", (record.get("decision") or {}).get("alternatives") if isinstance(record.get("decision"), dict) else None),
    ]
    hypotheses_for_tests = record.get("hypotheses")
    if isinstance(hypotheses_for_tests, list):
        for index, hypothesis in enumerate(hypotheses_for_tests):
            if isinstance(hypothesis, dict):
                groups.append((f"hypotheses[{index}].tests", hypothesis.get("tests")))

    id_sets = {}
    for label, items in groups:
        if not isinstance(items, list): continue
        seen = set()
        for index, item in enumerate(items):
            if not isinstance(item, dict) or not isinstance(item.get("id"), str): continue
            item_id = item["id"]
            if item_id in seen:
                semantic_issues.append({"code":"DUPLICATE_ID","path":f"{label}[{index}].id","message":f"Duplicate id within {label}: {item_id}"})
            seen.add(item_id)
        id_sets[label] = seen
    source_ids = id_sets.get("sources", set())

    def check_refs(items, label):
        if not isinstance(items, list): return
        for index, item in enumerate(items):
            if not isinstance(item, dict) or "source_ids" not in item or not isinstance(item["source_ids"], list): continue
            for j, source_id in enumerate(item["source_ids"]):
                if source_id not in source_ids:
                    semantic_issues.append({"code":"SOURCE_REF_UNRESOLVED","path":f"{label}[{index}].source_ids[{j}]","message":"Source id does not resolve: "+str(source_id)})
    context = record.get("context")
    check_refs(context.get("items") if isinstance(context, dict) else None, "context.items")
    check_refs(record.get("claims"), "claims")
    check_refs(record.get("outcomes"), "outcomes")
    hypotheses = record.get("hypotheses")
    if isinstance(hypotheses, list):
        for i, hypothesis in enumerate(hypotheses):
            if isinstance(hypothesis, dict): check_refs(hypothesis.get("tests"), f"hypotheses[{i}].tests")

    decision = record.get("decision")
    if isinstance(decision, dict) and isinstance(decision.get("alternatives"), list):
        selected = decision.get("selected_alternative_id")
        alternatives = {x.get("id") for x in decision["alternatives"] if isinstance(x, dict) and isinstance(x.get("id"), str)}
        if selected is not None and selected not in alternatives:
            semantic_issues.append({"code":"ALTERNATIVE_REF_UNRESOLVED","path":"decision.selected_alternative_id","message":"Selected alternative does not resolve to an alternative id"})
    claims = record.get("claims")
    if isinstance(claims, list):
        for i, claim in enumerate(claims):
            if isinstance(claim, dict) and claim.get("status") == "verified" and not claim.get("source_ids"):
                semantic_issues.append({"code":"VERIFIED_WITHOUT_SOURCE","path":f"claims[{i}].status","message":"A verified claim must reference at least one source in this draft profile"})
    return {"valid":not (schema_issues or semantic_issues),"schemaIssues":schema_issues,"semanticIssues":semantic_issues}


def main(argv):
    if len(argv) < 2 or argv[1] in ("--help", "-h"):
        print("Usage: python tools/evidence_lifecycle_verify.py <record.json> [schema.json]", file=sys.stderr)
        return 0 if len(argv) >= 2 else 2
    try:
        record = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
        schema_path = Path(argv[2]) if len(argv) > 2 else DEFAULT_SCHEMA
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        result = validate_evidence_record(record, schema)
        print(json.dumps({"protocol":"AKSI-EVIDENCE-LIFECYCLE-VERIFIER/1","valid":result["valid"],"schemaIssues":result["schemaIssues"],"semanticIssues":result["semanticIssues"]}, ensure_ascii=False, indent=2))
        return 0 if result["valid"] else 1
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(json.dumps({"valid":False,"code":"INPUT_ERROR","message":str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
