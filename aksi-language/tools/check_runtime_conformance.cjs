#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { Runtime } = require(path.resolve(__dirname, "..", "..", "aksi-q-browser.js"));

const languageDir = path.resolve(__dirname, "..");
const fixturePath = path.join(languageDir, "conformance", "common-v1.json");
const payload = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
assert.equal(payload.schema, "AKSI-Q-CONFORMANCE/1");
assert.ok(Array.isArray(payload.cases) && payload.cases.length > 0);

const pythonScript = [
  "import json, sys",
  "from aksi_q import Runtime",
  "payload = json.load(open(sys.argv[1], encoding='utf-8'))",
  "results = {}",
  "for case in payload['cases']:",
  "    try:",
  "        results[case['name']] = {'ok': True, 'value': Runtime().run(case['program'])}",
  "    except Exception as exc:",
  "        results[case['name']] = {'ok': False, 'error': str(exc)}",
  "print(json.dumps(results, ensure_ascii=False, allow_nan=False))"
].join("\n");
const pythonRun = spawnSync(process.env.PYTHON || "python3", ["-c", pythonScript, fixturePath], {
  cwd: languageDir,
  encoding: "utf8"
});
if (pythonRun.status !== 0) {
  throw new Error("Python AKSI Q conformance runner failed: " + (pythonRun.stderr || pythonRun.stdout));
}
const pythonResults = JSON.parse(pythonRun.stdout.trim().split(/\r?\n/).pop());

function compare(actual, expected, label) {
  if (typeof expected === "number") {
    assert.equal(typeof actual, "number", label + " should be numeric");
    assert.ok(Number.isFinite(actual), label + " should be finite");
    assert.ok(Math.abs(actual - expected) <= 1e-9, label + ": " + actual + " != " + expected);
    return;
  }
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), label + " should be an array");
    assert.equal(actual.length, expected.length, label + " array length");
    expected.forEach((value, index) => compare(actual[index], value, label + "[" + index + "]"));
    return;
  }
  assert.deepEqual(actual, expected, label);
}

(async () => {
  for (const item of payload.cases) {
    const py = pythonResults[item.name];
    assert.ok(py && py.ok, item.name + " Python runtime error: " + (py && py.error));
    compare(py.value, item.expected, item.name + " Python expected");
    const js = await new Runtime().run(item.program);
    compare(js, item.expected, item.name + " browser-runtime expected");
    compare(js, py.value, item.name + " Python/JavaScript parity");
    process.stdout.write("PASS " + item.name + "\n");
  }
  process.stdout.write("AKSI Q cross-runtime conformance: " + payload.cases.length + " cases passed\n");
})().catch(error => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
