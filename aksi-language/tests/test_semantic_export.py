import json
from pathlib import Path
import unittest

from aksi_q import Runtime

DATA = Path(__file__).resolve().parents[1] / "data" / "semantic-graph.json"


class SemanticExportTests(unittest.TestCase):
    def test_generated_graph_matches_schema_and_has_core_concepts(self):
        payload = json.loads(DATA.read_text(encoding="utf-8"))
        self.assertEqual(payload["schema"], "AKSI-SEMANTIC-GRAPH/1")
        self.assertTrue(payload["source_version"])
        ids = {item["id"] for item in payload["concepts"]}
        self.assertTrue({"математика", "логика", "вероятность"}.issubset(ids))

    def test_runtime_loads_canonical_concepts_and_relations(self):
        runtime = Runtime()
        count = runtime.load_semantic_graph(DATA)
        self.assertGreater(count, 0)
        answer = runtime.run('ask "математика"')
        self.assertIn("Математика изучает структуры", answer[0])
        inferred = runtime.run('infer "математика"')
        self.assertIn("наука", inferred[0])


if __name__ == "__main__":
    unittest.main()
