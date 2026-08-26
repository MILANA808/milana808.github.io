/**
 * AKSI P2P Overlay v5.0 — stable connection
 * BroadcastChannel (same origin) + PeerJS (cross-device)
 * Fixes: peer-unavailable spam, false ЗАШИФРОВАНО, host keep-alive, guest reuse
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (global) {
  "use strict";

  var VER = "5.0.0";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var CONNECT_WAIT = 25000;
  var HB_MS = 5000;
  var SILENT_MS = 50000;
  var MAX_RETRY = 6;
  var MAX_TEXT = 4000;

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

  var peer = null, conn = null, bus = null;
  var role = null, roomId = null;
  var lastPong = 0, rtt = null;
  var hbTimer = null, reconnectTimer = null;
  var destroyed = false, connecting = false, retry = 0, autoReply = true;
  var peerReady = false;

  function $(id) { return document.getElementById(id); }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function now() { return Date.now(); }

  function logLine(msg) {
    var el = $("p2pLog");
    if (!el) return;
    var line = "[" + new Date().toLocaleTimeString("ru-RU") + "] " + msg;
    el.textContent = (line + "\n" + el.textContent).slice(0, 4000);
  }

  function bubble(msg, meta, mine) {
    var th = $("p2pThread");
    if (!th) return;
    var row = document.createElement("div");
    row.className = "msg " + (mine ? "me" : "ai");
    var b = document.createElement("div");
    b.className = "bub";
    b.textContent = msg;
    var m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta || "";
    b.appendChild(m);
    row.appendChild(b);
    th.appendChild(row);
    th.scrollTop = th.scrollHeight;
  }

  function dataOpen() { return !!(conn && conn.open); }
  function localOpen() { return !!bus; }
  function anyLink() { return dataOpen() || localOpen(); }

  function paintStatus() {
    var bar = $("p2pBar");
    var badge = $("p2pBadge");
    var ping = $("p2pPing");
    var roleEl = $("p2pRole");
    var roomEl = $("p2pRoomId");
    var online = dataOpen();

    if (roomEl && roomId) roomEl.textContent = roomId;
    if (roleEl) roleEl.textContent = role || "—";
    if (ping) ping.textContent = online && rtt != null ? rtt + " ms" : "—";

    if (badge) {
      if (online) {
        badge.textContent = "ЗАШИФРОВАНО";
        badge.style.color = "#34d399";
      } else if (localOpen() && role) {
        badge.textContent = "локальный канал";
        badge.style.color = "#fbbf24";
      } else if (connecting) {
        badge.textContent = "подключение…";
        badge.style.color = "#fbbf24";
      } else if (role) {
        badge.textContent = "нет P2P";
        badge.style.color = "#f87171";
      } else {
        badge.textContent = "offline";
        badge.style.color = "#7a738f";
      }
    }
    if (bar) bar.style.display = role ? "flex" : "none";

    var st = $("p2pStatus");
    if (st) {
      if (!role) st.textContent = "Создайте зал или войдите по ID";
      else if (online) st.textContent = (role === "host" ? "Хост" : "Гость") + " · DTLS · " + (rtt != null ? rtt + " ms" : "ok");
      else if (localOpen()) st.textContent = (role === "host" ? "Хост" : "Гость") + " · локальные вкладки OK · ждём PeerJS";
      else if (connecting) st.textContent = "Подключение к «" + roomId + "»…";
      else st.textContent = (role === "host" ? "Хост ждёт гостя" : "Гость: хост оффлайн или неверный ID") + " · " + (roomId || "");
    }
  }

  function setStatus(s) {
    var st = $("p2pStatus");
    if (st && s) st.textContent = s;
    paintStatus();
  }

  function iceConfig() {
    var list = ICE.slice();
    var extra = global.AKSI_P2P_TURN;
    if (extra) {
      if (Array.isArray(extra)) list = extra.concat(list);
      else if (extra.urls) list = [extra].concat(list);
      else if (extra.iceServers) list = extra.iceServers.concat(list);
    }
    return { iceServers: list, sdpSemantics: "unified-plan" };
  }

  function openBus(id) {
    closeBus();
    if (typeof BroadcastChannel === "undefined") {
      logLine("BroadcastChannel нет — только PeerJS");
      return;
    }
    try {
      bus = new BroadcastChannel("aksi-p2p-" + id);
      bus.onmessage = function (ev) { onData(ev.data, "local"); };
      logLine("локальный канал: " + id);
      paintStatus();
    } catch (e) {
      logLine("bus fail: " + (e && e.message || e));
      bus = null;
    }
  }

  function closeBus() {
    if (bus) { try { bus.close(); } catch (e) {} bus = null; }
  }

  function sendBus(obj) {
    if (!bus) return false;
    try { bus.postMessage(obj); return true; } catch (e) { return false; }
  }

  function sendPeer(obj) {
    if (!conn || !conn.open) return false;
    try {
      conn.send(typeof obj === "string" ? obj : JSON.stringify(obj));
      return true;
    } catch (e) { logLine("send fail"); return false; }
  }

  function sendAll(obj) {
    return sendPeer(obj) || sendBus(obj);
  }

  function localAnswer(q) {
    q = text(q);
    if (!q) return Promise.resolve("…");
    if (global.AKSI_ONE && typeof global.AKSI_ONE.think === "function") {
      return global.AKSI_ONE.think(q).then(function (r) {
        return (r && r.text) || ("Принято: «" + q.slice(0, 80) + "»");
      }).catch(function () { return "Принято: «" + q.slice(0, 80) + "»"; });
    }
    if (/привет|hello|hi/i.test(q)) return Promise.resolve("Привет по P2P. АКСИ на связи.");
    return Promise.resolve("Получено: «" + q.slice(0, 100) + "»");
  }

  function onData(raw, via) {
    var msg;
    try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (e) { bubble(String(raw), via + " · raw"); return; }
    if (!msg || !msg.type) return;

    if (msg.type === "ping") { sendAll({ type: "pong", t: msg.t, t1: now() }); return; }
    if (msg.type === "pong" && msg.t) {
      lastPong = now();
      rtt = Math.max(0, now() - msg.t);
      paintStatus();
      return;
    }
    if (msg.type === "hello" || msg.type === "sys") {
      lastPong = now();
      logLine((via || "peer") + ": " + (msg.text || msg.type));
      return;
    }
    if (msg.type === "chat" || msg.type === "query") {
      var body = text(msg.text).slice(0, MAX_TEXT);
      if (!body) return;
      bubble(body, (via || "p2p") + " · in");
      if (autoReply) {
        localAnswer(body).then(function (ans) {
          if (!ans) return;
          bubble(ans, "AKSI · reply");
          sendAll({ type: "reply", text: ans, ts: now() });
        });
      }
      return;
    }
    if (msg.type === "reply") bubble(text(msg.text), (via || "p2p") + " · reply");
  }

  function stopHb() { if (hbTimer) clearInterval(hbTimer); hbTimer = null; }
  function startHb() {
    stopHb();
    lastPong = now();
    hbTimer = setInterval(function () {
      if (!dataOpen()) return;
      sendPeer({ type: "ping", t: now() });
      if (lastPong && now() - lastPong > SILENT_MS) {
        logLine("тишина → переподключение канала");
        try { if (conn) conn.close(); } catch (e) {}
        if (role === "guest") scheduleReconnect("silent");
      }
    }, HB_MS);
  }

  function clearReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function scheduleReconnect(reason) {
    if (destroyed || !role) return;
    if (reconnectTimer || connecting) return;
    if (retry >= MAX_RETRY) {
      connecting = false;
      logLine("стоп после " + MAX_RETRY + " попыток. Хост должен быть онлайн с тем же ID.");
      setStatus("Не удалось связаться. Хост открыт? ID точный?");
      paintStatus();
      return;
    }
    retry++;
    var delay = Math.min(12000, 1500 * Math.pow(1.4, retry - 1));
    logLine((reason || "retry") + " через " + Math.round(delay / 1000) + "s (" + retry + "/" + MAX_RETRY + ")");
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      if (destroyed || !role) return;
      if (role === "guest" && roomId) {
        connectGuest(roomId, true).catch(function (e) { logLine(String(e && e.message || e)); });
      } else if (role === "host" && roomId) {
        ensureHost().catch(function () {});
      }
    }, delay);
  }

  function wire(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
    conn = c;
    c.on("open", function () {
      connecting = false;
      retry = 0;
      clearReconnect();
      lastPong = now();
      logLine("data channel OPEN");
      bubble("Канал установлен (DTLS / WebRTC).", "sys");
      startHb();
      sendPeer({ type: "hello", text: "AKSI P2P " + VER, ts: now() });
      paintStatus();
    });
    c.on("data", function (d) { onData(d, "peer"); });
    c.on("close", function () {
      if (conn === c) conn = null;
      stopHb();
      logLine("data channel closed");
      paintStatus();
      if (!destroyed && role === "guest") scheduleReconnect("channel-close");
    });
    c.on("error", function (err) {
      logLine("channel error: " + (err && err.message || err));
    });
  }

  function loadPeerJS() {
    return new Promise(function (resolve, reject) {
      if (global.Peer) return resolve(global.Peer);
      var s = document.createElement("script");
      s.src = PEERJS_CDN;
      s.async = true;
      s.onload = function () {
        if (global.Peer) resolve(global.Peer);
        else reject(new Error("PeerJS not defined"));
      };
      s.onerror = function () { reject(new Error("PeerJS CDN failed")); };
      document.head.appendChild(s);
    });
  }

  function softDestroyConn() {
    stopHb();
    if (conn) { try { conn.close(); } catch (e) {} conn = null; }
  }

  function destroyPeer() {
    softDestroyConn();
    clearReconnect();
    peerReady = false;
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  }

  function attachPeerHandlers() {
    if (!peer) return;
    peer.on("connection", function (c) {
      logLine("входящее соединение");
      wire(c);
    });
    peer.on("disconnected", function () {
      logLine("signaling disconnected → reconnect()");
      if (destroyed) return;
      try { peer.reconnect(); } catch (e) { scheduleReconnect("signal"); }
    });
    peer.on("close", function () {
      logLine("peer closed");
      peerReady = false;
      if (!destroyed) scheduleReconnect("peer-close");
    });
    peer.on("error", function (err) {
      var t = err && err.type ? err.type : "";
      var msg = err && err.message ? err.message : String(err);
      logLine("peer error: " + (t || msg));
      if (t === "peer-unavailable") {
        connecting = false;
        paintStatus();
        if (role === "guest") {
          logLine("хост не найден — он должен нажать «Создать зал» и не закрывать вкладку");
          scheduleReconnect("peer-unavailable");
        }
        return;
      }
      if (t === "unavailable-id") {
        if (role === "host") {
          logLine("ID занят — новый зал");
          createRoom().catch(function () {});
        }
        return;
      }
      if (t === "network" || t === "server-error" || t === "socket-error") scheduleReconnect(t);
    });
  }

  function makePeer(preferredId) {
    return loadPeerJS().then(function (PeerCtor) {
      return new Promise(function (resolve, reject) {
        if (peer) { try { peer.destroy(); } catch (e) {} peer = null; peerReady = false; }
        softDestroyConn();
        var opts = {
          debug: 0,
          config: iceConfig(),
          host: "0.peerjs.com",
          port: 443,
          path: "/",
          secure: true,
          pingInterval: 8000
        };
        var p;
        try {
          p = preferredId ? new PeerCtor(preferredId, opts) : new PeerCtor(opts);
        } catch (e) { reject(e); return; }
        peer = p;
        var settled = false;
        var timer = setTimeout(function () {
          if (!settled) { settled = true; reject(new Error("signaling timeout 20s")); }
        }, 20000);
        p.on("open", function (id) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          peerReady = true;
          attachPeerHandlers();
          logLine("signaling OK · id=" + id);
          resolve(id);
        });
        p.on("error", function (err) {
          if (settled) return;
          if (err && err.type === "unavailable-id") {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
      });
    });
  }

  function randomRoomId() {
    return "aksi-" + Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
  }

  function createRoom() {
    destroyed = false;
    role = "host";
    retry = 0;
    connecting = false;
    clearReconnect();
    roomId = randomRoomId();
    openBus(roomId);
    setStatus("Создаём зал…");
    paintStatus();
    return makePeer(roomId).then(function (id) {
      roomId = id || roomId;
      openBus(roomId);
      if ($("p2pRoomId")) $("p2pRoomId").textContent = roomId;
      setStatus("Зал готов. Скопируйте ID гостю. Не закрывайте вкладку.");
      bubble("Зал: " + roomId + "\nДержите эту вкладку открытой. Гость вводит ID и жмёт Войти.", "sys");
      logLine("host room " + roomId);
      paintStatus();
      return roomId;
    }).catch(function (e) {
      logLine("host PeerJS fail: " + (e && e.message || e));
      setStatus("PeerJS недоступен · локальные вкладки OK · ID: " + roomId);
      paintStatus();
      return roomId;
    });
  }

  function ensureHost() {
    if (destroyed || role !== "host" || !roomId) return Promise.reject(new Error("not host"));
    if (peer && peerReady && peer.id) {
      try { if (peer.disconnected) peer.reconnect(); } catch (e) {}
      return Promise.resolve(roomId);
    }
    return makePeer(roomId).then(function (id) {
      roomId = id || roomId;
      openBus(roomId);
      paintStatus();
      return roomId;
    });
  }

  function connectGuest(id, isRetry) {
    id = text(id);
    if (!id) return Promise.reject(new Error("пустой ID"));
    destroyed = false;
    role = "guest";
    roomId = id;
    if (!isRetry) retry = 0;
    clearReconnect();
    connecting = true;
    openBus(id);
    setStatus("Подключение к «" + id + "»…");
    paintStatus();

    return makePeer().then(function () {
      return new Promise(function (resolve, reject) {
        if (!peer) { reject(new Error("no peer")); return; }
        var c = peer.connect(id, { reliable: true, serialization: "json", metadata: { aksi: VER } });
        wire(c);
        var timer = setTimeout(function () {
          if (!c.open) {
            try { c.close(); } catch (e) {}
            connecting = false;
            reject(new Error("Таймаут — хост оффлайн, неверный ID или NAT"));
          }
        }, CONNECT_WAIT);
        c.on("open", function () {
          clearTimeout(timer);
          connecting = false;
          retry = 0;
          resolve(id);
        });
      });
    }).then(function (rid) {
      setStatus("Связь установлена");
      paintStatus();
      return rid;
    }).catch(function (e) {
      connecting = false;
      logLine(String(e && e.message || e));
      paintStatus();
      scheduleReconnect("guest-fail");
      return Promise.reject(e);
    });
  }

  function sendChat(value) {
    var message = text(value).slice(0, MAX_TEXT);
    if (!message) return false;
    if (!anyLink()) {
      setStatus("Нет канала — создайте зал или войдите");
      return false;
    }
    bubble(message, "вы", true);
    var ok = sendAll({ type: "chat", text: message, ts: now() });
    if (!dataOpen() && localOpen()) logLine("отправлено по локальному каналу");
    return ok || localOpen();
  }

  function disconnect() {
    destroyed = true;
    role = null;
    roomId = null;
    retry = 0;
    connecting = false;
    clearReconnect();
    destroyPeer();
    closeBus();
    setStatus("P2P offline");
    paintStatus();
    logLine("disconnect");
  }

  function copyRoom() {
    var id = roomId || ($("p2pRoomId") && $("p2pRoomId").textContent) || "";
    id = text(id);
    if (!id || id === "—") return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(function () {
          logLine("copied " + id);
          setStatus("ID скопирован");
        });
      }
    } catch (e) {}
  }

  function ensureBar() {
    if ($("p2pBar")) return;
    var bar = document.createElement("div");
    bar.id = "p2pBar";
    bar.style.cssText = "display:none;align-items:center;gap:8px;padding:8px 12px;background:rgba(16,24,40,.95);border-bottom:1px solid rgba(52,211,153,.25);font-size:12px;position:sticky;top:0;z-index:45";
    bar.innerHTML =
      '<span style="width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399"></span>' +
      '<span>Прямая связь: <b id="p2pBadge" style="color:#7a738f">offline</b></span>' +
      '<span>ping <b id="p2pPing">—</b></span>' +
      '<span id="p2pRole" style="margin-left:auto;opacity:.8">—</span>';
    var header = document.querySelector("header");
    if (header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
  }

  function mount(sel) {
    ensureBar();
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;

    root.innerHTML =
      '<div class="card">' +
      "<h2>P2P · v" + VER + "</h2>" +
      '<p class="muted">Хост создаёт зал и <b>не закрывает вкладку</b>. Гость вводит ID. Локальные вкладки работают сразу.</p>' +
      '<div id="p2pStatus" class="muted" style="margin:12px 0;padding:10px;border-radius:12px;background:rgba(0,0,0,.28)">Нет комнаты</div>' +
      '<p class="muted">Room ID: <code id="p2pRoomId" style="user-select:all">—</code></p>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="p2pCreate">Создать зал</button>' +
      '<button type="button" class="btn" id="p2pCopy">Копировать ID</button>' +
      '<button type="button" class="btn" id="p2pJoin">Войти</button>' +
      '<button type="button" class="btn" id="p2pLeave">Выйти</button>' +
      "</div>" +
      '<input id="p2pJoinId" placeholder="ID зала от хоста" style="margin-top:10px" autocomplete="off" autocapitalize="off">' +
      '<label class="muted" style="display:flex;gap:8px;align-items:center;margin-top:10px">' +
      '<input type="checkbox" id="p2pAuto" checked> Auto-reply (локальный ИИ отвечает партнёру)' +
      "</label>" +
      '<p class="muted" style="margin-top:10px;font-size:12px">Оба online · один ID · хост не уходит со страницы</p>' +
      "</div>" +
      '<div class="card" style="margin-top:10px">' +
      '<div id="p2pThread" style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow:auto;min-height:80px"></div>' +
      '<div class="row" style="margin-top:10px">' +
      '<input id="p2pInput" placeholder="Сообщение в P2P-чат…" style="flex:1">' +
      '<button type="button" class="btn p" id="p2pSend">→</button>' +
      "</div>" +
      '<pre id="p2pLog" class="out" style="max-height:140px;font-size:11px;margin-top:10px">лог…</pre>' +
      "</div>";

    $("p2pCreate").onclick = function () {
      createRoom().then(function () { copyRoom(); }).catch(function (e) {
        logLine(String(e && e.message || e));
      });
    };
    $("p2pCopy").onclick = copyRoom;
    $("p2pJoin").onclick = function () {
      var id = text(($("p2pJoinId") && $("p2pJoinId").value) || "");
      if (!id) id = text(prompt("ID зала:") || "");
      if (!id) return;
      if ($("p2pJoinId")) $("p2pJoinId").value = id;
      connectGuest(id).catch(function (e) { logLine(String(e && e.message || e)); });
    };
    $("p2pLeave").onclick = disconnect;
    $("p2pSend").onclick = function () {
      var i = $("p2pInput");
      if (!i) return;
      var v = i.value;
      i.value = "";
      sendChat(v);
    };
    $("p2pInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("p2pSend").click(); }
    });
    $("p2pAuto").onchange = function () { autoReply = !!this.checked; };

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && role === "host" && peer) {
        try { if (peer.disconnected) peer.reconnect(); } catch (e) {}
      }
    });

    paintStatus();
    bubble("P2P v" + VER + " готов. Создайте зал на одном устройстве, войдите с другого.", "sys");
  }

  global.AKSI_P2P = {
    version: VER,
    createRoom: createRoom,
    joinRoom: connectGuest,
    connectGuest: connectGuest,
    leave: disconnect,
    disconnect: disconnect,
    sendChat: sendChat,
    isLinked: dataOpen,
    isLocal: localOpen,
    getPing: function () { return rtt; },
    getRoomId: function () { return roomId; },
    mount: mount
  };
})(typeof window !== "undefined" ? window : this);
