const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');

const storage = new Map();
const sandbox = {
  crypto: webcrypto,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  Math,
  Date,
  JSON,
  Map,
  Array,
  Object,
  String,
  Number,
  Promise,
  Error,
  console,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  window: { dispatchEvent() {} },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  }
};

const source = fs.readFileSync('aksi-core-v3.js', 'utf8');
vm.runInNewContext(source, sandbox, { filename: 'aksi-core-v3.js' });
const core = sandbox.window.AKSICoreV3;
assert.ok(core, 'Core v3 must expose AKSICoreV3');

(async () => {
  const candidates = [
    { text: 'A', evidence: .9, coherence: .9, agreement: .9, freshness: .9, provenance: .9, type: 'inference' },
    { text: 'B', evidence: .4, coherence: .5, agreement: .4, freshness: .5, provenance: .3, type: 'uncertain' },
    { text: 'C', evidence: .7, coherence: .6, agreement: .7, freshness: .8, provenance: .7, type: 'inference' }
  ];
  const options = { mode: 'deterministic', lambda: .35, counterfactual: .15, remember: false };
  const a = await core.run('reproducibility', candidates, options);
  const b = await core.run('reproducibility', candidates, options);

  assert.deepEqual(JSON.parse(JSON.stringify(a.result)), JSON.parse(JSON.stringify(b.result)), 'deterministic replay failed');
  assert.ok(Math.abs(a.calibration.quantum.reduce((x, y) => x + y, 0) - 1) < 1e-10, 'quantum-like probabilities must normalize');
  assert.ok(Math.abs(a.calibration.classical.reduce((x, y) => x + y, 0) - 1) < 1e-10, 'classical probabilities must normalize');
  assert.match(a.receipt.payload_hash, /^[0-9a-f]{64}$/, 'payload hash must be SHA-256 hex');
  assert.match(a.receipt.receipt_hash, /^[0-9a-f]{64}$/, 'receipt hash must be SHA-256 hex');

  const ambiguous = core.shouldAbstain({ quantum: [.5, .5], classical: [.5, .5] });
  assert.equal(ambiguous.abstain, true, 'ambiguous candidates should trigger abstention');

  let emptyRejected = false;
  try { await core.run('empty', [], { remember: false }); } catch { emptyRejected = true; }
  assert.equal(emptyRejected, true, 'empty candidate set must be rejected');

  console.log('AKSI Core v3 Node smoke tests: PASS');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
