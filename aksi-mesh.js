/**
 * AKSI Mesh v1.0 — complete P2P system from scratch
 * Transports: BroadcastChannel (same device) + PeerJS (internet)
 * Local brain, rooms, auto-reconnect
 * Proprietary © AKSI · aksilove@internet.ru · See LICENSE
 */
(function (global) {
  "use strict";

  var VER = "1.0.0-mesh";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var ICE = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp"
      ],
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ];

  function $(id) { return document.getElementById(id); }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function now() { return Date.now(); }

  function brain(q) {
    q = text(q);
    var low = q.toLowerCase();
    if (!q) return "Напишите сообщение.";
    if (/^(привет|здравствуй|hello|hi|hey)\b/.test(low))
      return "Привет. Я АКСИ Mesh — локальный канал + P2P. Работаю без вашего сервера.";
    if (/кто ты|what are you|who are you/.test(low))
      return "АКСИ Mesh v" + VER + " · BroadcastChannel + PeerJS · proprietary · aksilove@internet.ru";
    if (/что умеешь|help|помощь/.test(low))
      return "Комнаты, чат на одном устройстве и через интернет, локальные ответы, ping, автопереподключение.";
    if (/время|time|час/.test(low)) {
      try {
        return "Сейчас " + new Intl.DateTimeFormat("ru-RU", {
          timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", second: "2-digit"
        }).format(new Date()) + " MSK";
      } catch (e) {
        return new Date().toLocaleString("ru-RU");
      }
    }
    if (/ping|статус|status|связь/.test(low)) {
      var st = Mesh.isLinked() ? "P2P online" : "только локальный канал";
      return "Статус: " + st + (Mesh.getPing() != null ? " · RTT ~" + Mesh.getPing() + " ms" : "");
    }
    if (global.AKSI_CORE && typeof global.AKSI_CORE.query === "function") return null;
    if (global.AKSI_ONE && typeof global.AKSI_ONE.think === "function") return null;
    return "Принято: «" + q.slice(0, 160) + "». Mesh на связи. Спросите: кто ты / время / помощь.";
  }

  function brainAsync(q) {
    var sync = brain(q);
    if (sync != null) return Promise.resolve(sync);
    if (global.AKSI_ONE && typeof global.AKSI_ONE.think === "function") {
      return global.AKSI_ONE.think(q).then(function (r) {
        return (r && r.text) || brain(q) || "…";
      }).catch(function () { return "Локальный ответ: «" + text(q).slice(0, 80) + "»"; });
    }
    if (global.AKSI_CORE && typeof global.AKSI_CORE.query === "function") {
      return Promise.race([
        global.AKSI_CORE.query(q),
        new Promise(function (r) { setTimeout(function () { r(null); }, 6000); })
      ]).then(function (res) {
        return (res && res.text) || ("Принято: «" + text(q).slice(0, 120) + "»");
      }).catch(function () {
        return "Принято: «" + text(q).slice(0, 120) + "»";
      });
    }
    return Promise.resolve("Принято: «" + text(q).slice(0, 120) + "»");
  }

  var peer = null, conn = null, channel = null;
  var role = null, roomId = null, peerId = null;
  var lastRtt = null, lastPong = 0, hb = null, reconnectT = null;
  var destroyed = false, retry = 0, autoReply = true;
  var handlers = { message: [], status: [], log: [] };

  function emit(ev, data) {
    (handlers[ev] || []).forEach(function (fn) {
      try { fn(data); } catch (e) {}
    });
  }
  function log(msg) { emit("log", msg); }
  function setStatus(s) { emit("status", s); }

  function loadPeerJS() {
    return new Promise(function (resolve, reject) {
      if (global.Peer) return resolve(global.Peer);
      var s = document.createElement("script");
      s.src = PEERJS_CDN;
      s.async = true;
      s.onload = function () { global.Peer ? resolve(global.Peer) : reject(new Error("PeerJS missing")); };
      s.onerror = function () { reject(new Error("PeerJS CDN fail")); };
      document.head.appendChild(s);
    });
  }

  function iceConfig() {
    var extra = global.AKSI_P2P_TURN;
    var list = ICE.slice();
    if (extra) {
      if (Array.isArray(extra)) list = extra.concat(list);
      else if (extra.urls) list = [extra].concat(list);
      else if (extra.iceServers) list = extra.iceServers.concat(list);
    }
    return { iceServers: list, sdpSemantics: "unified-plan" };
  }

  function openLocalBus(id) {
    closeLocalBus();
    if (typeof BroadcastChannel === "undefined") {
      log("BroadcastChannel N/A — only PeerJS");
      return;
    }
    channel = new BroadcastChannel("aksi-mesh-" + id);
    channel.onmessage = function (ev) { onPayload(ev.data, "local"); };
    log("local bus open: " + id);
  }

  function closeLocalBus() {
    if (channel) {
      try { channel.close(); } catch (e) {}
      channel = null;
    }
  }

  function sendLocal(obj) {
    if (!channel) return false;
    try { channel.postMessage(obj); return true; } catch (e) { return false; }
  }

  function sendPeer(obj) {
    if (!conn || !conn.open) return false;
    try {
      conn.send(typeof obj === "string" ? obj : JSON.stringify(obj));
      return true;
    } catch (e) { return false; }
  }

  function broadcast(obj) {
    var a = sendLocal(obj);
    var b = sendPeer(obj);
    return a || b;
  }

  function onPayload(raw, via) {
    var msg;
    try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (e) {
      emit("message", { text: String(raw), via: via, mine: false });
      return;
    }
    if (!msg || !msg.type) return;

    if (msg.type === "ping") {
      broadcast({ type: "pong", t: msg.t, t1: now() });
      return;
    }
    if (msg.type === "pong" && msg.t) {
      lastPong = now();
      lastRtt = Math.max(0, now() - msg.t);
      setStatus({ linked: isLinked(), rtt: lastRtt, role: role, roomId: roomId });
      return;
    }
    if (msg.type === "hello") {
      log("hello via " + via);
      lastPong = now();
      return;
    }
    if (msg.type === "chat" || msg.type === "query") {
      var body = text(msg.text);
      if (!body) return;
      if (msg.from && msg.from === peerId) return;
      emit("message", { text: body, via: via, mine: false, type: msg.type });
      if (autoReply) {
        brainAsync(body).then(function (ans) {
          emit("message", { text: ans, via: "brain", mine: false, type: "reply" });
          broadcast({ type: "reply", text: ans, ts: now(), from: peerId });
        });
      }
      return;
    }
    if (msg.type === "reply") {
      if (msg.from && msg.from === peerId) return;
      emit("message", { text: text(msg.text), via: via, mine: false, type: "reply" });
    }
  }

  function startHb() {
    stopHb();
    lastPong = now();
    hb = setInterval(function () {
      broadcast({ type: "ping", t: now() });
      if (conn && conn.open && lastPong && now() - lastPong > 45000) {
        log("peer silent → reconnect");
        try { conn.close(); } catch (e) {}
      }
    }, 4000);
  }
  function stopHb() {
    if (hb) clearInterval(hb);
    hb = null;
  }

  function wireConn(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
    conn = c;
    c.on("open", function () {
      retry = 0;
      lastPong = now();
      log("peer data open");
      setStatus({ linked: true, rtt: lastRtt, role: role, roomId: roomId });
      startHb();
      sendPeer({ type: "hello", text: "mesh " + VER, from: peerId, ts: now() });
      emit("message", { text: "P2P-канал установлен (DTLS).", via: "sys", mine: false, type: "sys" });
    });
    c.on("data", function (d) { onPayload(d, "peer"); });
    c.on("close", function () {
      if (conn === c) conn = null;
      stopHb();
      log("peer closed");
      setStatus({ linked: isLinked(), role: role, roomId: roomId });
      scheduleReconnect();
    });
    c.on("error", function (e) { log("peer err: " + (e && e.message || e)); });
  }

  function scheduleReconnect() {
    if (destroyed || !role || role !== "guest" || !roomId) return;
    if (reconnectT) return;
    var delay = Math.min(15000, 1000 * Math.pow(1.5, Math.min(retry, 6)));
    retry++;
    log("reconnect in " + Math.round(delay / 1000) + "s");
    reconnectT = setTimeout(function () {
      reconnectT = null;
      joinRoom(roomId, true).catch(function () { scheduleReconnect(); });
    }, delay);
  }

  function destroyPeer() {
    if (reconnectT) clearTimeout(reconnectT);
    reconnectT = null;
    stopHb();
    if (conn) { try { conn.close(); } catch (e) {} conn = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  }

  function makePeer(id) {
    return loadPeerJS().then(function (Peer) {
      return new Promise(function (resolve, reject) {
        var opts = { debug: 0, config: iceConfig() };
        var p = id ? new Peer(id, opts) : new Peer(opts);
        peer = p;
        var done = false;
        var t = setTimeout(function () {
          if (!done) { done = true; reject(new Error("Peer timeout")); }
        }, 20000);
        p.on("open", function (openId) {
          if (done) return;
          done = true;
          clearTimeout(t);
          peerId = openId;
          p.on("connection", function (c) { wireConn(c); });
          p.on("disconnected", function () { try { p.reconnect(); } catch (e) {} });
          p.on("error", function (e) { log("signaling: " + (e.type || e.message || e)); });
          resolve(openId);
        });
        p.on("error", function (e) {
          if (done) return;
          if (e && e.type === "unavailable-id") {
            done = true;
            clearTimeout(t);
            reject(e);
          }
        });
      });
    });
  }

  function isLinked() {
    return !!(conn && conn.open) || !!channel;
  }

  function createRoom() {
    destroyed = false;
    role = "host";
    retry = 0;
    destroyPeer();
    roomId = "aksi-" + Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
    openLocalBus(roomId);
    setStatus({ linked: true, role: role, roomId: roomId, local: true });
    emit("message", {
      text: "Зал создан. ID: " + roomId + "\n• Другая вкладка на этом ПК — уже в комнате\n• Другое устройство — Присоединиться по ID",
      via: "sys", mine: false, type: "sys"
    });
    return makePeer(roomId).then(function (id) {
      roomId = id || roomId;
      openLocalBus(roomId);
      setStatus({ linked: true, role: role, roomId: roomId });
      log("host " + roomId);
      return roomId;
    }).catch(function (e) {
      log("PeerJS host fail, local-only: " + (e && e.message || e));
      setStatus({ linked: true, role: role, roomId: roomId, localOnly: true });
      return roomId;
    });
  }

  function joinRoom(id, isRetry) {
    id = text(id);
    if (!id) return Promise.reject(new Error("пустой ID"));
    destroyed = false;
    role = "guest";
    roomId = id;
    if (!isRetry) retry = 0;
    destroyPeer();
    openLocalBus(id);
    setStatus({ linked: true, role: role, roomId: roomId, local: true });
    emit("message", {
      text: "Локальный канал к «" + id + "». Подключаем PeerJS…",
      via: "sys", mine: false, type: "sys"
    });
    return makePeer().then(function () {
      return new Promise(function (resolve) {
        var c = peer.connect(id, { reliable: true, serialization: "json" });
        wireConn(c);
        var t = setTimeout(function () {
          if (!c.open) {
            log("peer join timeout — local bus still active");
            resolve(id);
          }
        }, 15000);
        c.on("open", function () { clearTimeout(t); resolve(id); });
      });
    }).catch(function (e) {
      log("join peer fail: " + (e && e.message || e));
      return id;
    });
  }

  function leave() {
    destroyed = true;
    role = null;
    roomId = null;
    peerId = null;
    destroyPeer();
    closeLocalBus();
    setStatus({ linked: false });
    log("left room");
  }

  function sendChat(value) {
    var message = text(value);
    if (!message) return false;
    emit("message", { text: message, via: "out", mine: true, type: "chat" });
    broadcast({ type: "chat", text: message, ts: now(), from: peerId || "local" });
    return true;
  }

  function ask(value) {
    var message = text(value);
    if (!message) return Promise.resolve();
    sendChat(message);
    return brainAsync(message).then(function (ans) {
      emit("message", { text: ans, via: "brain", mine: false, type: "reply" });
      broadcast({ type: "reply", text: ans, ts: now(), from: peerId || "local" });
      return ans;
    });
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;

    root.innerHTML =
      '<div class="mesh-wrap" style="display:flex;flex-direction:column;gap:12px">' +
      '<div class="card">' +
      '<h2 style="margin:0 0 8px">AKSI Mesh <span id="meshBadge" style="font-size:11px;color:#7a738f">offline</span></h2>' +
      '<p class="muted" style="margin:0">С нуля: BroadcastChannel (вкладки) + PeerJS (интернет). Без TURN на Pages.</p>' +
      '<div id="meshStatus" class="muted" style="margin:12px 0;padding:10px;border-radius:12px;background:rgba(0,0,0,.28)">Нет комнаты</div>' +
      '<p class="muted">Room: <code id="meshRoom" style="user-select:all">—</code></p>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="meshCreate">Создать зал</button>' +
      '<button type="button" class="btn" id="meshCopy">Копировать ID</button>' +
      '<button type="button" class="btn" id="meshJoin">Войти</button>' +
      '<button type="button" class="btn" id="meshLeave">Выйти</button>' +
      "</div>" +
      '<input id="meshJoinId" placeholder="ID зала" style="margin-top:10px" autocomplete="off">' +
      '<label class="muted" style="display:flex;gap:8px;align-items:center;margin-top:10px">' +
      '<input type="checkbox" id="meshAuto" checked> Auto-reply' +
      "</label></div>" +
      '<div class="card" style="flex:1;display:flex;flex-direction:column;min-height:220px">' +
      '<div id="meshThread" style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px;max-height:320px"></div>' +
      '<div class="row" style="margin-top:10px">' +
      '<input id="meshInput" placeholder="Сообщение…" style="flex:1">' +
      '<button type="button" class="btn p" id="meshSend">→</button>' +
      "</div>" +
      '<pre id="meshLog" class="out" style="max-height:100px;font-size:11px;margin-top:10px">лог…</pre>' +
      "</div></div>";

    function bubble(m) {
      var th = $("meshThread");
      if (!th) return;
      var row = document.createElement("div");
      row.className = "msg " + (m.mine ? "me" : "ai");
      var b = document.createElement("div");
      b.className = "bub";
      b.textContent = m.text;
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = (m.via || "") + (m.type ? " · " + m.type : "");
      b.appendChild(meta);
      row.appendChild(b);
      th.appendChild(row);
      th.scrollTop = th.scrollHeight;
    }

    function paintStatus(s) {
      s = s || {};
      var el = $("meshStatus");
      var badge = $("meshBadge");
      var room = $("meshRoom");
      if (room && s.roomId) room.textContent = s.roomId;
      var linked = !!s.linked;
      if (badge) {
        badge.textContent = linked ? (s.rtt != null ? "online · " + s.rtt + " ms" : "online") : "offline";
        badge.style.color = linked ? "#34d399" : "#7a738f";
      }
      if (el) {
        if (!s.roomId) el.textContent = "Нет комнаты — Создать зал или Войти";
        else {
          el.textContent =
            (s.role === "host" ? "Хост" : "Гость") +
            " · " + s.roomId +
            (s.localOnly ? " · только локальные вкладки" : "") +
            (s.rtt != null ? " · RTT " + s.rtt + " ms" : "");
        }
      }
    }

    handlers.message = [bubble];
    handlers.status = [paintStatus];
    handlers.log = [function (line) {
      var l = $("meshLog");
      if (!l) return;
      l.textContent = ("[" + new Date().toLocaleTimeString("ru-RU") + "] " + line + "\n" + l.textContent).slice(0, 3000);
    }];

    $("meshCreate").onclick = function () {
      createRoom().then(function (id) {
        if ($("meshRoom")) $("meshRoom").textContent = id;
        try { if (navigator.clipboard) navigator.clipboard.writeText(id); } catch (e) {}
      });
    };
    $("meshCopy").onclick = function () {
      var id = roomId || ($("meshRoom") && $("meshRoom").textContent);
      if (id && id !== "—" && navigator.clipboard) navigator.clipboard.writeText(id);
    };
    $("meshJoin").onclick = function () {
      var id = text(($("meshJoinId") && $("meshJoinId").value) || prompt("ID зала:"));
      if (id) joinRoom(id);
    };
    $("meshLeave").onclick = function () { leave(); paintStatus({}); };
    $("meshSend").onclick = function () {
      var i = $("meshInput");
      if (!i) return;
      var v = i.value;
      i.value = "";
      ask(v);
    };
    $("meshInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        $("meshSend").click();
      }
    });
    $("meshAuto").onchange = function () { autoReply = !!this.checked; };

    bubble({
      text: "Mesh готов. Создайте зал и откройте вторую вкладку — сообщения пойдут сразу.",
      via: "sys", mine: false
    });
  }

  var Mesh = {
    version: VER,
    createRoom: createRoom,
    joinRoom: joinRoom,
    leave: leave,
    sendChat: sendChat,
    ask: ask,
    mount: mount,
    isLinked: isLinked,
    getPing: function () { return lastRtt; },
    getRoomId: function () { return roomId; },
    setAutoReply: function (v) { autoReply = !!v; },
    on: function (ev, fn) { if (handlers[ev]) handlers[ev].push(fn); }
  };

  global.AKSI_MESH = Mesh;
})(typeof window !== "undefined" ? window : this);
