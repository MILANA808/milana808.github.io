/**
 * AKSI Secure Memory — IndexedDB + Web Crypto (AES-GCM)
 * Пароль → PBKDF2 (120k) → AES-256-GCM. Пустой пароль = plaintext.
 */
(function (G) {
  "use strict";
  var DB_NAME = "aksi_secure_mem_v1";
  var DB_VER = 1;
  var STORE = "items";
  var META = "meta";
  var MAX_ITEMS = 400;
  var SALT_KEY = "aksi_mem_salt_v1";
  var FLAG_KEY = "aksi_mem_enc_v1";
  var _db = null;
  var _key = null;
  var _unlocked = false;

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (_db) return resolve(_db);
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "key" });
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error || new Error("IndexedDB open failed")); };
    });
  }
  function idbPut(store, val) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(val);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbGet(store, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, "readonly");
        var r = tx.objectStore(store).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbGetAll(store) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, "readonly");
        var r = tx.objectStore(store).getAll();
        r.onsuccess = function () { resolve(r.result || []); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbClear(store) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function bufToB64(buf) {
    var bytes = new Uint8Array(buf), s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64ToBuf(b64) {
    var s = atob(b64), bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }
  async function getSalt() {
    var row = await idbGet(META, SALT_KEY);
    if (row && row.value) return new Uint8Array(b64ToBuf(row.value));
    var salt = crypto.getRandomValues(new Uint8Array(16));
    await idbPut(META, { key: SALT_KEY, value: bufToB64(salt.buffer) });
    return salt;
  }
  async function deriveKey(password) {
    var salt = await getSalt();
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(password || "")), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 120000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function encryptText(plain) {
    if (!_key) return { plain: String(plain || ""), enc: false };
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, _key, new TextEncoder().encode(String(plain || "")));
    return { enc: true, iv: bufToB64(iv.buffer), data: bufToB64(ct) };
  }
  async function decryptPayload(payload) {
    if (!payload) return "";
    if (!payload.enc) return String(payload.plain || payload.text || "");
    if (!_key) throw new Error("Память зашифрована — нужен пароль");
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(b64ToBuf(payload.iv)) }, _key, b64ToBuf(payload.data));
    return new TextDecoder().decode(pt);
  }
  async function unlock(password) {
    await openDB();
    if (!password) { _key = null; _unlocked = true; await idbPut(META, { key: FLAG_KEY, value: "off" }); return { encrypted: false }; }
    _key = await deriveKey(password); _unlocked = true; await idbPut(META, { key: FLAG_KEY, value: "on" });
    try {
      var all = await idbGetAll(STORE);
      for (var i = 0; i < all.length; i++) {
        var it = all[i];
        if (it && it.payload && !it.payload.enc && it.payload.plain != null) {
          it.payload = await encryptText(it.payload.plain);
          await idbPut(STORE, it);
        }
      }
    } catch (e) {}
    return { encrypted: true };
  }
  async function saveMemory(items) {
    var list = Array.isArray(items) ? items.slice(-MAX_ITEMS) : [];
    await openDB(); await idbClear(STORE);
    for (var i = 0; i < list.length; i++) {
      var text = typeof list[i] === "string" ? list[i] : (list[i].text || JSON.stringify(list[i]));
      var ts = typeof list[i] === "object" && list[i].ts ? list[i].ts : Date.now();
      await idbPut(STORE, { id: i + 1, ts: ts, payload: await encryptText(text) });
    }
    try { sessionStorage.setItem("aksi_mem_n", String(list.length)); } catch (e) {}
    return list.length;
  }
  async function loadMemory() {
    try {
      await openDB();
      var rows = await idbGetAll(STORE);
      rows.sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
      var out = [];
      for (var i = 0; i < rows.length; i++) out.push({ text: await decryptPayload(rows[i].payload), ts: rows[i].ts || Date.now(), id: rows[i].id });
      return out;
    } catch (e) {
      try {
        var a = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
        if (Array.isArray(a) && a.length) {
          await saveMemory(a.map(function (x) { return typeof x === "string" ? { text: x, ts: Date.now() } : x; }));
          try { localStorage.removeItem("aksi_whole_mem_v3"); } catch (e2) {}
          return loadMemory();
        }
      } catch (e3) {}
      return [];
    }
  }
  async function clearMemory() { await openDB(); await idbClear(STORE); try { sessionStorage.setItem("aksi_mem_n", "0"); } catch (e) {} }
  async function needsPassword() {
    try { await openDB(); var flag = await idbGet(META, FLAG_KEY); return !!(flag && flag.value === "on"); } catch (e) { return false; }
  }
  G.AKSI_SECURE_MEM = {
    unlock: unlock, isUnlocked: function () { return _unlocked; }, isEncryptedMode: function () { return !!_key; },
    needsPassword: needsPassword, saveMemory: saveMemory, loadMemory: loadMemory, clearMemory: clearMemory,
    save: saveMemory, load: loadMemory,
    addFact: async function (text) { var all = await loadMemory(); all.push({ text: String(text || "").trim(), ts: Date.now() }); await saveMemory(all); return all.length; }
  };
})(typeof window !== "undefined" ? window : globalThis);
