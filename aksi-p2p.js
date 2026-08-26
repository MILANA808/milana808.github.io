/**
 * AKSI P2P Overlay — PeerJS / WebRTC data channel
 * Room host/join · intercept Core.query · chat inject · ping
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "1.0.0-p2p";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var peer = null;
  var conn = null;
  var role = null;
  var roomId = null;
  var lastPingMs = null;
  var pingTimer = null;
  var statusEl = null;
  var hooked = false;
  var origQuery = null;

  function $(id) { return document.getElementById(id); }

  function setStatus(html) {
    statusEl = statusEl || $("p2pStatus");
    if (statusEl) statusEl.innerHTML = html;
    var bar = $("p2pBar");
    if (bar) {
      if (conn && conn.open) {
        bar.style.display = "flex";
        var ping = $("p2pPing");
        if (ping) ping.textContent = lastPingMs != null ? lastPingMs + " ms" : "…";
      } else {
        bar.style.display = "none";
      }
    }
  }

  function bubbleP2P(text, meta) {
    var th = $("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg ai";
    var b = document.createElement("div");
    b.className = "bub";
    b.textContent = text;
    var m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta || "p2p · encrypted";
    b.appendChild(m);
    d.appendChild(b);
    th.appendChild(d);
    th.scrollTop = th.scrollHeight;
  }

  function loadPeerJS() {
    return new Promise(function (resolve, reject) {
      if (global.Peer) return resolve(global.Peer);
      var s = document.createElement("script");
      s.src = PEERJS_CDN;
      s.async = true;
      s.onload = function () {
        if (global.Peer) resolve(global.Peer);
        else reject(new Error("PeerJS not found"));
      };
      s.onerror = function () { reject(new Error("PeerJS CDN failed")); };
      document.head.appendChild(s);
    });
  }

  function sendRaw(obj) {
    if (!conn || !conn.open) return false;
    try {
      conn.send(JSON.stringify(obj));
      return true;
    } catch (e) {
      return false;
    }
  }

  function handleIncoming(data) {
    var msg;
    try {
      msg = typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) {
      bubbleP2P(String(data), "p2p · raw");
      return;
    }
    if (!msg || !msg.type) return;

    if (msg.type === "ping") {
      sendRaw({ type: "pong", t0: msg.t0 });
      return;
    }
    if (msg.type === "pong" && msg.t0) {
      lastPingMs = Math.max(0, Date.now() - msg.t0);
      setStatus(statusHtml());
      return;
    }
    if (msg.type === "query") {
      bubbleP2P("↗ партнёр: " + (msg.text || ""), "p2p · in");
      return;
    }
    if (msg.type === "chat" || msg.type === "reply") {
      bubbleP2P(msg.text || "", msg.type === "reply" ? "p2p · reply" : "p2p · peer");
      return;
    }
  }

  function wireConn(c) {
    conn = c;
    c.on("open", function () {
      setStatus(statusHtml());
      startPing();
      bubbleP2P("Прямая связь установлена. Канал DTLS (WebRTC).", "p2p · link");
    });
    c.on("data", handleIncoming);
    c.on("close", function () {
      conn = null;
      stopPing();
      lastPingMs = null;
      setStatus('<span style="color:#f87171">Связь разорвана</span>');
    });
    c.on("error", function (err) {
      setStatus('<span style="color:#f87171">Ошибка: ' + (err && err.message || err) + "</span>");
    });
  }

  function statusHtml() {
    if (conn && conn.open) {
      var ping = lastPingMs != null ? lastPingMs + " ms" : "измерение…";
      return '<span style="color:#34d399">● Прямая связь: ЗАШИФРОВАНО</span> · ping <b>' + ping + "</b>" +
        (roomId ? " · room <code>" + roomId + "</code>" : "");
    }
    if (role === "host" && roomId) {
      return 'Зал создан · ID: <code style="user-select:all">' + roomId + "</code> · ждём партнёра…";
    }
    return "P2P offline";
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(function () {
      if (conn && conn.open) sendRaw({ type: "ping", t0: Date.now() });
    }, 2000);
    sendRaw({ type: "ping", t0: Date.now() });
  }
  function stopPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  function makeRoomId() {
    var b = Math.random().toString(36).slice(2, 8);
    var c = Date.now().toString(36).slice(-4);
    return "aksi-" + b + "-" + c;
  }

  function createRoom() {
    setStatus("Подключение PeerJS…");
    return loadPeerJS().then(function (Peer) {
      if (peer) {
        try { peer.destroy(); } catch (e) {}
      }
      roomId = makeRoomId();
      role = "host";
      peer = new Peer(roomId, { debug: 1 });
      return new Promise(function (resolve, reject) {
        peer.on("open", function (id) {
          roomId = id;
          setStatus(statusHtml());
          if ($("p2pRoomId")) $("p2pRoomId").textContent = id;
          resolve(id);
        });
        peer.on("connection", function (c) {
          wireConn(c);
        });
        peer.on("error", function (err) {
          setStatus('<span style="color:#f87171">' + (err.type || err.message || err) + "</span>");
          reject(err);
        });
      });
    });
  }

  function joinRoom(id) {
    id = String(id || "").trim();
    if (!id) {
      setStatus("Введите Room ID");
      return Promise.reject(new Error("empty id"));
    }
    setStatus("Подключение к " + id + "…");
    return loadPeerJS().then(function (Peer) {
      if (peer) {
        try { peer.destroy(); } catch (e) {}
      }
      role = "guest";
      roomId = id;
      peer = new Peer(undefined, { debug: 1 });
      return new Promise(function (resolve, reject) {
        peer.on("open", function () {
          var c = peer.connect(id, { reliable: true });
          wireConn(c);
          c.on("open", function () { resolve(id); });
        });
        peer.on("error", function (err) {
          setStatus('<span style="color:#f87171">' + (err.type || err.message || err) + "</span>");
          reject(err);
        });
      });
    });
  }

  function broadcastQuery(text) {
    if (!conn || !conn.open) return false;
    return sendRaw({ type: "query", text: String(text).slice(0, 4000), ts: Date.now() });
  }

  function broadcastChat(text) {
    if (!conn || !conn.open) return false;
    return sendRaw({ type: "chat", text: String(text).slice(0, 4000), ts: Date.now() });
  }

  function hookCore() {
    if (hooked) return;
    var core = global.AKSI_CORE || global.AksiCore;
    if (!core || typeof core.query !== "function") return;
    origQuery = core.query.bind(core);
    core.query = function (prompt, opts) {
      var text = String(prompt == null ? "" : prompt);
      if (conn && conn.open && text) broadcastQuery(text);
      return origQuery(prompt, opts);
    };
    hooked = true;
  }

  function hookOneAsk() {
    var one = global.AKSI_ONE;
    if (!one || typeof one.ask !== "function" || one._p2pHooked) return;
    var origAsk = one.ask.bind(one);
    one.ask = function (q) {
      if (conn && conn.open && q) broadcastChat(String(q));
      return origAsk(q);
    };
    one._p2pHooked = true;
  }

  function disconnect() {
    stopPing();
    if (conn) {
      try { conn.close(); } catch (e) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }
    role = null;
    roomId = null;
    lastPingMs = null;
    setStatus("P2P offline");
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card">' +
      "<h2>P2P Overlay · WebRTC</h2>" +
      '<p class="muted">Прямой канал между двумя браузерами (PeerJS). Запросы Core и чат зеркалируются партнёру. DTLS data channel.</p>' +
      '<div id="p2pStatus" class="muted" style="margin:12px 0;padding:10px;border-radius:10px;background:rgba(0,0,0,.25)">P2P offline</div>' +
      '<p class="muted">Room ID: <code id="p2pRoomId" style="user-select:all">—</code></p>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="p2pCreate">Создать Зал</button>' +
      '<button type="button" class="btn" id="p2pJoin">Присоединиться</button>' +
      '<button type="button" class="btn" id="p2pDisc">Отключить</button>' +
      "</div>" +
      '<input id="p2pJoinId" placeholder="ID зала партнёра" style="margin-top:12px">' +
      '<p class="muted" style="margin-top:12px">1) Хост: Создать Зал → скопировать ID<br>2) Гость: вставить ID → Присоединиться<br>3) Пишите в чат — текст уходит в data channel</p>' +
      "</div>";

    $("p2pCreate").onclick = function () {
      createRoom().then(function (id) {
        if ($("p2pRoomId")) $("p2pRoomId").textContent = id;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id);
        } catch (e) {}
      }).catch(function () {});
    };
    $("p2pJoin").onclick = function () {
      var id = ($("p2pJoinId") && $("p2pJoinId").value) || prompt("Room ID:");
      if (id) joinRoom(id).catch(function () {});
    };
    $("p2pDisc").onclick = function () { disconnect(); };
  }

  function ensureBar() {
    if ($("p2pBar")) return;
    var bar = document.createElement("div");
    bar.id = "p2pBar";
    bar.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;z-index:100;justify-content:center;align-items:center;gap:10px;padding:6px 12px;background:rgba(16,185,129,.15);border-bottom:1px solid rgba(52,211,153,.35);font-size:12px;color:#a7f3d0;backdrop-filter:blur(8px)";
    bar.innerHTML = '<span>● Прямая связь: <b>ЗАШИФРОВАНО</b></span><span>ping <b id="p2pPing">—</b></span>';
    document.body.appendChild(bar);
  }

  function boot() {
    ensureBar();
    setTimeout(hookCore, 400);
    setTimeout(hookOneAsk, 600);
    setTimeout(hookCore, 2000);
    setTimeout(hookOneAsk, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  global.AKSI_P2P = {
    version: VER,
    createRoom: createRoom,
    joinRoom: joinRoom,
    disconnect: disconnect,
    broadcastQuery: broadcastQuery,
    broadcastChat: broadcastChat,
    mount: mount,
    isLinked: function () { return !!(conn && conn.open); },
    getPing: function () { return lastPingMs; },
    getRoomId: function () { return roomId; }
  };
})(typeof window !== "undefined" ? window : this);
