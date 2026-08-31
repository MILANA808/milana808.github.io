/**
 * AKSI SecureMem — IndexedDB + AES-GCM + lockout + TTL
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var DB_NAME = "aksi_secure_mem_v1", DB_VER = 1, STORE = "items", META = "meta";
  var MAX_ITEMS = 400, SALT_KEY = "aksi_mem_salt_v1", FLAG_KEY = "aksi_mem_enc_v1";
  var LOCK_KEY = "aksi_mem_lock_v1", MAX_FAILS = 5, LOCK_MS = 5 * 60 * 1000;
  var TTL_MS = 90 * 24 * 60 * 60 * 1000, MAX_BYTES_SOFT = 2 * 1024 * 1024;
  var _db = null, _key = null, _unlocked = false;

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
      req.onerror = function () { reject(req.error || new Error("IDB")); };
    });
  }
  function idbPut(store, val) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(val);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbGet(store, key) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var r = db.transaction(store, "readonly").objectStore(store).get(key);
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }
  function idbGetAll(store) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var r = db.transaction(store, "readonly").objectStore(store).getAll();
        r.onsuccess = function () { res(r.result || []); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }
  function idbClear(store) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).clear();
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function bufToB64(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function b64ToBuf(b64) {
    var s = atob(b64), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b.buffer;
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
  function getLockState() {
    try {
      var j = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
      return { fails: Number(j.fails) || 0, until: Number(j.until) || 0 };
    } catch (e) { return { fails: 0, until: 0 }; }
  }
  function setLockState(st) {
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(st || {})); } catch (e) {}
  }
  function clearLockState() { setLockState({ fails: 0, until: 0 }); }

  async function unlock(password) {
    await openDB();
    var st = getLockState();
    if (st.until && Date.now() < st.until) {
      throw new Error("Память заблокирована на " + Math.ceil((st.until - Date.now()) / 1000) + " с");
    }
    if (!password) {
      _key = null; _unlocked = true;
      await idbPut(META, { key: FLAG_KEY, value: "off" });
      clearLockState();
      return { encrypted: false };
    }
    try {
      _key = await deriveKey(password);
      _unlocked = true;
      await idbPut(META, { key: FLAG_KEY, value: "on" });
      clearLockState();
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
    } catch (e) {
      st = getLockState();
      st.fails = (st.fails || 0) + 1;
      var msg = "Неверный пароль (" + st.fails + "/" + MAX_FAILS + ")";
      if (st.fails >= MAX_FAILS) {
        st.until = Date.now() + LOCK_MS;
        st.fails = 0;
        msg = "Слишком много попыток. Блокировка 5 мин.";
      }
      setLockState(st);
      _key = null; _unlocked = false;
      throw new Error(msg);
    }
  }

  function pruneItems(items) {
    items = Array.isArray(items) ? items.slice() : [];
    var now = Date.now();
    items = items.filter(function (it) {
      var ts = (it && (it.ts || it.time)) || now;
      return (now - ts) < TTL_MS;
    });
    if (items.length > MAX_ITEMS) items = items.slice(-MAX_ITEMS);
    try {
      while (items.length > 20 && JSON.stringify(items).length > MAX_BYTES_SOFT) items.shift();
    } catch (e) {}
    return items;
  }

  async function saveMemory(items) {
    items = pruneItems(items);
    var list = Array.isArray(items) ? items.slice(-MAX_ITEMS) : [];
    await openDB();
    await idbClear(STORE);
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
      for (var i = 0; i < rows.length; i++) {
        out.push({ text: await decryptPayload(rows[i].payload), ts: rows[i].ts || Date.now(), id: rows[i].id });
      }
      return pruneItems(out);
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

  async function addFact(text) {
    var all = await loadMemory();
    all.push({ text: String(text || "").trim(), ts: Date.now() });
    await saveMemory(all);
    return all.length;
  }
  async function clearMemory() {
    await openDB();
    await idbClear(STORE);
    try { sessionStorage.setItem("aksi_mem_n", "0"); } catch (e) {}
  }
  async function needsPassword() {
    try {
      await openDB();
      var flag = await idbGet(META, FLAG_KEY);
      return !!(flag && flag.value === "on");
    } catch (e) { return false; }
  }

  G.AKSI_SECURE_MEM = {
    unlock: unlock,
    isUnlocked: function () { return _unlocked; },
    isEncryptedMode: function () { return !!_key; },
    isLocked: function () { var st = getLockState(); return !!(st.until && Date.now() < st.until); },
    lockRemainingMs: function () { var st = getLockState(); return Math.max(0, (st.until || 0) - Date.now()); },
    needsPassword: needsPassword,
    saveMemory: saveMemory,
    loadMemory: loadMemory,
    addFact: addFact,
    clearMemory: clearMemory,
    save: saveMemory,
    load: loadMemory
  };
})(typeof window !== "undefined" ? window : globalThis);
