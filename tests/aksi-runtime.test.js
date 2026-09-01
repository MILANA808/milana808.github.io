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
  performance: { now: () => 0 },
  crypto: webcrypto
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'aksi-runtime.js' });

(async () => {
  assert.ok(context.AKSI_RUNTIME);
  assert.strictEqual(context.AKSI_RUNTIME.version, '1.3.0');

  const degraded = await context.AKSI_RUNTIME.selfTest();
  assert.strictEqual(degraded.ok, false);
  assert.strictEqual(degraded.sha256, true);
  assert.strictEqual(degraded.status.integrity.crypto, true);

  context.AKSI_CORE = { query: async () => ({ text: 'local core result', source: 'core', offline: true }) };
  const ready = await context.AKSI_RUNTIME.selfTest();
  assert.strictEqual(ready.ok, true);

  const answer = context.AKSI_RUNTIME.answer('q', 'a', {
    source: 'core', kind: 'computed', confidence: 1.4, citations: ['x', 'y']
  });
  assert.strictEqual(answer.schema, 'AKSI-ANSWER-1');
  assert.strictEqual(answer.confidence, 1);
  assert.deepStrictEqual(answer.citations, ['x', 'y']);

  const value = { b: 2, a: 'AKSI', ignored: undefined };
  const reordered = { a: 'AKSI', b: 2 };
  assert.strictEqual(context.AKSI_RUNTIME.canonical(value), context.AKSI_RUNTIME.canonical(reordered));
  assert.strictEqual(
    await context.AKSI_RUNTIME.sha256(value),
    await context.AKSI_RUNTIME.sha256(reordered)
  );

  context.AKSI_METRICS = {
    measure: ({ input, output }) => ({
      version: '1.1.0', inputs: String(input).length, outputs: String(output).length
    })
  };
  const result = await context.AKSI_RUNTIME.execute('test query', { useMemory: false });
  assert.strictEqual(result.schema, 'AKSI-ANSWER-1');
  assert.strictEqual(result.source, 'core');
  assert.ok(result.integrityHash);
  assert.strictEqual(result.integrityHash.length, 64);
  assert.ok(Array.isArray(result.trace));
  assert.ok(result.trace.some(e => e.type === 'route.core'));
  assert.ok(result.trace.some(e => e.type === 'verification.complete'));

  console.log('AKSI runtime contract tests: OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});