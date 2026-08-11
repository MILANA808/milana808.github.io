/**
 * AKSI Memory — durable conversation store (IndexedDB)
 * "Infinite" within browser quota; auto-prunes only if quota exceeded.
 */
(function (g) {
  "use strict";
  var DB_NAME = "aksi_memory_db";
  var DB_VER = 1;
  var STORE = "messages";
  var META = "meta";

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!g.indexedDB) {
        reject(new Error("no indexedDB"));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          os.createIndex("ts", "ts", { unique: false });
          os.createIndex("role", "role", { unique: false });
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: "key" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
      tx.onabort = function () {
        reject(tx.error || new Error("abort"));
      };
    });
  }

  async function addMessage(role, content, extra) {
    var db = await openDB();
    var tx = db.transaction(STORE, "readwrite");
    var os = tx.objectStore(STORE);
    var row = {
      role: role,
      content: String(content || "").slice(0, 50000),
      ts: Date.now(),
      extra: extra || null,
    };
    os.add(row);
    await txDone(tx);
    db.close();
    return row;
  }

  async function getAll(limit) {
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var os = tx.objectStore(STORE);
      var req = os.getAll();
      req.onsuccess = function () {
        var rows = req.result || [];
        rows.sort(function (a, b) {
          return a.ts - b.ts;
        });
        if (limit && rows.length > limit) rows = rows.slice(-limit);
        db.close();
        resolve(rows);
      };
      req.onerror = function () {
        db.close();
        reject(req.error);
      };
    });
  }

  async function count() {
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).count();
      req.onsuccess = function () {
        db.close();
        resolve(req.result || 0);
      };
      req.onerror = function () {
        db.close();
        reject(req.error);
      };
    });
  }

  async function clear() {
    var db = await openDB();
    var tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await txDone(tx);
    db.close();
  }

  /** Context string for the model / brain */
  async function contextBlock(maxMsgs, maxChars) {
    maxMsgs = maxMsgs || 40;
    maxChars = maxChars || 12000;
    var rows = await getAll(maxMsgs);
    var lines = [];
    var total = 0;
    for (var i = rows.length - 1; i >= 0; i--) {
      var line = (rows[i].role === "user" ? "User: " : "AKSI: ") + rows[i].content;
      if (total + line.length > maxChars) break;
      lines.unshift(line);
      total += line.length;
    }
    return lines.join("\n");
  }

  /** Fallback localStorage bridge if IDB fails */
  var LS_KEY = "AKSI_MEM_FALLBACK";
  function lsAdd(role, content) {
    try {
      var arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      arr.push({ role: role, content: String(content).slice(0, 8000), ts: Date.now() });
      if (arr.length > 500) arr = arr.slice(-500);
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch (e) {}
  }
  function lsAll(limit) {
    try {
      var arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (limit) arr = arr.slice(-limit);
      return arr;
    } catch (e) {
      return [];
    }
  }

  async function remember(role, content, extra) {
    try {
      return await addMessage(role, content, extra);
    } catch (e) {
      lsAdd(role, content);
      return { role: role, content: content, ts: Date.now() };
    }
  }

  async function history(limit) {
    try {
      return await getAll(limit || 200);
    } catch (e) {
      return lsAll(limit || 200);
    }
  }

  g.AksiMemory = {
    remember: remember,
    history: history,
    count: async function () {
      try {
        return await count();
      } catch (e) {
        return lsAll().length;
      }
    },
    clear: async function () {
      try {
        await clear();
      } catch (e) {}
      try {
        localStorage.removeItem(LS_KEY);
      } catch (e2) {}
    },
    contextBlock: async function (m, c) {
      try {
        return await contextBlock(m, c);
      } catch (e) {
        return lsAll(40)
          .map(function (r) {
            return (r.role === "user" ? "User: " : "AKSI: ") + r.content;
          })
          .join("\n");
      }
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
