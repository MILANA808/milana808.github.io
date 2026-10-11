import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from aksi_evidence_verify import verify_record  # noqa: E402

FIXTURE = ROOT / "schemas" / "fixtures" / "aksi-evidence-lifecycle-v1.example.json"


class EvidenceVerifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_example_fixture_is_semantically_valid(self):
        report = verify_record(self.fixture)
        self.assertTrue(report["valid"], report["errors"])

    def test_non_object_root_is_rejected(self):
        self.assertFalse(verify_record([])["valid"])

    def test_missing_required_field_is_rejected(self):
        record = json.loads(json.dumps(self.fixture))
        del record["created_at"]
        codes = {e["code"] for e in verify_record(record)["errors"]}
        self.assertIn("REQUIRED_FIELD_MISSING", codes)

    def test_duplicate_source_id_is_rejected(self):
        record = json.loads(json.dumps(self.fixture))
        record["sources"].append(dict(record["sources"][0]))
        codes = {e["code"] for e in verify_record(record)["errors"]}
        self.assertIn("DUPLICATE_ID", codes)

    def test_dangling_claim_source_reference_is_rejected(self):
        record = json.loads(json.dumps(self.fixture))
        record["claims"][0]["source_ids"] = ["missing-source"]
        codes = {e["code"] for e in verify_record(record)["errors"]}
        self.assertIn("SOURCE_REF_UNRESOLVED", codes)

    def test_selected_alternative_must_resolve(self):
        record = json.loads(json.dumps(self.fixture))
        record["decision"]["selected_alternative_id"] = "ghost"
        codes = {e["code"] for e in verify_record(record)["errors"]}
        self.assertIn("SELECTED_ALTERNATIVE_UNRESOLVED", codes)

    def test_duplicate_test_ids_are_rejected_across_hypotheses(self):
        record = json.loads(json.dumps(self.fixture))
        duplicate = json.loads(json.dumps(record["hypotheses"][0]))
        duplicate["id"] = "hyp-2"
        record["hypotheses"].append(duplicate)
        codes = {e["code"] for e in verify_record(record)["errors"]}
        self.assertIn("DUPLICATE_TEST_ID", codes)

    def test_unknown_claim_status_is_rejected(self):
        record = json.loads(json.dumps(self.fixture))
        record["claims"][0]["status"] = "probably_true"
        codes = {e["code"] for e in verify_record(record)["errors"]}
        self.assertIn("UNKNOWN_STATUS", codes)

    def test_cli_returns_zero_for_valid_record(self):
        proc = subprocess.run(
            [sys.executable, str(ROOT / "tools" / "aksi_evidence_verify.py"), str(FIXTURE)],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertTrue(json.loads(proc.stdout)["valid"])


if __name__ == "__main__":
    unittest.main()
