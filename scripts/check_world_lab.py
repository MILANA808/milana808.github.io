#!/usr/bin/env python3
"""Static integrity checks for the browser-only AKSI Virtual World Lab."""
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "world-lab" / "index.html"
source = HTML.read_text(encoding="utf-8")

required = [
    'id="population"', 'id="generation"', 'id="storage"',
    'id="disturbance"', 'id="seed"', 'id="run"', 'id="save"',
    'id="export"', 'id="check"', 'function simulate(p)',
    'function rng(seed)', 'function history()', 'aksi-city-energy-v0.1',
]
missing = [item for item in required if item not in source]
if missing:
    raise SystemExit("Missing required lab features: " + ", ".join(missing))

scripts = re.findall(r"<script\b[^>]*>(.*?)</script\s*>", source, re.I | re.S)
if not scripts:
    raise SystemExit("No inline JavaScript found to validate")
inline_js = "\n".join(scripts)
# A self-contained lab must not silently depend on network APIs.
for forbidden in ("fetch(", "XMLHttpRequest", "WebSocket("):
    if forbidden in inline_js:
        raise SystemExit(f"Unexpected network dependency in inline JavaScript: {forbidden}")

with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
    handle.write(inline_js)
    js_path = handle.name
try:
    subprocess.run(["node", "--check", js_path], check=True)
finally:
    Path(js_path).unlink(missing_ok=True)

print("PASS: required controls and model are present")
print("PASS: inline JavaScript syntax is valid")
print("PASS: no fetch/XHR/WebSocket network dependency detected")
