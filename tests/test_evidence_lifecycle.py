#!/usr/bin/env python3
import copy
import json
import unittest
from pathlib import Path
import sys

ROOT_FOR_IMPORT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_FOR_IMPORT))
from tools.evidence_lifecycle_verify import validate_evidence_record

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / "schemas/aksi-evidence-lifecycle-v1.schema.json").read_text(encoding="utf-8"))
FIXTURE = json.loads((ROOT / "schemas/fixtures/aksi-evidence-lifecycle-v1.example.json").read_text(encoding="utf-8"))


class EvidenceLifecycleVerifierTests(unittest.TestCase):
    def test_fixture_passes(self):
        self.assertTrue(validate_evidence_record(FIXTURE, SCHEMA)["valid"])

    def test_missing_required_field_fails(self):
        record = copy.deepcopy(FIXTURE)
        del record["subject"]["description"]
        self.assertFalse(validate_evidence_record(record, SCHEMA)["valid"])

    def test_unresolved_source_fails(self):
        record = copy.deepcopy(FIXTURE)
        record["claims"][0]["source_ids"] = ["missing-source"]
        result = validate_evidence_record(record, SCHEMA)
        self.assertTrue(any(x["code"] == "SOURCE_REF_UNRESOLVED" for x in result["semanticIssues"]))

    def test_duplicate_ids_fail(self):
        record = copy.deepcopy(FIXTURE)
        record["sources"].append(copy.deepcopy(record["sources"][0]))
        result = validate_evidence_record(record, SCHEMA)
        self.assertTrue(any(x["code"] == "DUPLICATE_ID" for x in result["semanticIssues"]))

    def test_unresolved_alternative_fails(self):
        record = copy.deepcopy(FIXTURE)
        record["decision"]["selected_alternative_id"] = "not-an-alternative"
        result = validate_evidence_record(record, SCHEMA)
        self.assertTrue(any(x["code"] == "ALTERNATIVE_REF_UNRESOLVED" for x in result["semanticIssues"]))

    def test_verified_claim_without_source_fails(self):
        record = copy.deepcopy(FIXTURE)
        record["claims"][0]["status"] = "verified"
        record["claims"][0]["source_ids"] = []
        result = validate_evidence_record(record, SCHEMA)
        self.assertTrue(any(x["code"] == "VERIFIED_WITHOUT_SOURCE" for x in result["semanticIssues"]))

    def test_unknown_status_fails(self):
        record = copy.deepcopy(FIXTURE)
        record["hypotheses"][0]["status"] = "probably-true"
        result = validate_evidence_record(record, SCHEMA)
        self.assertTrue(any(x["code"] == "ENUM_MISMATCH" for x in result["schemaIssues"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
