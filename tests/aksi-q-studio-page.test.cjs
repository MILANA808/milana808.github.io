"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "aksi-q-studio", "index.html"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("AKSI Q Studio is a real static route linked from the homepage", () => {
  assert.match(page, /<html lang="ru">/);
  assert.match(page, /<script src="\.\.\/aksi-language\/aksi-ui\.js\?v=0\.2\.0"><\/script>/);
  assert.match(page, /id="source"/);
  assert.match(page, /id="preview"/);
  assert.match(home, /href="\/aksi-q-studio\/">⌘ AKSI Q/);
});

test("Studio compiles the editable AKSI Q source through the runtime API", () => {
  assert.match(page, /window\.AKSI_Q_UI\.parse\(source\.value\)/);
  assert.match(page, /window\.AKSI_Q_UI\.render\(ast,document/);
  assert.match(page, /preview\.replaceChildren\(page\)/);
  assert.match(page, /addEventListener\("click",build\)/);
});

test("Studio host capabilities are an explicit route allowlist", () => {
  assert.match(page, /"open-research":"\/research\/"/);
  assert.match(page, /"open-workspace":"\/workspace\/"/);
  assert.match(page, /Object\.prototype\.hasOwnProperty\.call\(actions,action\)/);
  assert.doesNotMatch(page, /eval\s*\(|new\s+Function\s*\(/);
});

test("Studio exposes compilation errors as text, not injected markup", () => {
  assert.match(page, /status\.textContent=message/);
  assert.match(page, /role="status"/);
  assert.match(page, /aria-live="polite"/);
});
