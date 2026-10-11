const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync('aksi-crypto-provider.js', 'utf8');

function fakeIndexedDB() {
  const records = new Map();
  const names = new Set();
  const db = {
    objectStoreNames: { contains: (name) => names.has(name) },
    createObjectStore(name) { names.add(name); return {}; },
    transaction(_name, mode) {
      const tx = { mode, error: null };
      tx.objectStore = () => ({
        get(id) {
          const req = {};
          queueMicrotask(() => { req.result = records.get(id) || null; if (req.onsuccess) req.onsuccess(); });
          return req;
        },
        put(value) {
          queueMicrotask(() => { records.set(value.id, value); if (tx.oncomplete) tx.oncomplete(); });
          return {};
        }
      });
      return tx;
    }
  };
  return { open() {
    const req = {};
    queueMicrotask(() => {
      req.result = db;
      if (req.onupgradeneeded) req.onupgradeneeded();
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }};
}

function loadProvider(storage, indexedDB) {
  const sandbox = {
    crypto: webcrypto, indexedDB, TextEncoder, Promise, Date, Object, Array, String, Error,
    JSON, Math, setTimeout, clearTimeout,
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'aksi-crypto-provider.js' });
  return sandbox.AKSICryptoProvider;
}

test('stores a non-extractable private CryptoKey and removes plaintext legacy JWK', async () => {
  const oldPair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const oldPrivate = await webcrypto.subtle.exportKey('jwk', oldPair.privateKey);
  const oldPublic = await webcrypto.subtle.exportKey('jwk', oldPair.publicKey);
  const storage = new Map([['aksi:seal:ecdsa:v1', JSON.stringify({ priv: oldPrivate, pub: oldPublic })]]);
  const provider = loadProvider(storage, fakeIndexedDB());
  const pair = await provider.getKeyPair('aksi:seal:ecdsa:v1', {
    algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
    privateUsages: ['sign'],
    legacy: { storageKey: 'aksi:seal:ecdsa:v1', privateField: 'priv', publicField: 'pub' }
  });
  assert.equal(pair.privateKey.extractable, false);
  const legacy = JSON.parse(storage.get('aksi:seal:ecdsa:v1'));
  assert.equal(Object.hasOwn(legacy, 'priv'), false);
  assert.deepEqual(legacy.pub, pair.publicJwk);
  const payload = new TextEncoder().encode('AKSI key-storage contract');
  const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, payload);
  assert.equal(await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, signature, payload), true);
  const again = await provider.getKeyPair('aksi:seal:ecdsa:v1', {
    algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
    privateUsages: ['sign'],
    legacy: { storageKey: 'aksi:seal:ecdsa:v1', privateField: 'priv', publicField: 'pub' }
  });
  assert.equal(again.publicJwk.x, pair.publicJwk.x);
});

test('fails closed when IndexedDB is unavailable', async () => {
  const storage = new Map();
  const provider = loadProvider(storage, null);
  await assert.rejects(provider.getKeyPair('no-storage', {}), /IndexedDB unavailable/);
  assert.equal(storage.size, 0);
});

test('crypto consumers no longer write private JWKs to localStorage', () => {
  const files = ['aksi-seal.js', 'aksi-capsule.js', 'aksi-trust.js', 'permit/aksi-permit.js', 'mandate/aksi-mandate.js'];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /sharedKeyPair/, file + ' must use the shared provider');
    assert.doesNotMatch(text, /localStorage\.setItem\([^\n]*(?:privJwk|privateKey|privateKeyJwk|priv\s*:\s*privJ|privJwk)/i, file + ' must not persist private key material');
  }
  const seal = fs.readFileSync('aksi-seal.js', 'utf8');
  assert.doesNotMatch(seal, /PQ SEALED|Post-Quantum Hybrid/);
});
