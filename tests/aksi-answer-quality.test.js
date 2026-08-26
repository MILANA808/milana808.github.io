const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('aksi-answer-quality.js', 'utf8');
const store = new Map();
const context = {
  console,
  localStorage: {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value))
  },
  MutationObserver: class { observe() {} },
  document: {
    readyState: 'complete',
    body: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({
      style: {},
      setAttribute() {},
      appendChild() {}
    })
  }
};
context.window = context;
vm.runInNewContext(source, context, { filename: 'aksi-answer-quality.js' });

const quality = context.AKSIAnswerQuality;
assert.ok(quality, 'quality API should be exposed');
assert.strictEqual(quality.version, 'AQ-1.0');

const factual = quality.assess('АКСИ работает локально и сообщает, когда утверждение не подтверждено.');
assert.ok(factual.confidence >= 5 && factual.confidence <= 95);
assert.strictEqual(factual.status, 'unverified');

const cautious = quality.assess('Возможно, это верно, но я не могу подтвердить утверждение.');
assert.strictEqual(cautious.status, 'uncertain');

const absolute = quality.assess('Это точно и гарантированно верно на 100%.');
assert.strictEqual(absolute.status, 'needs-verification');

assert.ok(quality.overlap('локальная память АКСИ', 'АКСИ использует локальную память пользователя') > 0);
assert.strictEqual(quality.overlap('', 'любой текст'), 0);

console.log('AKSI answer-quality tests: OK');
