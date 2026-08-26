/**
 * AKSI P2P Chat v3.0
 * Human-to-human messaging + audio/video calls over WebRTC/PeerJS.
 * The stable AKSI Core is intentionally not modified.
 */
(function (global) {
  "use strict";

  var VER = "3.0.0-p2p-chat-call";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var ICE = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" }
  ];
  var peer = null, conn = null, mediaCall = null, localStream = null;
  var role = null, roomId = null, peerId = null;
  var reconnectTimer = null, heartbeatTimer = null, lastPong = 0, retry = 0;
  var destroyed = false, autoReply = false, callWanted = false;
  var logEl = null, statusEl = null, history = [];
  var MAX_HISTORY = 200, MAX_TEXT = 4000;

  function $(id) { return document.getElementById(id); }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function now() { return Date.now(); }
  function logLine(v) { logEl = logEl || $("p2pLog"); if (logEl) logEl.textContent = ("[" + new Date().toLocaleTimeString("ru-RU") + "] " + text(v) + "\n" + (logEl.textContent || "")).slice(0, 6000); }
  function setStatus(v) {
    statusEl = statusEl || $("p2pStatus"); if (statusEl) statusEl.textContent = text(v);
    var b = $("p2pLinkBadge"), online = !!(conn && conn.open);
    if (b) { b.textContent = online ? "● connected" : (role ? "○ reconnecting" : "offline"); b.style.color = online ? "#34d399" : (role ? "#fbbf24" : "#7a738f"); }
  }

  function renderMessage(message, mine, meta) {
    var thread = $("p2pThread"); if (!thread) return;
    var row = document.createElement("div"), bubble = document.createElement("div"), stamp = document.createElement("div");
    row.className = "msg " + (mine ? "me" : "ai"); bubble.className = "bub"; stamp.className = "meta";
    bubble.textContent = text(message); stamp.textContent = meta || (mine ? "вы" : "собеседник"); bubble.appendChild(stamp); row.appendChild(bubble); thread.appendChild(row);
    while (thread.children.length > 200) thread.removeChild(thread.firstChild);
    thread.scrollTop = thread.scrollHeight;
  }
  function addMessage(message, mine, meta, id) {
    var item = { id: id || ("m-" + now() + "-" + Math.random().toString(36).slice(2, 8)), text: text(message).slice(0, MAX_TEXT), mine: !!mine, ts: now(), meta: meta || "" };
    if (!item.text) return; history.push(item); if (history.length > MAX_HISTORY) history.shift(); renderMessage(item.text, item.mine, item.meta);
  }
  function saveHistory() { try { localStorage.setItem("aksi:p2p:history", JSON.stringify(history.slice(-MAX_HISTORY))); } catch (_) {} }
  function loadHistory() {
    try { var a = JSON.parse(localStorage.getItem("aksi:p2p:history") || "[]"); if (Array.isArray(a)) history = a.slice(-MAX_HISTORY); } catch (_) { history = []; }
    var t = $("p2pThread"); if (t) { t.innerHTML = ""; history.forEach(function (m) { renderMessage(m.text, m.mine, m.meta); }); }
  }
  function loadPeerJS() {
    return new Promise(function (resolve, reject) {
      if (global.Peer) return resolve(global.Peer);
      var s = document.createElement("script"); s.src = PEERJS_CDN; s.async = true;
      s.onload = function () { global.Peer ? resolve(global.Peer) : reject(new Error("PeerJS unavailable")); };
      s.onerror = function () { reject(new Error("PeerJS CDN unavailable")); }; document.head.appendChild(s);
    });
  }
  function peerOptions(id) { return { debug: 0, config: { iceServers: ICE }, ...(id ? { id: id } : {}) }; }
  function send(obj) { if (!conn || !conn.open) return false; try { conn.send(obj); return true; } catch (e) { logLine("send: " + e.message); return false; } }

  function handle(data) {
    var msg = data; if (typeof data === "string") { try { msg = JSON.parse(data); } catch (_) { msg = { type: "chat", text: data }; } }
    if (!msg || !msg.type) return;
    if (msg.type === "hello") { send({ type: "hello", ts: now() }); return; }
    if (msg.type === "ping") { send({ type: "pong", t: msg.t }); return; }
    if (msg.type === "pong") { lastPong = now(); updateConnectionState(); return; }
    if (msg.type === "chat" || msg.type === "message") {
      var incoming = text(msg.text).slice(0, MAX_TEXT); if (!incoming) return;
      addMessage(incoming, false, "собеседник · " + new Date().toLocaleTimeString("ru-RU"), msg.id); saveHistory();
      if (autoReply && global.AKSI_CORE && typeof global.AKSI_CORE.query === "function") Promise.resolve(global.AKSI_CORE.query(incoming)).then(function (r) { var a = r && r.text ? text(r.text) : ""; if (a) sendChat(a, true); }).catch(function () {});
    }
  }
  function updateConnectionState() {
    if (conn && conn.open) { var ping = lastPong ? Math.max(0, now() - lastPong) : null; setStatus("Соединено · WebRTC/DTLS · " + (ping == null ? "проверка…" : ping + " ms")); var p = $("p2pPing"); if (p) p.textContent = ping == null ? "…" : ping + " ms"; }
    else setStatus(role ? "Соединение восстанавливается…" : "P2P offline");
  }
  function startHeartbeat() {
    stopHeartbeat(); lastPong = now();
    heartbeatTimer = setInterval(function () { if (!conn || !conn.open) return; send({ type: "ping", t: now() }); if (now() - lastPong > 20000) { logLine("heartbeat timeout; reconnecting"); try { conn.close(); } catch (_) {} } }, 5000);
  }
  function stopHeartbeat() { if (heartbeatTimer) clearInterval(heartbeatTimer); heartbeatTimer = null; }
  function scheduleReconnect() {
    if (destroyed || !role || reconnectTimer) return;
    var delay = Math.min(15000, Math.round(1000 * Math.pow(1.5, Math.min(retry, 6)))); retry++;
    setStatus("Восстановление соединения через " + Math.ceil(delay / 1000) + " с…");
    reconnectTimer = setTimeout(function () { reconnectTimer = null; if (role === "guest" && roomId) connectGuest(roomId).catch(function () { scheduleReconnect(); }); else if (role === "host") recreateHost().catch(function () { scheduleReconnect(); }); }, delay);
  }
  function wire(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (_) {} } conn = c;
    c.on("open", function () { retry = 0; lastPong = now(); setStatus("Соединено · WebRTC/DTLS"); startHeartbeat(); send({ type: "hello", ts: now() }); logLine("chat connected"); if (callWanted) startCall(false).catch(function (e) { logLine("call: " + e.message); }); });
    c.on("data", handle);
    c.on("close", function () { if (conn === c) conn = null; stopHeartbeat(); logLine("chat connection closed"); scheduleReconnect(); });
    c.on("error", function (e) { logLine("chat error: " + (e && e.message || e)); if (!c.open) scheduleReconnect(); });
  }
  function destroyPeer(keepIntent) {
    if (reconnectTimer) clearTimeout(reconnectTimer); reconnectTimer = null; stopHeartbeat();
    if (mediaCall) { try { mediaCall.close(); } catch (_) {} mediaCall = null; }
    if (conn) { try { conn.close(); } catch (_) {} }
    if (peer) { try { peer.destroy(); } catch (_) {} }
    conn = null; peer = null; if (!keepIntent) callWanted = false;
  }
  function attachPeerEvents() {
    peer.on("connection", function (c) { wire(c); });
    peer.on("call", function (call) {
      if (!localStream) { navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (s) { localStream = s; call.answer(s); attachMediaCall(call); }).catch(function () { call.answer(); attachMediaCall(call); }); }
      else { call.answer(localStream); attachMediaCall(call); }
    });
    peer.on("disconnected", function () { logLine("signaling disconnected; reconnecting"); try { peer.reconnect(); } catch (_) {} });
    peer.on("error", function (e) { logLine("peer error: " + (e && (e.type || e.message) || e)); if (!peerId) setStatus("Ошибка сигнализации: " + (e.type || e.message || "unknown")); else scheduleReconnect(); });
  }
  function makePeer(id) { return new Promise(function (resolve, reject) { peer = new global.Peer(id, peerOptions()); peer.on("open", function (pid) { peerId = pid; attachPeerEvents(); resolve(pid); }); peer.on("error", reject); }); }
  function recreateHost() {
    if (!roomId || role !== "host") return Promise.reject(new Error("No host room"));
    destroyed = false; var old = roomId; destroyPeer(true);
    return makePeer(old).then(function (id) { roomId = id; setStatus("Зал восстановлен · ждём собеседника"); return id; }).catch(function () { roomId = null; return createRoom(); });
  }
  function createRoom() {
    destroyed = false; role = "host"; retry = 0; setStatus("Создаём чат…"); destroyPeer(true);
    return loadPeerJS().then(function () { var id = "aksi-" + Math.random().toString(36).slice(2, 10); return makePeer(id); }).then(function (id) { roomId = id; $("p2pRoomId") && ($("p2pRoomId").textContent = id); setStatus("Зал создан · ждём собеседника · " + id); logLine("room " + id); return id; });
  }
  function connectGuest(id) {
    id = text(id); if (!id) return Promise.reject(new Error("ID чата пуст")); destroyed = false; role = "guest"; roomId = id; retry = 0; destroyPeer(true); setStatus("Подключаемся к " + id + "…");
    return loadPeerJS().then(function () { return makePeer(null); }).then(function () { return new Promise(function (resolve, reject) { var c = peer.connect(id, { reliable: true, serialization: "json" }); wire(c); var timer = setTimeout(function () { if (!c.open) { try { c.close(); } catch (_) {} reject(new Error("Не удалось установить P2P-соединение за 15 секунд")); scheduleReconnect(); } }, 15000); c.on("open", function () { clearTimeout(timer); retry = 0; resolve(id); }); }); });
  }
  function sendChat(value, alreadyRendered) {
    var message = text(value).slice(0, MAX_TEXT); if (!message) return false;
    if (!conn || !conn.open) { setStatus("Нет соединения — сообщение не отправлено"); return false; }
    var id = "m-" + now() + "-" + Math.random().toString(36).slice(2, 8); if (!alreadyRendered) addMessage(message, true, "вы · " + new Date().toLocaleTimeString("ru-RU"), id);
    if (!send({ type: "chat", id: id, text: message, ts: now() })) return false; saveHistory(); return true;
  }
  function copyRoom() { var id = roomId || ""; if (!id) return; if (navigator.clipboard) navigator.clipboard.writeText(id).catch(function () {}); logLine("room ID copied"); }

  function attachMediaCall(call) {
    mediaCall = call; call.on("stream", function (stream) { var v = $("p2pRemoteVideo"); if (v) { v.srcObject = stream; v.play().catch(function () {}); } setStatus("Аудио/видеозвонок подключён"); });
    call.on("close", function () { if (mediaCall === call) mediaCall = null; setStatus(conn && conn.open ? "Чат соединён" : "P2P offline"); });
    call.on("error", function (e) { logLine("media error: " + (e && e.message || e)); });
  }
  function previewLocal() { var v = $("p2pLocalVideo"); if (v && localStream) { v.srcObject = localStream; v.muted = true; v.playsInline = true; v.play().catch(function () {}); } }
  function getMedia() {
    if (localStream) return Promise.resolve(localStream);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("Браузер не поддерживает микрофон/камеру"));
    return navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (s) { localStream = s; previewLocal(); return s; });
  }
  function startCall(video) {
    callWanted = true;
    if (!peer || !peer.open || !roomId) return Promise.reject(new Error("Сначала подключите чат"));
    return getMedia().then(function (s) { if (mediaCall) { try { mediaCall.close(); } catch (_) {} } var call = peer.call(roomId, s, { metadata: { aksi: true, video: video !== false } }); attachMediaCall(call); return call; });
  }
  function endCall() { callWanted = false; if (mediaCall) { try { mediaCall.close(); } catch (_) {} mediaCall = null; } if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; } var v = $("p2pLocalVideo"), r = $("p2pRemoteVideo"); if (v) v.srcObject = null; if (r) r.srcObject = null; setStatus(conn && conn.open ? "Чат соединён" : "P2P offline"); }
  function toggleMute() { if (!localStream) return; localStream.getAudioTracks().forEach(function (t) { t.enabled = !t.enabled; }); var b = $("p2pMute"); if (b) b.textContent = localStream.getAudioTracks()[0] && localStream.getAudioTracks()[0].enabled ? "🔇 Выключить микрофон" : "🎙 Включить микрофон"; }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel; if (!root) return;
    root.innerHTML = '<div class="card"><h2>💬 P2P-чат <span id="p2pLinkBadge" style="font-size:11px;margin-left:8px;color:#7a738f">offline</span></h2>' +
      '<p class="muted">Сообщения и аудио/видеозвонки через WebRTC. Сигнализация нужна только для установки связи.</p>' +
      '<div id="p2pStatus" class="muted" style="margin:12px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.28)">P2P offline</div>' +
      '<div class="card" style="padding:10px;margin:0 0 10px;background:rgba(0,0,0,.18)"><div id="p2pThread" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto"></div></div>' +
      '<div style="display:flex;gap:8px"><input id="p2pMessage" placeholder="Сообщение собеседнику…" autocomplete="off" maxlength="4000"><button type="button" class="btn p" id="p2pSend">➤</button></div>' +
      '<div class="row"><button type="button" class="btn p" id="p2pCreate">Создать чат</button><button type="button" class="btn" id="p2pCopy">Копировать ID</button><button type="button" class="btn" id="p2pJoin">Войти</button><button type="button" class="btn" id="p2pDisc">Отключить</button></div>' +
      '<input id="p2pJoinId" placeholder="ID чата собеседника" autocomplete="off" style="margin-top:10px"><div class="row" style="margin-top:10px"><button type="button" class="btn p" id="p2pCall">📹 Позвонить</button><button type="button" class="btn" id="p2pAudio">📞 Аудиозвонок</button><button type="button" class="btn" id="p2pMute">🔇 Выключить микрофон</button><button type="button" class="btn" id="p2pHang">⛔ Завершить</button></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><video id="p2pLocalVideo" autoplay muted playsinline style="width:100%;border-radius:12px;background:#111"></video><video id="p2pRemoteVideo" autoplay playsinline style="width:100%;border-radius:12px;background:#111"></video></div>' +
      '<label class="muted" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="p2pAuto"> Автоответ АКСИ</label><pre id="p2pLog" class="out" style="max-height:120px;font-size:11px">лог…</pre></div>';
    logEl = $("p2pLog"); statusEl = $("p2pStatus"); loadHistory();
    $("p2pCreate").onclick = function () { createRoom().then(copyRoom).catch(function (e) { setStatus("Не удалось создать чат"); logLine(e.message || e); }); };
    $("p2pCopy").onclick = copyRoom;
    $("p2pJoin").onclick = function () { var id = text($("p2pJoinId").value) || prompt("ID чата:"); if (id) connectGuest(id).catch(function (e) { setStatus("Не удалось подключиться"); logLine(e.message || e); }); };
    $("p2pDisc").onclick = function () { destroyed = true; endCall(); destroyPeer(false); role = null; roomId = null; setStatus("P2P offline"); };
    $("p2pSend").onclick = function () { var i = $("p2pMessage"); if (sendChat(i.value)) i.value = ""; i.focus(); };
    $("p2pMessage").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("p2pSend").click(); } });
    $("p2pAuto").onchange = function () { autoReply = !!this.checked; };
    $("p2pCall").onclick = function () { startCall(true).catch(function (e) { setStatus("Не удалось начать видеозвонок"); logLine(e.message || e); }); };
    $("p2pAudio").onclick = function () { startCall(false).catch(function (e) { setStatus("Не удалось начать аудиозвонок"); logLine(e.message || e); }); };
    $("p2pMute").onclick = toggleMute; $("p2pHang").onclick = endCall;
  }

  global.AKSI_P2P = { version: VER, createRoom: createRoom, joinRoom: connectGuest, disconnect: function () { destroyed = true; endCall(); destroyPeer(false); role = null; roomId = null; setStatus("P2P offline"); }, sendChat: sendChat, broadcastChat: sendChat, broadcastQuery: sendChat, broadcastReply: function (q) { return sendChat(q, true); }, mount: mount, isLinked: function () { return !!(conn && conn.open); }, getPing: function () { return lastPong ? now() - lastPong : null; }, getRoomId: function () { return roomId; }, setAutoReply: function (v) { autoReply = !!v; }, startCall: startCall, endCall: endCall, toggleMute: toggleMute };
})(typeof window !== "undefined" ? window : this);
