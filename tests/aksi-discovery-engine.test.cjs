const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder } = require('node:util');

function createEngine(candidate) {
  const storage = new Map();
  const ctx = {
    crypto: webcrypto,
    TextEncoder,
    Date,
    Math,
    JSON,
    String,
    Number,
    Object,
    Array,
    Set,
    Promise,
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    dispatchEvent() {},
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value),
    },
    AKSI_LOCAL_ENGINE: {
      async generate() {
        return { ok: true, model: 'test-fixture', text: JSON.stringify({ answer: candidate.claim, candidates: [candidate] }) };
      },
    },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync('aksi-discovery-engine.js', 'utf8'), ctx);
  return ctx.AKSIDiscovery;
}

test('Unicode tokenization and relevant evidence permit a verifiable record', async () => {
  const engine = createEngine({
    claim: 'Нурлат расположен в Татарстане',
    evidence: [
      'Нурлат расположен в Татарстане',
      'Город Нурлат находится в Татарстане',
      'Нурлат — город Республики Татарстан',
    ],
    uncertainty: 0.1,
  });
  const record = await engine.run('Нурлат Татарстан', { context: 'Нурлат расположен в Татарстане' });
  assert.equal(record.knowledge_status, 'promoted');
  assert.equal(await engine.verify(record), true);
  const altered = { ...record, trace: [...record.trace, { stage: 'tampered' }] };
  assert.equal(await engine.verify(altered), false);
});

test('irrelevant evidence cannot promote a candidate', async () => {
  const engine = createEngine({
    claim: 'Нурлат расположен в Татарстане',
    evidence: [
      'Космический телескоп наблюдает галактики',
      'Планеты движутся вокруг звёзд',
      'Астрономы исследуют далёкие туманности',
    ],
    uncertainty: 0.05,
  });
  const record = await engine.run('Нурлат Татарстан', { context: 'Нурлат расположен в Татарстане' });
  assert.equal(record.knowledge_status, 'hypothesis');
  assert.equal(record.selected.relevant_evidence_count, 0);
  assert.equal(await engine.verify(record), true);
});

test('empty query is rejected', async () => {
  const engine = createEngine({ claim: 'x', evidence: [], uncertainty: 1 });
  await assert.rejects(() => engine.run('   '), /Empty input/);
});
