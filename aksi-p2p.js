/**
 * AKSI P2P v4.2 — stable WebRTC + TURN loader
 * STUN/TURN: static AKSI_P2P_TURN or fetch AKSI_P2P_TURN_URL
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";

  var VER = "4.2.0-turn";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var ICE_FALLBACK = [
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
  var iceCache = null;
  var iceReady = null;
  var PING_EVERY = 4000;
  var PONG_DEAD = 45000;
  var CONNECT_WAIT = 20000;
  var MAX_TEXT = 4000;

  var peer = null, conn = null;
  var role = null, roomId = null, remotePeerId = null;
  var reconnectTimer = null, heartbeatTimer = null;
  var lastPong = 0, retry = 0;
  var destroyed = false, autoReply = true, connecting = false;
  var logEl = null, statusEl = null;

  function $(id) { return document.getElementById(id); }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function now() { return Date.now(); }

  function normalizeIce(entry) {
    if (!entry) return null;
    if (Array.isArray(entry)) return entry.filter(function (x) { return x && x.urls; });
    if (entry.iceServers) return normalizeIce(entry.iceServers);
    if (entry.urls) return [entry];
    return null;
  }

  function iceServers() {
    if (iceCache && iceCache.length) return iceCache.slice();
    var list = ICE_FALLBACK.slice();
    var extra = global.AKSI_P2P_TURN;
    var own = normalizeIce(extra);
    if (own && own.length) list = own.concat(list);
    return list;
  }

  function loadIceServers() {
    if (iceReady) return iceReady;
    iceReady = new Promise(function (resolve) {
      var url = global.AKSI_P2P_TURN_URL;
      var staticIce = normalizeIce(global.AKSI_P2P_TURN);
      if (staticIce && staticIce.length) {
        iceCache = staticIce.concat(ICE_FALLBACK);
        logLine("TURN: static config (" + staticIce.length + ")");
        resolve(iceCache);
        return;
      }
      if (!url) {
        iceCache = ICE_FALLBACK.slice();
        resolve(iceCache);
        return;
      }
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
      fetch(String(url), { signal: ctrl && ctrl.signal, cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          clearTimeout(t);
          var own = normalizeIce(data);
          if (own && own.length) {
            iceCache = own.concat(ICE_FALLBACK);
            logLine("TURN: API ok (" + own.length + " servers)");
          } else {
            iceCache = ICE_FALLBACK.slice();
            logLine("TURN: API empty → fallback");
          }
          resolve(iceCache);
        })
        .catch(function () {
          clearTimeout(t);
          iceCache = ICE_FALLBACK.slice();
          logLine("TURN: API fail → fallback");
          resolve(iceCache);
        });
    });
    return iceReady;
  }

  function logLine(v) {
    logEl = logEl || $("p2pLog");
    if (!logEl) return;
    logEl.textContent = ("[" + new Date().toLocaleTimeString("ru-RU") + "] " + text(v) + "\n" + (logEl.textContent || "")).slice(0, 5000);
  }

  function setStatus(v) {
    statusEl = statusEl || $("p2pStatus");
    if (statusEl) statusEl.innerHTML = text(v);
    var b = $("p2pLinkBadge");
    var online = !!(conn && conn.open);
    if (b) {
      if (online) { b.textContent = "ЗАШИФРОВАНО"; b.style.color = "#34d399"; }
      else if (role && !destroyed) { b.textContent = "переподключение…"; b.style.color = "#fbbf24"; }
      else { b.textContent = "offline"; b.style.color = "#7a738f"; }
    }
    var bar = $("p2pBar");
    if (bar) {
      bar.style.display = online || (role && !destroyed) ? "flex" : "none";
      var p = $("p2pPing");
      if (p && online) p.textContent = (typeof bar._rtt === "number" ? bar._rtt + " ms" : "…");
      var r = $("p2pRole");
      if (r) r.textContent = role === "host" ? "хост" : (role === "guest" ? "гость" : "—");
    }
  }

  function bubble(msg, meta, mine) {
    var th = $("thread") || $("p2pThread");
    if (!th) return;
    var row = document.createElement("div");
    row.className = "msg " + (mine ? "me" : "ai");
    var bub = document.createElement("div");
    bub.className = "bub";
    bub.textContent = text(msg);
    var st = document.createElement("div");
    st.className = "meta";
    st.textContent = meta || (mine ? "вы" : "p2p");
    bub.appendChild(st);
    row.appendChild(bub);
    th.appendChild(row);
    th.scrollTop = th.scrollHeight;
  }

  function loadPeerJS() {
    return new Promise(function (resolve, reject) {
      if (global.Peer) return resolve(global.Peer);
      var s = document.createElement("script");
      s.src = PEERJS_CDN;
      s.async = true;
      s.onload = function () { global.Peer ? resolve(global.Peer) : reject(new Error("PeerJS unavailable")); };
      s.onerror = function () { reject(new Error("PeerJS CDN failed")); };
      document.head.appendChild(s);
    });
  }

  function send(obj) {
    if (!conn || !conn.open) return false;
    try {
      conn.send(typeof obj === "string" ? obj : JSON.stringify(obj));
      return true;
    } catch (e) {
      logLine("send fail: " + (e && e.message || e));
      return false;
    }
  }

  function localAnswer(q) {
    q = text(q);
    if (!q) return Promise.resolve(null);
    if (global.AKSI_ONE && typeof global.AKSI_ONE.think === "function") {
      return global.AKSI_ONE.think(q).then(function (r) {
        return r && r.text ? String(r.text) : null;
      }).catch(function () { return null; });
    }
    var core = global.AKSI_CORE || global.AksiCore;
    if (core && typeof core.query === "function") {
      return Promise.race([
        core.query(q),
        new Promise(function (r) { setTimeout(function () { r(null); }, 8000); })
      ]).then(function (res) {
        return res && res.text ? String(res.text) : null;
      }).catch(function () { return null; });
    }
    if (/привет|hello|hi/i.test(q)) return Promise.resolve("Привет по P2P. АКСИ на связи.");
    return Promise.resolve("Получено: «" + q.slice(0, 100) + "»");
  }

  function handle(raw) {
    var msg;
    try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (e) { bubble(String(raw), "p2p · raw"); return; }
    if (!msg || !msg.type) return;

    if (msg.type === "ping") { send({ type: "pong", t: msg.t, t1: now() }); return; }
    if (msg.type === "pong") {
      lastPong = now();
      if (msg.t) {
        var rtt = Math.max(0, now() - msg.t);
        var bar = $("p2pBar");
        if (bar) bar._rtt = rtt;
        var p = $("p2pPing");
        if (p) p.textContent = rtt + " ms";
      }
      setStatus("● Прямая связь: ЗАШИФРОВАНО · " + (msg.t ? Math.max(0, now() - msg.t) + " ms" : "ok"));
      return;
    }
    if (msg.type === "hello" || msg.type === "sys") {
      logLine("peer: " + (msg.text || msg.type));
      lastPong = now();
      return;
    }
    if (msg.type === "chat" || msg.type === "query") {
      var incoming = text(msg.text).slice(0, MAX_TEXT);
      if (!incoming) return;
      bubble("↗ " + incoming, "p2p · peer");
      logLine("in: " + incoming.slice(0, 80));
      if (autoReply) {
        localAnswer(incoming).then(function (ans) {
          if (!ans) return;
          bubble(ans, "p2p · local → peer");
          send({ type: "reply", text: ans, ts: now() });
        });
      }
      return;
    }
    if (msg.type === "reply") { bubble(text(msg.text), "p2p · reply"); return; }
  }

  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function startHeartbeat() {
    stopHeartbeat();
    lastPong = now();
    heartbeatTimer = setInterval(function () {
      if (!conn || !conn.open) return;
      send({ type: "ping", t: now() });
      if (lastPong && now() - lastPong > PONG_DEAD) {
        logLine("no pong " + Math.round((now() - lastPong) / 1000) + "s → soft reconnect");
        try { conn.close(); } catch (e) {}
      }
    }, PING_EVERY);
  }

  function clearReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function scheduleReconnect(reason) {
    if (destroyed || !role) return;
    if (reconnectTimer) return;
    if (connecting) return;
    var delay = Math.min(20000, Math.round(800 * Math.pow(1.4, Math.min(retry, 8))));
    retry++;
    logLine((reason || "reconnect") + " in " + Math.ceil(delay / 1000) + "s (try " + retry + ")");
    setStatus("Восстановление через " + Math.ceil(delay / 1000) + " с…");
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      if (destroyed || !role) return;
      if (role === "guest" && roomId) {
        connectGuest(roomId, true).catch(function () { scheduleReconnect("guest-fail"); });
      } else if (role === "host" && roomId) {
        ensureHostListening().catch(function () { scheduleReconnect("host-fail"); });
      }
    }, delay);
  }

  function wire(c) {
    if (conn && conn !== c && conn.open) { try { c.close(); } catch (e) {} return; }
    if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
    conn = c;
    remotePeerId = text(c.peer) || remotePeerId;

    c.on("open", function () {
      connecting = false;
      retry = 0;
      clearReconnect();
      lastPong = now();
      remotePeerId = text(c.peer) || remotePeerId;
      setStatus("● Прямая связь: ЗАШИФРОВАНО");
      startHeartbeat();
      send({ type: "hello", text: "hi from " + (role || "peer"), ts: now() });
      bubble("Прямая связь установлена (DTLS).", "p2p · link");
      logLine("connected → " + (remotePeerId || "?"));
    });
    c.on("data", handle);
    c.on("close", function () {
      if (conn === c) conn = null;
      stopHeartbeat();
      logLine("data channel closed");
      if (!destroyed) scheduleReconnect("channel-close");
      setStatus(role ? "Канал закрыт · переподключение…" : "offline");
    });
    c.on("error", function (e) {
      logLine("data err: " + (e && e.message || e));
      if (!c.open && !destroyed) scheduleReconnect("channel-error");
    });
  }

  function destroyPeerHard() {
    clearReconnect();
    stopHeartbeat();
    connecting = false;
    if (conn) { try { conn.close(); } catch (e) {} conn = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  }

  function attachPeerEvents() {
    if (!peer) return;
    peer.on("connection", function (c) { logLine("incoming connection"); wire(c); });
    peer.on("disconnected", function () {
      logLine("signaling disconnected");
      if (destroyed) return;
      try { peer.reconnect(); } catch (e) { scheduleReconnect("signal-disc"); }
    });
    peer.on("close", function () {
      logLine("peer closed");
      peer = null;
      if (!destroyed && role) scheduleReconnect("peer-close");
    });
    peer.on("error", function (e) {
      var t = e && (e.type || e.message) || e;
      logLine("peer error: " + t);
      if (t === "peer-unavailable" || t === "network") {
        if (!destroyed) scheduleReconnect(String(t));
        return;
      }
      if (t === "unavailable-id" && role === "host") {
        roomId = null;
        createRoom().catch(function () { scheduleReconnect("new-id"); });
        return;
      }
      if (!destroyed) scheduleReconnect(String(t));
    });
  }

  function makePeer(preferredId) {
    return loadPeerJS().then(function (Peer) {
      return loadIceServers().then(function () {
        return new Promise(function (resolve, reject) {
          var opts = {
            debug: 0,
            config: {
              iceServers: iceServers(),
              iceTransportPolicy: "all",
              sdpSemantics: "unified-plan"
            }
          };
          var p;
          try {
            p = preferredId ? new Peer(preferredId, opts) : new Peer(opts);
          } catch (e) {
            reject(e);
            return;
          }
          peer = p;
          var settled = false;
          var timer = setTimeout(function () {
            if (settled) return;
            settled = true;
            reject(new Error("Peer open timeout"));
          }, CONNECT_WAIT);
          p.on("open", function (id) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            attachPeerEvents();
            resolve(id);
          });
          p.on("error", function (e) {
            if (settled) return;
            if (e && e.type === "unavailable-id") {
              settled = true;
              clearTimeout(timer);
              reject(e);
            }
          });
        });
      });
    });
  }

  function makeRoomId() {
    return "aksi-" + Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
  }

  function createRoom() {
    destroyed = false;
    role = "host";
    retry = 0;
    clearReconnect();
    destroyPeerHard();
    setStatus("Создание зала…");
    var id = makeRoomId();
    roomId = id;
    return makePeer(id).then(function (openId) {
      roomId = openId || id;
      if ($("p2pRoomId")) $("p2pRoomId").textContent = roomId;
      if ($("p2pJoinId")) $("p2pJoinId").value = roomId;
      setStatus("Зал создан · ждём партнёра…");
      logLine("host room " + roomId);
      return roomId;
    });
  }

  function ensureHostListening() {
    if (destroyed || role !== "host" || !roomId) return Promise.reject(new Error("no host"));
    if (peer && !peer.destroyed && peer.id) {
      setStatus("Зал активен · ждём партнёра…");
      return Promise.resolve(roomId);
    }
    setStatus("Восстановление зала…");
    destroyPeerHard();
    return makePeer(roomId).then(function (id) {
      roomId = id || roomId;
      if ($("p2pRoomId")) $("p2pRoomId").textContent = roomId;
      setStatus("Зал восстановлен · ждём партнёра…");
      logLine("host restored " + roomId);
      return roomId;
    });
  }

  function connectGuest(id, isRetry) {
    id = text(id);
    if (!id) return Promise.reject(new Error("ID пуст"));
    destroyed = false;
    role = "guest";
    roomId = id;
    remotePeerId = id;
    if (!isRetry) retry = 0;
    clearReconnect();
    connecting = true;
    setStatus("Подключение к " + id + "…");
    destroyPeerHard();
    return makePeer().then(function () {
      return new Promise(function (resolve, reject) {
        var c = peer.connect(id, { reliable: true, serialization: "json", metadata: { aksi: true } });
        wire(c);
        var timer = setTimeout(function () {
          if (!c.open) {
            try { c.close(); } catch (e) {}
            connecting = false;
            reject(new Error("Таймаут 20с — проверьте ID и TURN"));
            scheduleReconnect("guest-timeout");
          }
        }, CONNECT_WAIT);
        c.on("open", function () {
          clearTimeout(timer);
          connecting = false;
          retry = 0;
          resolve(id);
        });
      });
    });
  }

  function sendChat(value) {
    var message = text(value).slice(0, MAX_TEXT);
    if (!message) return false;
    if (!conn || !conn.open) {
      setStatus("Нет связи — создайте/присоединитесь к залу");
      return false;
    }
    bubble(message, "вы · p2p", true);
    var ok = send({ type: "chat", text: message, ts: now() });
    logLine("out: " + message.slice(0, 80));
    return ok;
  }

  function disconnect() {
    destroyed = true;
    role = null;
    roomId = null;
    remotePeerId = null;
    retry = 0;
    destroyPeerHard();
    setStatus("P2P offline");
    logLine("manual disconnect");
  }

  function copyRoom() {
    var id = roomId || ($("p2pRoomId") && $("p2pRoomId").textContent) || "";
    id = text(id);
    if (!id || id === "—") return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(function () {
          logLine("copied " + id);
          setStatus("ID скопирован: " + id);
        });
      }
    } catch (e) {}
  }

  function ensureBar() {
    if ($("p2pBar")) return;
    var bar = document.createElement("div");
    bar.id = "p2pBar";
    bar.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;z-index:100;justify-content:center;align-items:center;gap:12px;padding:7px 14px;background:rgba(16,185,129,.16);border-bottom:1px solid rgba(52,211,153,.35);font-size:12px;color:#a7f3d0;backdrop-filter:blur(10px)";
    bar.innerHTML = '<span>● Прямая связь: <b>ЗАШИФРОВАНО</b></span><span>ping <b id="p2pPing">—</b></span><span id="p2pRole">—</span>';
    document.body.appendChild(bar);
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card">' +
      '<h2>P2P · WebRTC <span id="p2pLinkBadge" style="font-size:11px;margin-left:8px;color:#7a738f">offline</span></h2>' +
      '<p class="muted">STUN+TURN. Свой сервер: <code>window.AKSI_P2P_TURN</code> или <code>AKSI_P2P_TURN_URL</code>.</p>' +
      '<div id="p2pStatus" class="muted" style="margin:12px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.28)">P2P offline</div>' +
      '<p class="muted">Room ID: <code id="p2pRoomId" style="user-select:all">—</code></p>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="p2pCreate">Создать Зал</button>' +
      '<button type="button" class="btn" id="p2pCopy">Копировать ID</button>' +
      '<button type="button" class="btn" id="p2pJoin">Присоединиться</button>' +
      '<button type="button" class="btn" id="p2pDisc">Отключить</button>' +
      "</div>" +
      '<input id="p2pJoinId" placeholder="ID зала" style="margin-top:12px" autocomplete="off">' +
      '<div class="row" style="margin-top:10px">' +
      '<input id="p2pMessage" placeholder="Сообщение в P2P-чат…" style="flex:1">' +
      '<button type="button" class="btn p" id="p2pSend">→</button>' +
      "</div>" +
      '<label class="muted" style="display:flex;gap:8px;align-items:center;margin-top:12px;cursor:pointer">' +
      '<input type="checkbox" id="p2pAuto" checked> Auto-reply' +
      "</label>" +
      '<p class="muted" style="margin-top:10px;font-size:12px">Оба онлайн · один ID · TURN на VPS → /turn/</p>' +
      '<pre id="p2pLog" class="out" style="max-height:140px;font-size:11px;margin-top:10px">лог…</pre>' +
      "</div>";

    logEl = $("p2pLog");
    statusEl = $("p2pStatus");

    $("p2pCreate").onclick = function () {
      createRoom().then(function () { copyRoom(); }).catch(function (e) {
        setStatus("Не удалось создать зал");
        logLine(e && e.message || e);
      });
    };
    $("p2pCopy").onclick = copyRoom;
    $("p2pJoin").onclick = function () {
      var id = text(($("p2pJoinId") && $("p2pJoinId").value) || prompt("Room ID:"));
      if (!id) return;
      connectGuest(id).catch(function (e) {
        setStatus("Не удалось подключиться");
        logLine(e && e.message || e);
      });
    };
    $("p2pDisc").onclick = disconnect;
    $("p2pSend").onclick = function () {
      var i = $("p2pMessage");
      if (i && sendChat(i.value)) i.value = "";
    };
    if ($("p2pMessage")) {
      $("p2pMessage").addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          $("p2pSend").click();
        }
      });
    }
    var auto = $("p2pAuto");
    if (auto) {
      auto.checked = autoReply;
      auto.onchange = function () { autoReply = !!auto.checked; };
    }
    if (roomId && $("p2pRoomId")) $("p2pRoomId").textContent = roomId;
    setStatus(conn && conn.open ? "● Прямая связь: ЗАШИФРОВАНО" : "P2P offline");
    loadIceServers();
  }

  function onOnline() {
    if (destroyed || !role) return;
    logLine("browser online");
    if (!(conn && conn.open)) scheduleReconnect("online");
  }
  function onVis() {
    if (document.visibilityState !== "visible") return;
    if (destroyed || !role) return;
    if (conn && conn.open) send({ type: "ping", t: now() });
    else scheduleReconnect("visible");
  }

  function boot() {
    ensureBar();
    try {
      window.addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onVis);
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  global.AKSI_P2P = {
    version: VER,
    createRoom: createRoom,
    joinRoom: connectGuest,
    disconnect: disconnect,
    sendChat: sendChat,
    broadcastChat: sendChat,
    broadcastQuery: sendChat,
    broadcastReply: function (t) { return send({ type: "reply", text: text(t), ts: now() }); },
    mount: mount,
    isLinked: function () { return !!(conn && conn.open); },
    getPing: function () {
      var bar = $("p2pBar");
      return bar && typeof bar._rtt === "number" ? bar._rtt : null;
    },
    getRoomId: function () { return roomId; },
    getRemotePeerId: function () { return remotePeerId; },
    setAutoReply: function (v) { autoReply = !!v; },
    loadIceServers: loadIceServers,
    getIceServers: iceServers
  };
})(typeof window !== "undefined" ? window : this);
