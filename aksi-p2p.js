/**
 * AKSI P2P Overlay v1.1 — PeerJS / WebRTC
 * Room · duplex chat · Core.query intercept · auto-reply · ping · encrypted bar
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "1.1.0-p2p";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var peer = null;
  var conn = null;
  var role = null;
  var roomId = null;
  var lastPingMs = null;
  var pingTimer = null;
  var statusEl = null;
  var logEl = null;
  var hooked = false;
  var oneHooked = false;
  var origQuery = null;
  var autoReply = true;
  var msgCount = 0;

  function $(id) { return document.getElementById(id); }

  function logLine(text) {
    logEl = logEl || $("p2pLog");
    if (!logEl) return;
    var t = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    logEl.textContent = "[" + t + "] " + text + "\n" + (logEl.textContent || "").slice(0, 1200);
  }

  function setStatus(html) {
    statusEl = statusEl || $("p2pStatus");
    if (statusEl) statusEl.innerHTML = html;
    var bar = $("p2pBar");
    if (bar) {
      if (conn && conn.open) {
        bar.style.display = "flex";
        var ping = $("p2pPing");
        if (ping) ping.textContent = lastPingMs != null ? lastPingMs + " ms" : "…";
        var roleEl = $("p2pRole");
        if (roleEl) roleEl.textContent = role === "host" ? "хост" : "гость";
      } else {
        bar.style.display = "none";
      }
    }
    var badge = $("p2pLinkBadge");
    if (badge) {
      if (conn && conn.open) {
        badge.textContent = "ЗАШИФРОВАНО · " + (lastPingMs != null ? lastPingMs + " ms" : "…");
        badge.style.color = "#34d399";
      } else if (role === "host" && roomId) {
        badge.textContent = "ждём партнёра…";
        badge.style.color = "#a78bfa";
      } else {
        badge.textContent = "offline";
        badge.style.color = "#7a738f";
      }
    }
  }

  function bubbleP2P(text, meta, asMe) {
    var th = $("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (asMe ? "me" : "ai");
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
      logLine("send fail: " + (e && e.message || e));
      return false;
    }
  }

  function localAnswer(q) {
    q = String(q || "").trim();
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

    var low = q.toLowerCase();
    if (/привет|hello|hi/.test(low)) return Promise.resolve("Привет по P2P-каналу. АКСИ на связи.");
    if (/кто ты/.test(low)) return Promise.resolve("АКСИ · P2P peer · local-first.");
    return Promise.resolve("Получила: «" + q.slice(0, 120) + "». Локальный ответ недоступен — открой чат на устройстве с Core.");
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

    if (msg.type === "query" || msg.type === "chat") {
      msgCount++;
      var text = String(msg.text || "");
      bubbleP2P("↗ " + text, "p2p · peer · in");
      logLine("in " + msg.type + ": " + text.slice(0, 80));

      if (autoReply && text) {
        localAnswer(text).then(function (ans) {
          if (!ans) return;
          bubbleP2P(ans, "p2p · local reply → peer");
          sendRaw({ type: "reply", text: ans, ts: Date.now(), ref: msg.ts || null });
          logLine("out reply: " + ans.slice(0, 80));
        });
      }
      return;
    }

    if (msg.type === "reply") {
      msgCount++;
      bubbleP2P(String(msg.text || ""), "p2p · peer reply");
      logLine("in reply: " + String(msg.text || "").slice(0, 80));
      return;
    }

    if (msg.type === "sys") {
      logLine("sys: " + (msg.text || ""));
      setStatus(statusHtml());
    }
  }

  function wireConn(c) {
    conn = c;
    c.on("open", function () {
      setStatus(statusHtml());
      startPing();
      bubbleP2P("Прямая связь установлена · DTLS (WebRTC) · auto-reply " + (autoReply ? "ON" : "OFF"), "p2p · link");
      logLine("connected as " + role);
      sendRaw({ type: "sys", text: "hello from " + (role || "peer"), ts: Date.now() });
    });
    c.on("data", handleIncoming);
    c.on("close", function () {
      conn = null;
      stopPing();
      lastPingMs = null;
      setStatus('<span style="color:#f87171">Связь разорвана</span>');
      logLine("disconnected");
    });
    c.on("error", function (err) {
      setStatus('<span style="color:#f87171">Ошибка: ' + (err && err.message || err) + "</span>");
      logLine("err " + (err && err.message || err));
    });
  }

  function statusHtml() {
    if (conn && conn.open) {
      var ping = lastPingMs != null ? lastPingMs + " ms" : "измерение…";
      return '<span style="color:#34d399;font-weight:700">● Прямая связь: ЗАШИФРОВАНО</span>' +
        " · ping <b>" + ping + "</b>" +
        (roomId ? " · <code style=\"user-select:all\">" + roomId + "</code>" : "") +
        " · " + (role || "") +
        " · msg " + msgCount;
    }
    if (role === "host" && roomId) {
      return 'Зал создан · ID: <code style="user-select:all;font-size:14px">' + roomId + "</code> · ждём партнёра…";
    }
    return "P2P offline · PeerJS signaling";
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
    return "aksi-" + Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
  }

  function createRoom() {
    setStatus("Подключение PeerJS…");
    logLine("create room…");
    return loadPeerJS().then(function (Peer) {
      if (peer) {
        try { peer.destroy(); } catch (e) {}
      }
      roomId = makeRoomId();
      role = "host";
      peer = new Peer(roomId, { debug: 0 });
      return new Promise(function (resolve, reject) {
        var done = false;
        peer.on("open", function (id) {
          roomId = id;
          setStatus(statusHtml());
          if ($("p2pRoomId")) $("p2pRoomId").textContent = id;
          if ($("p2pJoinId")) $("p2pJoinId").value = id;
          logLine("host id " + id);
          done = true;
          resolve(id);
        });
        peer.on("connection", function (c) {
          if (conn && conn.open) {
            try { c.close(); } catch (e) {}
            return;
          }
          wireConn(c);
        });
        peer.on("error", function (err) {
          setStatus('<span style="color:#f87171">' + (err.type || err.message || err) + "</span>");
          logLine("peer err " + (err.type || err.message));
          if (!done) reject(err);
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
    logLine("join " + id);
    return loadPeerJS().then(function (Peer) {
      if (peer) {
        try { peer.destroy(); } catch (e) {}
      }
      role = "guest";
      roomId = id;
      peer = new Peer(undefined, { debug: 0 });
      return new Promise(function (resolve, reject) {
        peer.on("open", function () {
          var c = peer.connect(id, { reliable: true });
          wireConn(c);
          c.on("open", function () { resolve(id); });
        });
        peer.on("error", function (err) {
          setStatus('<span style="color:#f87171">' + (err.type || err.message || err) + "</span>");
          logLine("join err " + (err.type || err.message));
          reject(err);
        });
      });
    });
  }

  function broadcastQuery(text) {
    if (!conn || !conn.open) return false;
    msgCount++;
    logLine("out query: " + String(text).slice(0, 80));
    return sendRaw({ type: "query", text: String(text).slice(0, 4000), ts: Date.now() });
  }

  function broadcastChat(text) {
    if (!conn || !conn.open) return false;
    msgCount++;
    logLine("out chat: " + String(text).slice(0, 80));
    return sendRaw({ type: "chat", text: String(text).slice(0, 4000), ts: Date.now() });
  }

  function broadcastReply(text) {
    if (!conn || !conn.open) return false;
    return sendRaw({ type: "reply", text: String(text).slice(0, 4000), ts: Date.now() });
  }

  function hookCore() {
    if (hooked) return;
    var core = global.AKSI_CORE || global.AksiCore;
    if (!core || typeof core.query !== "function") return;
    origQuery = core.query.bind(core);
    core.query = function (prompt, opts) {
      var text = String(prompt == null ? "" : prompt);
      if (conn && conn.open && text) broadcastQuery(text);
      return origQuery(prompt, opts).then(function (res) {
        if (conn && conn.open && res && res.text) {
          broadcastReply(res.text);
        }
        return res;
      });
    };
    hooked = true;
    logLine("Core.query hooked");
  }

  function hookOneAsk() {
    if (oneHooked) return;
    var one = global.AKSI_ONE;
    if (!one || typeof one.ask !== "function") return;
    var origAsk = one.ask.bind(one);
    one.ask = function (q) {
      if (conn && conn.open && q) broadcastChat(String(q));
      return origAsk(q);
    };
    if (typeof one.think === "function" && !one._p2pThinkHook) {
      var origThink = one.think.bind(one);
      one.think = function (q) {
        return origThink(q).then(function (res) {
          if (conn && conn.open && res && res.text) {
            broadcastReply(res.text);
          }
          return res;
        });
      };
      one._p2pThinkHook = true;
    }
    oneHooked = true;
    one._p2pHooked = true;
    logLine("ONE.ask/think hooked");
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
    if ($("p2pRoomId")) $("p2pRoomId").textContent = "—";
    logLine("manual disconnect");
  }

  function copyId() {
    var id = roomId || ($("p2pRoomId") && $("p2pRoomId").textContent) || "";
    if (!id || id === "—") return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(function () {
          logLine("copied " + id);
          setStatus(statusHtml() + ' <span style="color:#a78bfa">· скопировано</span>');
        });
      }
    } catch (e) {}
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card">' +
      "<h2>P2P Overlay · WebRTC <span id=\"p2pLinkBadge\" style=\"font-size:11px;font-weight:600;margin-left:8px;color:#7a738f\">offline</span></h2>" +
      '<p class="muted">Прямой канал браузер↔браузер (PeerJS). Чат и <code>Core.query</code> зеркалируются. Ответ партнёру — локальный ONE/Core (auto-reply).</p>' +
      '<div id="p2pStatus" class="muted" style="margin:12px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.28);line-height:1.5">P2P offline</div>' +
      '<p class="muted" style="margin-bottom:8px">Room ID: <code id="p2pRoomId" style="user-select:all;font-size:13px">—</code></p>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="p2pCreate">Создать Зал</button>' +
      '<button type="button" class="btn" id="p2pCopy">Копировать ID</button>' +
      '<button type="button" class="btn" id="p2pJoin">Присоединиться</button>' +
      '<button type="button" class="btn" id="p2pDisc">Отключить</button>' +
      "</div>" +
      '<input id="p2pJoinId" placeholder="ID зала партнёра" style="margin-top:12px" autocomplete="off">' +
      '<label class="muted" style="display:flex;gap:8px;align-items:center;margin-top:12px;cursor:pointer">' +
      '<input type="checkbox" id="p2pAuto" checked> Auto-reply (отвечать на сообщения партнёра локальным ИИ)' +
      "</label>" +
      '<p class="muted" style="margin-top:12px;font-size:12px">' +
      "1) Хост: <b>Создать Зал</b> → Копировать ID<br>" +
      "2) Гость: вставить ID → <b>Присоединиться</b><br>" +
      "3) Пишите в общий чат — текст и ответы идут по DTLS" +
      "</p>" +
      '<pre id="p2pLog" class="out" style="max-height:140px;font-size:11px;margin-top:10px">лог…</pre>' +
      "</div>";

    logEl = $("p2pLog");
    statusEl = $("p2pStatus");

    $("p2pCreate").onclick = function () {
      createRoom().then(function (id) {
        if ($("p2pRoomId")) $("p2pRoomId").textContent = id;
        copyId();
      }).catch(function () {});
    };
    $("p2pCopy").onclick = function () { copyId(); };
    $("p2pJoin").onclick = function () {
      var id = ($("p2pJoinId") && $("p2pJoinId").value) || prompt("Room ID:");
      if (id) joinRoom(String(id).trim()).catch(function () {});
    };
    $("p2pDisc").onclick = function () { disconnect(); };
    var auto = $("p2pAuto");
    if (auto) {
      auto.checked = autoReply;
      auto.onchange = function () {
        autoReply = !!auto.checked;
        logLine("auto-reply " + (autoReply ? "ON" : "OFF"));
      };
    }

    if (roomId && $("p2pRoomId")) $("p2pRoomId").textContent = roomId;
    setStatus(statusHtml());
  }

  function ensureBar() {
    if ($("p2pBar")) return;
    var bar = document.createElement("div");
    bar.id = "p2pBar";
    bar.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;z-index:100;justify-content:center;align-items:center;gap:12px;padding:7px 14px;background:rgba(16,185,129,.18);border-bottom:1px solid rgba(52,211,153,.4);font-size:12px;color:#a7f3d0;backdrop-filter:blur(10px)";
    bar.innerHTML =
      '<span>● Прямая связь: <b>ЗАШИФРОВАНО</b></span>' +
      '<span>ping <b id="p2pPing">—</b></span>' +
      '<span id="p2pRole" style="opacity:.8">—</span>';
    document.body.appendChild(bar);
  }

  function boot() {
    ensureBar();
    setTimeout(hookCore, 500);
    setTimeout(hookOneAsk, 700);
    setTimeout(hookCore, 2500);
    setTimeout(hookOneAsk, 2500);
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
    broadcastReply: broadcastReply,
    mount: mount,
    isLinked: function () { return !!(conn && conn.open); },
    getPing: function () { return lastPingMs; },
    getRoomId: function () { return roomId; },
    setAutoReply: function (v) { autoReply = !!v; }
  };
})(typeof window !== "undefined" ? window : this);
