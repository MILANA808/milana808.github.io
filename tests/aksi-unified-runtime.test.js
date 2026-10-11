const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('aksi-unified-runtime.js', 'utf8');
function makeRuntime(fetchImpl, saved = {}) {
  const storage = new Map(Object.entries(saved));
  const sandbox = {
    URL, URLSearchParams, AbortController, Promise, Date, Math, JSON, Object, Array, String, Error,
    setTimeout, clearTimeout, encodeURIComponent,
    location: { search: '', href: 'https://milana808.github.io/' },
    navigator: { onLine: true },
    localStorage: {
      getItem(k) { return storage.has(k) ? storage.get(k) : null; },
      setItem(k, v) { storage.set(k, String(v)); },
      removeItem(k) { storage.delete(k); }
    },
    fetch: fetchImpl,
    console
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'aksi-unified-runtime.js' });
  return { api: sandbox.AKSI_UNIFIED, storage, sandbox };
}
function response(status, value) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(value) };
}

test('uses the canonical Render backend first and rejects unsafe API URLs', () => {
  const { api } = makeRuntime(async () => response(200, {}));
  assert.equal(api.base(), 'https://aksi-backend.onrender.com');
  assert.throws(() => api.setBase('javascript:alert(1)'), /http\(s\)/);
  assert.throws(() => api.setBase('https://user:' + 'pass' + String.fromCharCode(64) + 'example.com'), /credentials/);
});

test('GET can fail over to the secondary backend after a failed request', async () => {
  const calls = [];
  const { api } = makeRuntime(async (url) => {
    calls.push(url);
    if (url.startsWith('https://aksi-backend.onrender.com')) return response(503, { detail: 'down' });
    return response(200, { status: 'healthy' });
  });
  const data = await api.request('/health');
  assert.equal(data.status, 'healthy');
  assert.equal(calls.length, 2);
  assert.equal(api.base(), 'https://milana-backend.replit.app');
});

test('mutating POST is never replayed on a second host', async () => {
  let calls = 0;
  const { api } = makeRuntime(async () => {
    calls++;
    throw new Error('ambiguous network failure');
  });
  await assert.rejects(api.request('/api/agent/tasks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  }), /ambiguous network failure/);
  assert.equal(calls, 1);
});

test('task path validation blocks absolute and protocol-relative URLs', async () => {
  const { api } = makeRuntime(async () => response(200, {}));
  await assert.rejects(api.request('https://attacker.example/collect'), /absolute path on the configured host/);
  await assert.rejects(api.request('//attacker.example/collect'), /absolute path on the configured host/);
});

test('health diagnostics do not mix two backend instances when readiness fails', async () => {
  const calls = [];
  const { api } = makeRuntime(async (url) => {
    calls.push(url);
    if (url.endsWith('/health')) return response(200, { status: 'healthy' });
    if (url.endsWith('/ready')) return response(503, { status: 'not_ready', ready: false });
    if (url.endsWith('/api/core/runtime')) return response(200, { ok: true });
    return response(404, {});
  });
  const result = await api.health();
  assert.equal(result.alive, true);
  assert.equal(result.ready, false);
  assert.equal(result.runtimeAvailable, true);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((url) => url.startsWith('https://aksi-backend.onrender.com')));
});
