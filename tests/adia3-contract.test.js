/** ADIA 3.0 contract — run: node tests/adia3-contract.test.js */
global.window = global;
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); }
};
require('../aksi-algorithm.js');
const A = global.AKSI_ALGORITHM;
if (!A || A.version !== '3.0.0') throw new Error('ADIA 3.0 required');
const r = A.process(
  'hello',
  [{ text: 'AKSI offline answer with enough structure for scoring.', source: 'mind-l2' }],
  { seal: true }
);
if (!r.ok) throw new Error('process failed');
console.log('adia3-contract OK', r.best.metrics.EQS, r.best.metrics.AKSI);
