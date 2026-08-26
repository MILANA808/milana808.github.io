/**
 * AKSI P2P Chat v2.0
 * Human-to-human WebRTC chat over PeerJS.
 * Stable reconnect, heartbeat, visible chat, bounded message history.
 * The existing AKSI Core is not modified.
 */
(function (global) {
  "use strict";

  var VER = "2.0.0-p2p-chat";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var peer = null;
  var conn = null;
  var role = null;
  var roomId = null;
  var peerId = null;
  var reconnectTimer = null;
  var heartbeatTimer = null;
  var lastPong = 0;
  var retry = 0;
  var destroyed = false;
  var autoReply = false;
  var logEl = null;
  var statusEl = null;
  var history = [];
  var MAX_HISTORY = 200;
  var MAX_TEXT = 4000;

  function $(id) { return document.getElementById(id); }
  function now() { return Date.now(); }
  function text(v) { return String(v == null ? "" : v).trim(); }

  function logLine(v) {
    logEl = logEl || $("p2pLog");
    if (!logEl) return;
    var line = "[" + new Date().toLocaleTimeString("ru-RU") + "] " + text(v);
    logEl.textContent = (line + "\n" + (logEl.textContent || "")).slice(0, 5000);
  }

  function setStatus(v) {
    statusEl = statusEl || $("p2pStatus");
    if (statusEl) statusEl.textContent = text(v);
    var badge = $("p2pLinkBadge");
    if (badge) {
      var online = !!(conn && conn.open);
      badge.textContent = online ? "● connected" : (role ? "○ reconnecting" : "offline");
      badge.style.color = online ? "#34d399" : (role ? "#fbbf24" : "#7a738f");
    }
  }

  function renderMessage(message, mine, meta) {
    var thread = $("p2pThread") || $("thread");
    if (!thread) return;
    var row = document.createElement("div");
    row.className = "msg " + (mine ? "me" : "ai");
    var bubble = document.createElement("div");
    bubble.className = "bub";
    bubble.textContent = text(message);
    var stamp = document.createElement("div");
    stamp.className = "meta";
    stamp.textContent = meta || (mine ? "вы" : "собеседник");
    bubble.appendChild(stamp);
    row.appendChild(bubble);
    thread.appendChild(row);
    while (thread.children.length > 200) thread.removeChild(thread.firstChild);
    thread.scrollTop = thread.scrollHeight;
  }

  function addMessage(message, mine, meta, id) {
    var item = { id: id || ("m-" + now() + "-" + Math.random().toString(36).slice(2, 7)), text: text(message), mine: !!mine, ts: now(), meta: meta || "" };
    if (!item.text) return;
    history.push(item);
    if (history.length > MAX_HISTORY) history.shift();
    renderMessage(item.text, item.mine, item.meta);
  }

  function saveHistory() {
    try { localStorage.setItem("aksi:p2p:history", JSON.stringify(history.slice(-MAX_HISTORY))); } catch (_) {}
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem("aksi:p2p:history");
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return;
      history = arr.slice(-MAX_HISTORY);
      var thread = $("p2pThread");
      if (thread) {
        thread.innerHTML = "";
        history.forEach(function (m) { renderMessage(m.text, m.mine, m.meta || (m.mine ? "вы" : "собеседник")); });
      }
    } catch (_) {}
  }

  function loadPeerJS() {
    return new Promise(function (resolve, reject) {
      if (global.Peer) return resolve(global.Peer);
      var s = document.createElement("script");
      s.src = PEERJS_CDN;
      s.async = true;
      s.onload = function () { global.Peer ? resolve(global.Peer) : reject(new Error("PeerJS unavailable")); };
      s.onerror = function () { reject(new Error("PeerJS CDN unavailable")); };
      document.head.appendChild(s);
    });
  }

  function send(obj) {
    if (!conn || !conn.open) return false;
    try { conn.send(obj); return true; } catch (e) { logLine("send: " + e.message); return false; }
  }

  function handle(data) {
    var msg = data;
    if (typeof data === "string") {
      try { msg = JSON.parse(data); } catch (_) { msg = { type: "chat", text: data }; }
    }
    if (!msg || !msg.type) return;

    if (msg.type === "hello") {
      send({ type: "hello", name: "AKSI user", ts: now() });
      return;
    }
    if (msg.type === "ping") { send({ type: "pong", t: msg.t }); return; }
    if (msg.type === "pong") { lastPong = now(); updateConnectionState(); return; }

    if (msg.type === "chat" || msg.type === "message") {
      var incoming = text(msg.text).slice(0, MAX_TEXT);
      if (!incoming) return;
      addMessage(incoming, false, "собеседник · " + new Date().toLocaleTimeString("ru-RU"), msg.id);
      saveHistory();
      if (autoReply && global.AKSI_CORE && typeof global.AKSI_CORE.query === "function") {
        Promise.resolve(global.AKSI_CORE.query(incoming)).then(function (r) {
          var answer = r && r.text ? text(r.text) : "";
          if (answer) sendChat(answer, true);
        }).catch(function () {});
      }
      return;
    }
    if (msg.type === "reply") {
      var reply = text(msg.text).slice(0, MAX_TEXT);
      if (reply) { addMessage(reply, false, "АКСИ · ответ", msg.id); saveHistory(); }
    }
  }

  function updateConnectionState() {
    if (conn && conn.open) {
      var ping = lastPong ? Math.max(0, now() - lastPong) : null;
      setStatus("Соединено · WebRTC/DTLS · " + (ping == null ? "проверка…" : "heartbeat " + ping + " ms") + " · " + role);
      var p = $("p2pPing");
      if (p) p.textContent = ping == null ? "…" : ping + " ms";
      return;
    }
    setStatus(role ? "Соединение восстанавливается…" : "P2P offline");
  }

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    lastPong = now();
    heartbeatTimer = setInterval(function () {
      if (!conn || !conn.open) return;
      send({ type: "ping", t: now() });
      if (now() - lastPong > 15000) {
        logLine("heartbeat timeout; reconnecting");
        try { conn.close(); } catch (_) {}
      }
    }, 5000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function scheduleReconnect() {
    if (destroyed || !role || reconnectTimer) return;
    var delay = Math.min(10000, 800 * Math.pow(1.6, Math.min(retry, 6)));
    retry++;
    setStatus("Соединение восстанавливается через " + Math.ceil(delay / 1000) + " с…");
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      if (destroyed) return;
      if (role === "guest" && roomId) connectGuest(roomId).catch(function () { scheduleReconnect(); });
      else if (role === "host") updateConnectionState();
    }, delay);
  }

  function wire(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (_) {} }
    conn = c;
    c.on("open", function () {
      retry = 0;
      lastPong = now();
      setStatus("Соединено · WebRTC/DTLS · " + role);
      startHeartbeat();
      send({ type: "hello", ts: now() });
      logLine("connected");
    });
    c.on("data", handle);
    c.on("close", function () {
      if (conn === c) conn = null;
      stopHeartbeat();
      logLine("connection closed");
      scheduleReconnect();
    });
    c.on("error", function (e) {
      logLine("connection error: " + (e && e.message || e));
      if (!c.open) scheduleReconnect();
    });
  }

  function destroyPeer() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    stopHeartbeat();
    if (conn) { try { conn.close(); } catch (_) {} }
    if (peer) { try { peer.destroy(); } catch (_) {} }
    conn = null;
    peer = null;
  }

  function createRoom() {
    destroyed = false;
    role = "host";
    retry = 0;
    setStatus("Создаём комнату…");
    return loadPeerJS().then(function (Peer) {
      destroyPeer();
      destroyed = false;
      role = "host";
      var requested = "aksi-" + Math.random().toString(36).slice(2, 10);
      return new Promise(function (resolve, reject) {
        peer = new Peer(requested, { debug: 0 });
        peer.on("open", function (id) {
          roomId = id; peerId = id;
          $("p2pRoomId") && ($("p2pRoomId").textContent = id);
          setStatus("Зал создан · ждём собеседника · " + id);
          logLine("room " + id);
          resolve(id);
        });
        peer.on("connection", function (c) {
          wire(c);
        });
        peer.on("disconnected", function () {
          logLine("signaling disconnected; reconnecting");
          try { peer.reconnect(); } catch (_) {}
        });
        peer.on("close", function () { if (!destroyed) scheduleReconnect(); });
        peer.on("error", function (e) {
          logLine("peer error: " + (e && (e.type || e.message) || e));
          if (!peerId) reject(e);
          else scheduleReconnect();
        });
      });
    });
  }

  function connectGuest(id) {
    id = text(id);
    if (!id) return Promise.reject(new Error("Room ID is empty"));
    destroyed = false;
    role = "guest";
    roomId = id;
    setStatus("Подключаемся к " + id + "…");
    return loadPeerJS().then(function (Peer) {
      destroyPeer();
      destroyed = false;
      role = "guest";
      return new Promise(function (resolve, reject) {
        peer = new Peer(undefined, { debug: 0 });
        peer.on("open", function () {
          peerId = peer.id;
          var c = peer.connect(id, { reliable: true, serialization: "json" });
          wire(c);
          c.on("open", function () { retry = 0; resolve(id); });
        });
        peer.on("disconnected", function () {
          logLine("signaling disconnected; reconnecting");
          try { peer.reconnect(); } catch (_) {}
        });
        peer.on("close", function () { if (!destroyed) scheduleReconnect(); });
        peer.on("error", function (e) {
          logLine("peer error: " + (e && (e.type || e.message) || e));
          if (!conn || !conn.open) { reject(e); scheduleReconnect(); }
        });
      });
    });
  }

  function sendChat(value, alreadyRendered) {
    var message = text(value).slice(0, MAX_TEXT);
    if (!message) return false;
    if (!conn || !conn.open) { setStatus("Нет соединения — сообщение не отправлено"); return false; }
    var id = "m-" + now() + "-" + Math.random().toString(36).slice(2, 7);
    if (!alreadyRendered) addMessage(message, true, "вы · " + new Date().toLocaleTimeString("ru-RU"), id);
    if (!send({ type: "chat", id: id, text: message, ts: now() })) return false;
    saveHistory();
    return true;
  }

  function copyRoom() {
    var id = roomId || "";
    if (!id) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).catch(function () {});
    logLine("room ID copied");
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card">' +
      '<h2>💬 P2P-чат <span id="p2pLinkBadge" style="font-size:11px;margin-left:8px;color:#7a738f">offline</span></h2>' +
      '<p class="muted">Чат двух людей напрямую через WebRTC. Сигнализация используется только для установления соединения; сообщения идут по data channel.</p>' +
      '<div id="p2pStatus" class="muted" style="margin:12px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.28)">P2P offline</div>' +
      '<div class="card" style="padding:10px;margin:0 0 10px;background:rgba(0,0,0,.18)"><div id="p2pThread" style="display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto"></div></div>' +
      '<div style="display:flex;gap:8px"><input id="p2pMessage" placeholder="Сообщение собеседнику…" autocomplete="off" maxlength="4000"><button type="button" class="btn p" id="p2pSend">➤</button></div>' +
      '<div class="row"><button type="button" class="btn p" id="p2pCreate">Создать чат</button><button type="button" class="btn" id="p2pCopy">Копировать ID</button><button type="button" class="btn" id="p2pJoin">Войти</button><button type="button" class="btn" id="p2pDisc">Отключить</button></div>' +
      '<input id="p2pJoinId" placeholder="ID чата собеседника" autocomplete="off" style="margin-top:10px">' +
      '<label class="muted" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="p2pAuto"> Автоответ АКСИ</label>' +
      '<pre id="p2pLog" class="out" style="max-height:120px;font-size:11px">лог…</pre>' +
      '</div>';

    logEl = $("p2pLog"); statusEl = $("p2pStatus");
    loadHistory();

    $("p2pCreate").onclick = function () { createRoom().then(copyRoom).catch(function (e) { setStatus("Не удалось создать чат"); logLine(e.message || e); }); };
    $("p2pCopy").onclick = copyRoom;
    $("p2pJoin").onclick = function () {
      var id = text($("p2pJoinId").value) || prompt("ID чата:");
      if (id) connectGuest(id).catch(function (e) { setStatus("Не удалось подключиться"); logLine(e.message || e); });
    };
    $("p2pDisc").onclick = function () { destroyed = true; destroyPeer(); role = null; roomId = null; setStatus("P2P offline"); };
    $("p2pSend").onclick = function () { var i = $("p2pMessage"); if (sendChat(i.value)) i.value = ""; i.focus(); };
    $("p2pMessage").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("p2pSend").click(); } });
    $("p2pAuto").onchange = function () { autoReply = !!this.checked; };
  }

  global.AKSI_P2P = {
    version: VER,
    createRoom: createRoom,
    joinRoom: connectGuest,
    disconnect: function () { destroyed = true; destroyPeer(); role = null; roomId = null; setStatus("P2P offline"); },
    sendChat: sendChat,
    broadcastChat: sendChat,
    broadcastQuery: function (q) { return sendChat(q); },
    broadcastReply: function (q) { return sendChat(q, true); },
    mount: mount,
    isLinked: function () { return !!(conn && conn.open); },
    getPing: function () { return lastPong ? now() - lastPong : null; },
    getRoomId: function () { return roomId; },
    setAutoReply: function (v) { autoReply = !!v; }
  };
})(typeof window !== "undefined" ? window : this);
