/* AKSI shared browser key provider v1.
 * Private CryptoKeys are non-extractable and stored only in IndexedDB.
 * No plaintext private JWK/PKCS#8 fallback is permitted.
 * Browser-held keys protect against casual storage theft, not same-origin XSS.
 */
(function (G) {
  'use strict';
  if (G.AKSICryptoProvider) return;
  var DB_NAME = 'aksi-crypto-v1';
  var STORE = 'keys';
  var dbPromise = null;
  var pending = Object.create(null);
  var cache = Object.create(null);

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!G.indexedDB) { reject(new Error('IndexedDB unavailable; refusing plaintext key fallback')); return; }
      var req = G.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Cannot open AKSI key database')); };
      req.onblocked = function () { reject(new Error('AKSI key database upgrade blocked')); };
    });
    return dbPromise;
  }
  async function getEntry(id) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readonly');
      var req = tx.objectStore(STORE).get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error || new Error('Cannot read AKSI key')); };
    });
  }
  async function putEntry(entry) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = function () { resolve(entry); };
      tx.onerror = function () { reject(tx.error || new Error('Cannot store AKSI key')); };
      tx.onabort = function () { reject(tx.error || new Error('AKSI key storage aborted')); };
    });
  }
  function cleanupLegacy(legacy, publicJwk) {
    if (!legacy) return;
    try {
      if (legacy.storageKey) {
        var raw = G.localStorage.getItem(legacy.storageKey);
        if (raw) {
          var obj = JSON.parse(raw);
          if (legacy.privateField) delete obj[legacy.privateField];
          if (legacy.publicField) obj[legacy.publicField] = publicJwk;
          if (legacy.kidField) obj[legacy.kidField] = null;
          if (Object.keys(obj).length) G.localStorage.setItem(legacy.storageKey, JSON.stringify(obj));
          else G.localStorage.removeItem(legacy.storageKey);
        }
      }
      if (legacy.privateStorageKey) G.localStorage.removeItem(legacy.privateStorageKey);
      if (legacy.publicStorageKey) G.localStorage.setItem(legacy.publicStorageKey, JSON.stringify(publicJwk));
      (legacy.removeKeys || []).forEach(function (key) { G.localStorage.removeItem(key); });
    } catch (e) {
      throw new Error('Cannot remove plaintext legacy key material: ' + String(e.message || e));
    }
  }
  function importPublic(publicJwk, algorithm) {
    return G.crypto.subtle.importKey('jwk', publicJwk, algorithm, true, ['verify']);
  }
  async function createPair(id, opts) {
    var algorithm = opts.algorithm || { name: 'ECDSA', namedCurve: 'P-256' };
    var usages = opts.privateUsages || ['sign'];
    // WebCrypto's pair-level extractability flag is shared. Export only transiently,
    // then immediately re-import the private key as non-extractable before persistence.
    var generated = await G.crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
    var publicJwk = await G.crypto.subtle.exportKey('jwk', generated.publicKey);
    var privateJwk = await G.crypto.subtle.exportKey('jwk', generated.privateKey);
    var privateKey = await G.crypto.subtle.importKey('jwk', privateJwk, algorithm, false, usages);
    privateJwk = null;
    var entry = {
      id: id, algorithm: algorithm, privateKey: privateKey,
      publicJwk: publicJwk, createdAt: new Date().toISOString(),
      storage: 'indexeddb-nonextractable-v1'
    };
    await putEntry(entry);
    cleanupLegacy(opts.legacy, publicJwk);
    return { privateKey: privateKey, publicKey: generated.publicKey, publicJwk: publicJwk, id: id, createdAt: entry.createdAt, extractable: privateKey.extractable };
  }
  async function getKeyPair(id, opts) {
    opts = opts || {};
    id = String(id || '').trim();
    if (!id || id.length > 160) throw new Error('Invalid AKSI key identifier');
    if (cache[id]) {
      cleanupLegacy(opts.legacy, cache[id].publicJwk);
      return cache[id];
    }
    if (pending[id]) return pending[id];
    pending[id] = (async function () {
      var entry = await getEntry(id);
      if (!entry) {
        var created = await createPair(id, opts);
        cache[id] = created;
        return created;
      }
      var pub = await importPublic(entry.publicJwk, entry.algorithm || opts.algorithm || { name: 'ECDSA', namedCurve: 'P-256' });
      var pair = { privateKey: entry.privateKey, publicKey: pub, publicJwk: entry.publicJwk, id: id, createdAt: entry.createdAt, extractable: !!entry.privateKey.extractable };
      if (pair.extractable) throw new Error('Stored AKSI private key is extractable; refusing to sign');
      cleanupLegacy(opts.legacy, pair.publicJwk);
      cache[id] = pair;
      return pair;
    })();
    try { return await pending[id]; } finally { delete pending[id]; }
  }
  async function sign(id, data, opts) {
    opts = opts || {};
    var pair = await getKeyPair(id, opts);
    var bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    var alg = opts.signAlgorithm || { name: 'ECDSA', hash: 'SHA-256' };
    var signature = await G.crypto.subtle.sign(alg, pair.privateKey, bytes);
    return { signature: signature, publicJwk: pair.publicJwk, algorithm: alg, keyId: id };
  }
  async function verify(data, signature, publicJwk, opts) {
    opts = opts || {};
    try {
      var algorithm = opts.algorithm || { name: 'ECDSA', namedCurve: 'P-256' };
      var key = await G.crypto.subtle.importKey('jwk', publicJwk, algorithm, true, ['verify']);
      var bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      return await G.crypto.subtle.verify(opts.signAlgorithm || { name: 'ECDSA', hash: 'SHA-256' }, key, signature, bytes);
    } catch (_) { return false; }
  }
  async function status() {
    var db = await openDb();
    return { ok: true, database: DB_NAME, storage: 'IndexedDB', cachedKeys: Object.keys(cache).length, nonExtractable: true, xssBoundary: 'same-origin script execution can still invoke signing' };
  }
  G.AKSICryptoProvider = { version: '1.0.0', getKeyPair: getKeyPair, sign: sign, verify: verify, status: status };
})(typeof window !== 'undefined' ? window : globalThis);
