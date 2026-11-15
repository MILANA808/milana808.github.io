"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { parse, render, AksiUIError, limits } = require("../aksi-language/aksi-ui.js");

function fakeDocument() {
  function element(tag) {
    return {
      tag, children: [], listeners: {}, dataset: {}, textContent: "", type: "",
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren(...children) { this.children = children; },
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

test("state declarations and bounded button effects update bound output nodes", () => {
  const ast = parse('page "counter" { state "count" = 0 value "count" button "Add" action "increment" state "count" add 1 }');
  const doc = fakeDocument();
  const actions = [];
  const main = render(ast, doc, (name, context) => actions.push({ name, context }));
  assert.equal(main.children[0].tag, "output");
  assert.equal(main.children[0].textContent, "0");
  main.children[1].listeners.click();
  assert.equal(main.children[0].textContent, "1");
  assert.equal(actions[0].name, "increment");
  assert.equal(actions[0].context.state.count, 1);
});

test("state updates are deterministic and support multiple bindings", () => {
  const ast = parse('page "counter" { state "n" = 4 value "n" section { value "n" button "Add two" action "add-two" state "n" add 2 } }');
  const main = render(ast, fakeDocument());
  const nested = main.children[1];
  nested.children[1].listeners.click();
  assert.equal(main.children[0].textContent, "6");
  assert.equal(nested.children[0].textContent, "6");
});

test("parser rejects unknown syntax, unterminated blocks and trailing tokens", () => {
  assert.throws(() => parse('page "x" { script "alert(1)" }'), AksiUIError);
  assert.throws(() => parse('page "x" { section { text "x" }'), /unterminated page/);
  assert.throws(() => parse('page "x" {} extra'), /unexpected token/);
});

test("parser validates state references, types, declaration order and uniqueness", () => {
  assert.throws(() => parse('page "x" { value "missing" }'), /undeclared state/);
  assert.throws(() => parse('page "x" { state "name" = "A" button "Add" action "add" state "name" add 1 }'), /requires numeric state/);
  assert.throws(() => parse('page "x" { text "before" state "late" = 1 }'), /must appear before UI nodes/);
  assert.throws(() => parse('page "x" { state "n" = 0 state "n" = 1 }'), /duplicate state/);
});

test("parser enforces bounded nesting, node count and source length", () => {
  assert.equal(limits.depth, 12);
  assert.equal(limits.states, 64);
  assert.throws(() => parse("x".repeat(limits.source + 1)), /16384/);
  const nested = 'page "x" {' + "section {".repeat(13) + 'text "x"' + "}".repeat(13) + "}";
  assert.throws(() => parse(nested), /depth limit/);
});

test("renderer refuses unparsed objects and invalid capabilities", () => {
  assert.throws(() => render({}, fakeDocument()), /parsed page AST/);
  assert.throws(() => render(parse('page "x" {}'), fakeDocument(), "not a function"), /onAction/);
});

test("typed when blocks render conditionally and react to local state changes", () => {
  const ast = parse('page "conditional" { state "visible" = 0 when "visible" equals 1 { text "Now visible" } button "Show" action "show" state "visible" add 1 }');
  const main = render(ast, fakeDocument());
  const conditional = main.children[0];
  const button = main.children[1];
  assert.equal(conditional.children.length, 0);
  button.listeners.click();
  assert.equal(conditional.children.length, 1);
  assert.equal(conditional.children[0].textContent, "Now visible");
});

test("when blocks validate state references and scalar types", () => {
  assert.throws(() => parse('page "x" { when "missing" equals true { text "x" } }'), /undeclared state/);
  assert.throws(() => parse('page "x" { state "enabled" = true when "enabled" equals 1 { text "x" } }'), /must match declared state type/);
  assert.throws(() => parse('page "x" { state "name" = "A" when "name" equals null { text "x" } }'), /must match declared state type/);
});

test("when blocks can contain nested sections and are frozen in the AST", () => {
  const ast = parse('page "x" { state "mode" = "ready" when "mode" equals "ready" { section { text "Ready" } } }');
  assert.equal(ast.children[0].type, "when");
  assert.ok(Object.isFrozen(ast.children[0]));
  assert.ok(Object.isFrozen(ast.children[0].children));
  assert.equal(ast.children[0].children[0].type, "section");
});
