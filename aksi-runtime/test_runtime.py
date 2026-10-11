import unittest
from unittest.mock import patch
import aksi_runtime as aksi

class RuntimeTests(unittest.TestCase):
    def test_unknown_command_is_not_executed(self):
        result, trace = aksi.route("/run rm -rf /", {"notes": []})
        self.assertEqual(result, "")
        self.assertTrue(trace)

    def test_remember(self):
        mem = {"notes": []}
        with patch.object(aksi, "save_memory") as save:
            result, _ = aksi.route("/remember keep API keys private", mem)
        self.assertIn("Сохранено", result)
        self.assertEqual(mem["notes"][0]["text"], "keep API keys private")
        save.assert_called_once()

    def test_forget(self):
        mem = {"notes": [{"text": "secret"}]}
        with patch.object(aksi, "save_memory"):
            result, _ = aksi.route("/forget", mem)
        self.assertEqual(mem, {"notes": []})
        self.assertIn("очищена", result)

    def test_reject_non_http(self):
        with self.assertRaises(ValueError):
            aksi.fetch_public("file:///etc/passwd")

    def test_reject_private_ip(self):
        with patch.object(aksi.socket, "getaddrinfo", return_value=[(2, 1, 6, "", ("127.0.0.1", 80))]):
            with self.assertRaises(ValueError):
                aksi.fetch_public("http://example.test")

if __name__ == "__main__":
    unittest.main()
