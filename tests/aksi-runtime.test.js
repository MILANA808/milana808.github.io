const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const source = fs.readFileSync('aksi-runtime.js', 'utf8');
const context = {
  console,
  Date,
  Math,
  TextEncoder,
  Uint8Array,
  ArrayBuffer,
  crypto: webcrypto,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary')
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'aksi-runtime.js' });

(async () => {
  assert.ok(context.AKSI_RUNTIME);
  assert.strictEqual(context.AKSI_RUNTIME.version, '1.1.0');

  const degraded = await context.AKSI_RUNTIME.selfTest();
  assert.strictEqual(degraded.ok, false);
  assert.strictEqual(degraded.integrity.crypto, true);
  assert.strictEqual(degraded.integrity.signature, true);

  context.AKSI_CORE = { query() {} };
  const ready = await context.AKSI_RUNTIME.selfTest();
  assert.strictEqual(ready.ok, true);
  assert.strictEqual(ready.integrity.signature, true);

  const answer = context.AKSI_RUNTIME.answer('q', 'a', {
    source: 'core', kind: 'computed', confidence: 1.4, citations: ['x', 'y']
  });
  assert.strictEqual(answer.schema, 'AKSI-ANSWER-1');
  assert.strictEqual(answer.confidence, 1);
  assert.deepStrictEqual(answer.citations, ['x', 'y']);

  const integrity = context.AKSI_RUNTIME.integrity;
  const value = { b: 2, a: 'АКСИ' };
  const reordered = { a: 'АКСИ', b: 2 };
  assert.strictEqual(await integrity.sha256(integrity.canonical(value)), await integrity.sha256(integrity.canonical(reordered)));

  const proof = await integrity.sign(value);
  assert.strictEqual(proof.algorithm, 'Ed25519');
  assert.strictEqual(await integrity.verify(value, proof), true);
  assert.strictEqual(await integrity.verify({ a: 'АКСИ', b: 3 }, proof), false);

  const e1 = await integrity.createLedgerEvent('test', { value: 1 }, 'GENESIS');
  const e2 = await integrity.createLedgerEvent('test', { value: 2 }, e1.hash);
  let result = await integrity.verifyLedger([e1, e2]);
  assert.strictEqual(result.ok, true);

  const tampered = JSON.parse(JSON.stringify([e1, e2]));
  tampered[0].payload.value = 999;
  result = await integrity.verifyLedger(tampered);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'hash-mismatch');

  const brokenLink = JSON.parse(JSON.stringify([e1, e2]));
  brokenLink[1].previousHash = 'BROKEN';
  result = await integrity.verifyLedger(brokenLink);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'previous-hash-mismatch');

  console.log('AKSI runtime contract + cryptographic integrity tests: OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
