"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse, render } = require("../aksi-language/aksi-ui.js");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "aksi-q-studio", "index.html"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("AKSI Q Studio is a real static route linked from the homepage", () => {
  assert.match(page, /<html lang="ru">/);
  assert.match(page, /<script src="\.\.\/aksi-language\/aksi-ui\\.js\\?v=0\\.4\\.0"><\/script>/);
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

test("the actual embedded Studio program parses and renders with working local state", () => {
  const match = page.match(/<textarea id="source"[^>]*>([\s\S]*?)<\/textarea>/);
  assert.ok(match, "Studio source textarea exists");
  const ast = parse(match[1]);
  assert.equal(ast.name, "studio-demo");
  const doc = {
    createElement(tag) {
      return {
        tag, children: [], listeners: {}, dataset: {}, textContent: "", type: "",
        appendChild(child) { this.children.push(child); return child; },
        replaceChildren(...children) { this.children = children; },
        addEventListener(name, fn) { this.listeners[name] = fn; }
      };
    }
  };
  const root = render(ast, doc);
  const card = root.children[0];
  const value = card.children.find(node => node.tag === "output" && node.textContent === "0");
  const visitorInput = card.children.find(node => node.tag === "input");
  const increment = card.children.find(node => node.tag === "button" && node.textContent === "Добавить");
  assert.equal(value.textContent, "0");
  assert.ok(visitorInput, "text input is rendered");
  visitorInput.listeners.input({ target: { value: "Тест" } });
  assert.equal(card.children.find(node => node.tag === "output" && node.textContent === "Тест").textContent, "Тест");
  increment.listeners.click();
  assert.equal(value.textContent, "1");

  const details = root.children[1];
  const reveal = details.children.find(node => node.tag === "button" && node.textContent === "Показать детали языка");
  const conditional = details.children.find(node => node.tag === "section" && node.children.length === 0);
  assert.ok(reveal, "conditional demo action exists");
  assert.ok(conditional, "conditional content starts hidden");
  reveal.listeners.click();
  assert.equal(conditional.children.length, 2);
  assert.equal(conditional.children[0].textContent, "Условные блоки появляются после изменения состояния.");
});
