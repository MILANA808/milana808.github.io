/**
 * AKSI Relay Client v1 — AKSI Sovereign Server
 * Rooms + relay when P2P fails · LLM via server proxy (CORS fix)
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (global) {
  "use strict";
  var VER = "1.0.0-relay";
  var ws = null, roomId = null, clientId = null, lastRtt = null, pingTimer = null;
  var handlers = { message: [], status: [], log: [] };

  function base() { return String(global.AKSI_SERVER || "").replace(/\/$/, ""); }
  function token() { return String(global.AKSI_SERVER_TOKEN || ""); }
  function emit(ev, data) {
    (handlers[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) {} });
  }
  function log(m) { emit("log", m); }
  function headers() {
    var h = { "Content-Type": "application/json" };
    if (token()) h.Authorization = "Bearer " + token();
    return h;
  }
  function wsUrl() {
    var b = base();
    if (!b) return null;
    return b.replace(/^http/, "ws") + "/ws";
  }

  function connectSocket() {
    return new Promise(function (resolve, reject) {
      var url = wsUrl();
      if (!url) return reject(new Error("Задайте window.AKSI_SERVER = https://ваш-vps"));
      var w = new WebSocket(url);
      var done = false;
      var t = setTimeout(function () {
        if (!done) { done = true; try { w.close(); } catch (e) {} reject(new Error("WS timeout")); }
      }, 12000);
      w.onopen = function () {
        if (done) return;
        done = true; clearTimeout(t); ws = w; log("relay connected"); startPing(); resolve(w);
      };
      w.onerror = function () {
        if (done) return;
        done = true; clearTimeout(t); reject(new Error("WS error"));
      };
      w.onmessage = function (ev) {
        var msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg.type === "welcome") {
          clientId = msg.clientId;
          emit("status", { connected: true, clientId: clientId });
        }
        if (msg.type === "pong" && msg.t) {
          lastRtt = Date.now() - msg.t;
          emit("status", { connected: true, roomId: roomId, rtt: lastRtt, clientId: clientId });
        }
        if (msg.type === "joined") {
          roomId = msg.roomId;
          emit("status", { connected: true, roomId: roomId, peers: msg.peers });
          emit("message", { text: "В комнате «" + roomId + "» · peers " + msg.peers, via: "sys", mine: false });
        }
        if (msg.type === "chat" || msg.type === "relay") {
          emit("message", { text: msg.text || "", via: "relay", mine: false, from: msg.from, fp: msg.fp });
        }
        if (msg.type === "peer-joined")
          emit("message", { text: "Узел вошёл · peers " + msg.peers, via: "sys", mine: false });
        if (msg.type === "peer-left")
          emit("message", { text: "Узел вышел", via: "sys", mine: false });
        if (msg.type === "error") log("error: " + msg.error);
      };
      w.onclose = function () {
        stopPing(); ws = null;
        emit("status", { connected: false, roomId: roomId });
        log("relay closed");
      };
    });
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(function () { sendRaw({ type: "ping", t: Date.now() }); }, 5000);
  }
  function stopPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }
  function sendRaw(obj) {
    if (!ws || ws.readyState !== 1) return false;
    try { ws.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
  }
  function ensure() {
    if (ws && ws.readyState === 1) return Promise.resolve();
    return connectSocket();
  }

  function createRoom() {
    return ensure().then(function () {
      var id = "aksi-" + Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
      return joinRoom(id).then(function () { return id; });
    });
  }
  function joinRoom(id) {
    id = String(id || "").trim();
    if (!id) return Promise.reject(new Error("пустой ID"));
    return ensure().then(function () {
      sendRaw({ type: "join", roomId: id });
      roomId = id;
      return id;
    });
  }
  function sendChat(text) {
    text = String(text || "").trim();
    if (!text) return false;
    emit("message", { text: text, via: "out", mine: true });
    return sendRaw({ type: "chat", text: text });
  }
  function leave() {
    sendRaw({ type: "leave" });
    roomId = null;
    if (ws) try { ws.close(); } catch (e) {}
    ws = null; stopPing();
    emit("status", { connected: false });
  }

  function llm(messages, opts) {
    opts = opts || {};
    var b = base();
    if (!b) return Promise.reject(new Error("AKSI_SERVER not set"));
    return fetch(b + "/v1/llm", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        provider: opts.provider || "openai",
        apiKey: opts.apiKey || "",
        model: opts.model,
        baseURL: opts.baseURL,
        messages: messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
      }),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j.ok) throw new Error((j && j.error) || "llm proxy " + r.status);
        return j;
      });
    });
  }

  function health() {
    var b = base();
    if (!b) return Promise.reject(new Error("AKSI_SERVER not set"));
    return fetch(b + "/health").then(function (r) { return r.json(); });
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card">' +
      "<h2>AKSI Relay · Sovereign Server</h2>" +
      '<p class="muted">Ваш сервер (не GitHub Pages). Комнаты + релей + LLM proxy BYOK.</p>' +
      '<input id="relBase" placeholder="https://vps.example.com" style="margin-bottom:8px">' +
      '<input id="relTok" type="password" placeholder="AKSI_TOKEN (если есть)" style="margin-bottom:8px">' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="relSave">Сохранить URL</button>' +
      '<button type="button" class="btn" id="relHealth">Health</button>' +
      "</div>" +
      '<div id="relSt" class="muted" style="margin:12px 0;padding:10px;border-radius:12px;background:rgba(0,0,0,.28)">—</div>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="relCreate">Создать комнату</button>' +
      '<button type="button" class="btn" id="relJoin">Войти</button>' +
      '<button type="button" class="btn" id="relLeave">Выйти</button>' +
      "</div>" +
      '<input id="relRoom" placeholder="room id" style="margin-top:10px">' +
      '<div id="relTh" style="margin-top:12px;max-height:220px;overflow:auto;display:flex;flex-direction:column;gap:8px"></div>' +
      '<div class="row" style="margin-top:8px">' +
      '<input id="relIn" placeholder="Сообщение по релею…" style="flex:1">' +
      '<button type="button" class="btn p" id="relSend">→</button>' +
      "</div>" +
      '<pre id="relLog" class="out" style="margin-top:10px;max-height:100px;font-size:11px">—</pre>' +
      "</div>";

    if (base()) document.getElementById("relBase").value = base();
    if (token()) document.getElementById("relTok").value = token();

    function st(s) {
      var e = document.getElementById("relSt");
      if (e) e.textContent = s;
    }
    function bub(m) {
      var th = document.getElementById("relTh");
      if (!th) return;
      var row = document.createElement("div");
      row.className = "msg " + (m.mine ? "me" : "ai");
      var b = document.createElement("div");
      b.className = "bub";
      b.textContent = m.text;
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = (m.via || "") + (m.fp ? " · " + m.fp : "");
      b.appendChild(meta);
      row.appendChild(b);
      th.appendChild(row);
      th.scrollTop = th.scrollHeight;
    }
    handlers.message = [bub];
    handlers.status = [function (s) {
      st((s.connected ? "online" : "offline") + (s.roomId ? " · room " + s.roomId : "") + (s.rtt != null ? " · " + s.rtt + " ms" : ""));
    }];
    handlers.log = [function (line) {
      var l = document.getElementById("relLog");
      if (l) l.textContent = "[" + new Date().toLocaleTimeString("ru-RU") + "] " + line + "\n" + l.textContent;
    }];

    document.getElementById("relSave").onclick = function () {
      global.AKSI_SERVER = (document.getElementById("relBase").value || "").trim().replace(/\/$/, "");
      global.AKSI_SERVER_TOKEN = (document.getElementById("relTok").value || "").trim();
      try {
        localStorage.setItem("aksi:server:url", global.AKSI_SERVER);
        localStorage.setItem("aksi:server:token", global.AKSI_SERVER_TOKEN);
      } catch (e) {}
      st("URL сохранён: " + (global.AKSI_SERVER || "—"));
    };
    document.getElementById("relHealth").onclick = function () {
      document.getElementById("relSave").onclick();
      health().then(function (j) { st(JSON.stringify(j)); }).catch(function (e) { st(String(e.message || e)); });
    };
    document.getElementById("relCreate").onclick = function () {
      document.getElementById("relSave").onclick();
      createRoom().then(function (id) {
        document.getElementById("relRoom").value = id;
        st("комната " + id);
        try { if (navigator.clipboard) navigator.clipboard.writeText(id); } catch (e) {}
      }).catch(function (e) { st(String(e.message || e)); });
    };
    document.getElementById("relJoin").onclick = function () {
      document.getElementById("relSave").onclick();
      var id = (document.getElementById("relRoom").value || "").trim() || prompt("room id");
      if (!id) return;
      joinRoom(id).catch(function (e) { st(String(e.message || e)); });
    };
    document.getElementById("relLeave").onclick = leave;
    document.getElementById("relSend").onclick = function () {
      var i = document.getElementById("relIn");
      var v = (i && i.value) || "";
      if (i) i.value = "";
      sendChat(v);
    };
    try {
      var u = localStorage.getItem("aksi:server:url");
      var tok = localStorage.getItem("aksi:server:token");
      if (u) { global.AKSI_SERVER = u; document.getElementById("relBase").value = u; }
      if (tok) { global.AKSI_SERVER_TOKEN = tok; document.getElementById("relTok").value = tok; }
    } catch (e) {}
  }

  global.AKSI_RELAY = {
    version: VER,
    createRoom: createRoom,
    joinRoom: joinRoom,
    sendChat: sendChat,
    leave: leave,
    llm: llm,
    health: health,
    mount: mount,
    getRtt: function () { return lastRtt; },
    getRoomId: function () { return roomId; },
  };
})(typeof window !== "undefined" ? window : this);
