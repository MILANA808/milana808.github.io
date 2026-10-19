const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadSelf() {
  const storage = new Map();
  const ctx = {
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value),
    },
    setTimeout() {},
    Date,
    Math,
    JSON,
    String,
    Number,
    Array,
    Object,
    RegExp,
    console,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync('aksi-self.js', 'utf8'), ctx);
  return { api: ctx.AKSI_SELF, storage };
}

test('built-in tools execute without dynamic JavaScript compilation', () => {
  const { api } = loadSelf();
  const written = api.writeTool('adder', 'сложи числа');
  assert.equal(written.ok, true);
  assert.equal(api.runTool('adder', [2, 5]).result, 7);
});

test('custom JavaScript bodies are rejected and legacy bodies do not execute', () => {
  const { api, storage } = loadSelf();
  const result = api.writeTool('custom', 'обычный инструмент', "globalThis.compromised = true; return 1;");
  assert.equal(result.ok, false);
  storage.set('aksi_self_tools_v1', JSON.stringify([
    { name: 'legacy', description: 'обычный инструмент', body: 'globalThis.compromised = true; return 1;' }
  ]));
  assert.equal(api.runTool('legacy', []).ok, false);
});

test('source no longer constructs functions from stored code', () => {
  const source = fs.readFileSync('aksi-self.js', 'utf8');
  assert.doesNotMatch(source, /new Function\(/);
});
