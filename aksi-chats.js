/**
 * AKSI Multi-Chat — диалоги в IndexedDB (rename / archive / delete)
 */
(function (G) {
  "use strict";
  var DB_NAME = "aksi_chats_v1", DB_VER = 1, STORE = "chats", MSG = "messages", _db = null, activeId = null;
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (_db) return resolve(_db);
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) { var s = db.createObjectStore(STORE, { keyPath: "id" }); s.createIndex("updated", "updated", { unique: false }); }
        if (!db.objectStoreNames.contains(MSG)) { var m = db.createObjectStore(MSG, { keyPath: "id", autoIncrement: true }); m.createIndex("chatId", "chatId", { unique: false }); }
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function txDone(tx) { return new Promise(function (resolve, reject) { tx.oncomplete = function () { resolve(); }; tx.onerror = function () { reject(tx.error); }; }); }
  function uid() { return "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }
  async function listChats(includeArchived) {
    await openDB();
    return new Promise(function (resolve, reject) {
      var tx = _db.transaction(STORE, "readonly"); var r = tx.objectStore(STORE).getAll();
      r.onsuccess = function () { var all = (r.result || []).filter(function (c) { return includeArchived ? true : !c.archived; }); all.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }); resolve(all); };
      r.onerror = function () { reject(r.error); };
    });
  }
  async function createChat(title) {
    await openDB();
    var chat = { id: uid(), title: title || ("Диалог " + new Date().toLocaleString("ru-RU")), created: Date.now(), updated: Date.now(), archived: false, mem: [] };
    var tx = _db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(chat); await txDone(tx); activeId = chat.id; return chat;
  }
  async function getChat(id) {
    await openDB();
    return new Promise(function (resolve, reject) { var tx = _db.transaction(STORE, "readonly"); var r = tx.objectStore(STORE).get(id); r.onsuccess = function () { resolve(r.result || null); }; r.onerror = function () { reject(r.error); }; });
  }
  async function renameChat(id, title) {
    var c = await getChat(id); if (!c) return null; c.title = String(title || c.title).slice(0, 80); c.updated = Date.now();
    var tx = _db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(c); await txDone(tx); return c;
  }
  async function archiveChat(id, archived) {
    var c = await getChat(id); if (!c) return null; c.archived = !!archived; c.updated = Date.now();
    var tx = _db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(c); await txDone(tx); return c;
  }
  async function deleteChat(id) {
    await openDB(); var tx = _db.transaction([STORE, MSG], "readwrite"); tx.objectStore(STORE).delete(id);
    var idx = tx.objectStore(MSG).index("chatId"); var req = idx.openCursor(IDBKeyRange.only(id));
    req.onsuccess = function (e) { var cursor = e.target.result; if (cursor) { cursor.delete(); cursor.continue(); } }; await txDone(tx); if (activeId === id) activeId = null;
  }
  async function addMessage(chatId, role, text, meta) {
    await openDB(); var msg = { chatId: chatId, role: role, text: String(text || ""), meta: meta || "", ts: Date.now() };
    var tx = _db.transaction([MSG, STORE], "readwrite"); tx.objectStore(MSG).add(msg);
    var g = tx.objectStore(STORE).get(chatId); g.onsuccess = function () { var c = g.result; if (c) { c.updated = Date.now(); tx.objectStore(STORE).put(c); } }; await txDone(tx); return msg;
  }
  async function getMessages(chatId, limit) {
    await openDB(); limit = limit || 200;
    return new Promise(function (resolve, reject) {
      var tx = _db.transaction(MSG, "readonly"); var idx = tx.objectStore(MSG).index("chatId"); var r = idx.getAll(IDBKeyRange.only(chatId));
      r.onsuccess = function () { var rows = r.result || []; rows.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); resolve(rows.slice(-limit)); };
      r.onerror = function () { reject(r.error); };
    });
  }
  async function setChatMemory(chatId, facts) {
    var c = await getChat(chatId); if (!c) return; c.mem = (facts || []).slice(-200); c.updated = Date.now();
    var tx = _db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(c); await txDone(tx);
  }
  async function getChatMemory(chatId) { var c = await getChat(chatId); return (c && c.mem) || []; }
  async function ensureActive() {
    if (activeId) { var c = await getChat(activeId); if (c && !c.archived) return c; }
    var list = await listChats(false); if (list.length) { activeId = list[0].id; return list[0]; }
    return createChat("Основной");
  }
  G.AKSI_CHATS = { list: listChats, create: createChat, get: getChat, rename: renameChat, archive: archiveChat, remove: deleteChat, addMessage: addMessage, getMessages: getMessages, setMemory: setChatMemory, getMemory: getChatMemory, ensureActive: ensureActive, getActiveId: function () { return activeId; }, setActiveId: function (id) { activeId = id; } };
})(typeof window !== "undefined" ? window : globalThis);
