"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { parse, render, AksiUIError, limits } = require("../aksi-language/aksi-ui.js");

function fakeDocument() {
  function element(tag) {
    return {
      tag, children: [], listeners: {}, dataset: {}, textContent: "", type: "",
      appendChild(child) { this.children.push(child); return child; },
      addEventListener(name, fn) { this.listeners[name] = fn; }
    };
  }
  return { createElement: element };
}

test("AKSI Q UI parses a declarative page into a stable typed tree", () => {
  const ast = parse('page "home" { text "Welcome" section { text "Workspace" button "Start" action "start-work" } }');
  assert.equal(ast.type, "page");
  assert.equal(ast.name, "home");
  assert.equal(ast.children[0].value, "Welcome");
  assert.equal(ast.children[1].children[1].action, "start-work");
  assert.ok(Object.isFrozen(ast));
  assert.ok(Object.isFrozen(ast.children[1].children));
});

test("renderer uses textContent and routes only declared actions", () => {
  const ast = parse('page "home" { text "<img src=x>" button "Run" action "run-task" }');
  const doc = fakeDocument();
  const actions = [];
  const main = render(ast, doc, (name, context) => actions.push({ name, context }));
  assert.equal(main.tag, "main");
  assert.equal(main.dataset.aksiPage, "home");
  assert.equal(main.children[0].textContent, "<img src=x>");
  assert.equal(main.children[1].textContent, "Run");
  assert.equal(main.children[1].type, "button");
  main.children[1].listeners.click();
  assert.equal(actions[0].name, "run-task");
  assert.equal(actions[0].context.page, "home");
});

test("parser rejects unknown syntax, unterminated blocks and trailing tokens", () => {
  assert.throws(() => parse('page "x" { script "alert(1)" }'), AksiUIError);
  assert.throws(() => parse('page "x" { section { text "x" }'), /unterminated page/);
  assert.throws(() => parse('page "x" {} extra'), /unexpected token/);
});

test("parser enforces bounded nesting, node count and source length", () => {
  assert.equal(limits.depth, 12);
  assert.throws(() => parse("x".repeat(limits.source + 1)), /16384/);
  const nested = 'page "x" {' + "section {".repeat(13) + 'text "x"' + "}".repeat(13) + "}";
  assert.throws(() => parse(nested), /depth limit/);
});

test("renderer refuses unparsed objects and invalid capabilities", () => {
  assert.throws(() => render({}, fakeDocument()), /parsed page AST/);
  assert.throws(() => render(parse('page "x" {}'), fakeDocument(), "not a function"), /onAction/);
});
