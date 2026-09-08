/**
 * AKSI Vault v1 — IndexedDB memory encrypted with PiFractalCrypto
 * Local-first · Offline · Zero server · password never leaves browser
 * Depends: pi-crypto.js (PiFractalCrypto) — graceful degrade without it
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-vault";
  var DB_NAME = "aksi_vault_v1";
  var STORE = "entries";
  var META = "meta";
  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!G.indexedDB) {
        reject(new Error("IndexedDB недоступен"));
        return;
      }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("ts", "ts", { unique: false });
          os.createIndex("tag", "tag", { unique: false });
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: "k" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("IDB open failed")); };
    });
    return dbPromise;
  }

  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error("aborted")); };
    });
  }

  function getCrypto() {
    if (G.PiFractalCrypto) return new G.PiFractalCrypto();
    if (G.AKSI_PI_CRYPTO && G.AKSI_PI_CRYPTO.PiFractalCrypto) {
      return new G.AKSI_PI_CRYPTO.PiFractalCrypto();
    }
    return null;
  }

  function uid() {
    return "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  async function put(entry, password) {
    var text = entry && entry.text != null ? String(entry.text) : "";
    if (!text) throw new Error("empty entry");
    var rec = {
      id: entry.id || uid(),
      ts: Date.now(),
      tag: entry.tag || "mem",
      enc: false,
      body: text,
      algo: null
    };
    if (password) {
      var pi = getCrypto();
      if (!pi) throw new Error("pi-crypto.js не загружен");
      rec.body = await pi.encrypt({ t: text, tag: rec.tag }, String(password));
      rec.enc = true;
      rec.algo = "pi-aes-gcm-v1";
    }
    var db = await openDb();
    var tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(rec);
    await txDone(tx);
    return { id: rec.id, enc: rec.enc, ts: rec.ts, algo: rec.algo };
  }

  async function list(limit) {
    limit = limit || 50;
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).index("ts").openCursor(null, "prev");
      var out = [];
      req.onsuccess = function () {
        var c = req.result;
        if (!c || out.length >= limit) {
          resolve(out);
          return;
        }
        var v = c.value;
        out.push({
          id: v.id,
          ts: v.ts,
          tag: v.tag,
          enc: !!v.enc,
          algo: v.algo || null,
          preview: v.enc ? "[encrypted]" : String(v.body || "").slice(0, 80)
        });
        c.continue();
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function get(id, password) {
    var db = await openDb();
    var rec = await new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
    if (!rec) return null;
    if (!rec.enc) {
      return { id: rec.id, ts: rec.ts, tag: rec.tag, text: rec.body, enc: false };
    }
    if (!password) {
      return { id: rec.id, ts: rec.ts, tag: rec.tag, text: null, enc: true, needPassword: true };
    }
    var pi = getCrypto();
    if (!pi) throw new Error("pi-crypto.js не загружен");
    var plain = await pi.decrypt(rec.body, String(password), { asJson: true });
    var text = typeof plain === "object" && plain && plain.t != null ? plain.t : String(plain);
    return { id: rec.id, ts: rec.ts, tag: rec.tag || (plain && plain.tag), text: text, enc: true };
  }

  async function remove(id) {
    var db = await openDb();
    var tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
    return true;
  }

  async function clearAll() {
    var db = await openDb();
    var tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await txDone(tx);
    return true;
  }

  async function status() {
    var n = 0;
    try {
      var items = await list(500);
      n = items.length;
    } catch (e) {}
    return {
      version: VER,
      db: DB_NAME,
      entries: n,
      pi: !!getCrypto(),
      ciphersuite: !!(G.AKSI_CRYPTO && G.AKSI_CRYPTO.status),
      pq: !!(G.AKSI_PQ || (G.AKSI_CRYPTO && G.AKSI_CRYPTO.status && G.AKSI_CRYPTO.status().pq))
    };
  }

  async function learn(text, password) {
    text = String(text || "").replace(/^запомни\s*[:：]\s*/i, "").trim();
    if (!text) return { ok: false, error: "empty" };
    var r = await put({ text: text, tag: "learn" }, password || null);
    return { ok: true, source: "vault", id: r.id, enc: r.enc };
  }

  G.AKSI_VAULT = {
    version: VER,
    put: put,
    get: get,
    list: list,
    remove: remove,
    clearAll: clearAll,
    status: status,
    learn: learn,
    openDb: openDb
  };
})(typeof window !== "undefined" ? window : globalThis);
