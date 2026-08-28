/** AKSI Overlay Network (AON) v1.0.0-aon · AOP/1 · L0/L1/L2 · © AKSI proprietary */
(function (G) {
  "use strict";
  var VER = "1.0.0-aon";
  var PROTOCOL = "AOP/1";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var DEFAULT_RELAY = (typeof location !== "undefined" && location.hostname === "localhost")
    ? "ws://127.0.0.1:8787" : "wss://aksi-relay.fly.dev";
  var state = {
    roomId: null, nodeId: null, did: null, peers: {},
    connected: { local: false, relay: false, p2p: false },
    rtt: null, chain: [], listeners: [], bus: null, ws: null, peer: null, conns: {}, host: false,
  };
  var relayUrl = DEFAULT_RELAY;
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function hex(u8) {
    return Array.from(u8).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  async function sha256Hex(data) {
    var buf = typeof data === "string" ? utf8(data) : data;
    return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", buf)));
  }
  function nodeId() {
    if (state.nodeId) return state.nodeId;
    try { var id = localStorage.getItem("aksi_aon_node"); if (id) { state.nodeId = id; return id; } } catch (e) {}
    var id2 = "n_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    try { localStorage.setItem("aksi_aon_node", id2); } catch (e) {}
    state.nodeId = id2; return id2;
  }
  function did() {
    if (state.did) return state.did;
    try { var d = localStorage.getItem("aksi_did_v1"); if (d) { state.did = d; return d; } } catch (e) {}
    var d2 = "did:aksi:" + nodeId().replace(/^n_/, "");
    try { localStorage.setItem("aksi_did_v1", d2); } catch (e) {}
    state.did = d2; return d2;
  }
  function on(fn) {
    state.listeners.push(fn);
    return function () { state.listeners = state.listeners.filter(function (x) { return x !== fn; }); };
  }
  function emit(ev, data) {
    state.listeners.forEach(function (fn) { try { fn(ev, data); } catch (e) {} });
  }
  async function seal(type, body) {
    var prev = state.chain.length > 0 ? state.chain[state.chain.length - 1].hash : "GENESIS";
    var env = { v: PROTOCOL, type: type, room: state.roomId, from: nodeId(), did: did(), ts: Date.now(), body: body, prev: prev };
    env.hash = await sha256Hex(JSON.stringify(env));
    state.chain.push({ hash: env.hash, type: type, ts: env.ts });
    if (state.chain.length > 200) state.chain = state.chain.slice(-200);
    return env;
  }
  async function verifyEnvelope(env) {
    if (!env || env.v !== PROTOCOL) return false;
    var copy = Object.assign({}, env); var h = copy.hash; delete copy.hash;
    return (await sha256Hex(JSON.stringify(copy))) === h;
  }
  function openLocal(room) {
    if (typeof BroadcastChannel === "undefined") return false;
    try {
      if (state.bus) try { state.bus.close(); } catch (e) {}
      state.bus = new BroadcastChannel("aksi-aon-" + room);
      state.bus.onmessage = function (e) { handleIncoming(e.data, "local"); };
      state.connected.local = true; emit("status", status()); return true;
    } catch (e) { state.connected.local = false; return false; }
  }
  function sendLocal(env) {
    if (!state.bus) return false;
    try { state.bus.postMessage(env); return true; } catch (e) { return false; }
  }
  function setRelay(url) { relayUrl = String(url || "").replace(/\/$/, ""); }
  function connectRelay() {
    return new Promise(function (resolve) {
      if (!relayUrl || typeof WebSocket === "undefined") { resolve(false); return; }
      try {
        if (state.ws) try { state.ws.close(); } catch (e) {}
        var ws = new WebSocket(relayUrl);
        var done = false;
        var timer = setTimeout(function () {
          if (!done) { done = true; try { ws.close(); } catch (e) {} resolve(false); }
        }, 8000);
        ws.onopen = function () {
          state.ws = ws; state.connected.relay = true;
          ws.send(JSON.stringify({ type: "join", roomId: state.roomId, clientId: nodeId(), protocol: PROTOCOL }));
          emit("status", status());
          if (!done) { done = true; clearTimeout(timer); resolve(true); }
        };
        ws.onmessage = function (ev) {
          try {
            var msg = JSON.parse(ev.data);
            if (msg.type === "pong" && msg.ts) { state.rtt = Date.now() - msg.ts; emit("status", status()); return; }
            if (msg.type === "aop" && msg.envelope) { handleIncoming(msg.envelope, "relay"); return; }
            if (msg.type === "chat" && msg.text) {
              handleIncoming({ v: PROTOCOL, type: "chat", room: state.roomId, from: msg.from || "relay", ts: Date.now(), body: { text: msg.text }, prev: "RELAY", hash: "relay" }, "relay");
            }
          } catch (e) {}
        };
        ws.onclose = function () { state.connected.relay = false; state.ws = null; emit("status", status()); };
        ws.onerror = function () { if (!done) { done = true; clearTimeout(timer); resolve(false); } };
      } catch (e) { resolve(false); }
    });
  }
  function sendRelay(env) {
    if (!state.ws || state.ws.readyState !== 1) return false;
    try { state.ws.send(JSON.stringify({ type: "aop", envelope: env, roomId: state.roomId })); return true; } catch (e) { return false; }
  }
  function pingRelay() {
    if (!state.ws || state.ws.readyState !== 1) return;
    try { state.ws.send(JSON.stringify({ type: "ping", ts: Date.now() })); } catch (e) {}
  }
  function loadPeerJS() {
    return new Promise(function (resolve) {
      if (G.Peer) { resolve(true); return; }
      if (typeof document === "undefined") { resolve(false); return; }
      var s = document.createElement("script");
      s.src = PEERJS_CDN;
      s.onload = function () { resolve(!!G.Peer); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }
  function connectP2P(asHost) {
    return loadPeerJS().then(function (ok) {
      if (!ok || !G.Peer) return false;
      return new Promise(function (resolve) {
        try {
          var peerId = asHost ? "aksi-" + state.roomId : "aksi-g-" + nodeId();
          var peer = new G.Peer(peerId, { debug: 0, config: { iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun.cloudflare.com:3478" },
          ]}});
          state.peer = peer;
          peer.on("open", function () {
            state.connected.p2p = true; emit("status", status());
            if (!asHost) wireConn(peer.connect("aksi-" + state.roomId, { reliable: true }));
            resolve(true);
          });
          peer.on("connection", function (conn) { wireConn(conn); });
          peer.on("error", function (err) {
            emit("error", { layer: "p2p", message: String(err && err.type || err) });
            if (!state.connected.p2p) resolve(false);
          });
          setTimeout(function () { if (!state.connected.p2p) resolve(false); }, 12000);
        } catch (e) { resolve(false); }
      });
    });
  }
  function wireConn(conn) {
    if (!conn) return;
    state.conns[conn.peer] = conn;
    conn.on("open", function () { state.connected.p2p = true; emit("status", status()); emit("peer", { id: conn.peer, event: "open" }); });
    conn.on("data", function (data) { handleIncoming(data, "p2p"); });
    conn.on("close", function () { delete state.conns[conn.peer]; emit("peer", { id: conn.peer, event: "close" }); });
  }
  function sendP2P(env) {
    var ok = false;
    Object.keys(state.conns).forEach(function (k) {
      var c = state.conns[k];
      if (c && c.open) { try { c.send(env); ok = true; } catch (e) {} }
    });
    return ok;
  }
  function handleIncoming(raw, via) {
    if (!raw || raw.from === nodeId()) return;
    verifyEnvelope(raw).then(function (ok) {
      emit("message", {
        via: via, envelope: raw,
        text: raw.body && (raw.body.text || raw.body.msg),
        from: raw.from, did: raw.did, type: raw.type, verified: ok, ts: raw.ts,
      });
    });
  }
  function status() {
    return {
      protocol: PROTOCOL, version: VER, roomId: state.roomId, nodeId: nodeId(), did: did(),
      layers: Object.assign({}, state.connected), rtt: state.rtt, chainLen: state.chain.length,
      peers: Object.keys(state.conns).length,
    };
  }
  function createRoom() {
    var id = "aksi-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
    return joinRoom(id, true);
  }
  function joinRoom(roomId, asHost) {
    roomId = String(roomId || "").trim().toLowerCase().replace(/[^a-z0-9\-_]/g, "").slice(0, 48);
    if (!roomId) return Promise.reject(new Error("empty room"));
    state.roomId = roomId; state.host = !!asHost; state.chain = [];
    openLocal(roomId);
    return Promise.all([
      connectRelay(),
      connectP2P(!!asHost).catch(function () { return false; }),
    ]).then(function () {
      var st = status(); emit("status", st); emit("joined", st);
      return publish("presence", { event: "join", host: !!asHost }).then(function () { return st; });
    });
  }
  function leave() {
    try { if (state.bus) state.bus.close(); } catch (e) {}
    try { if (state.ws) state.ws.close(); } catch (e) {}
    try { if (state.peer) state.peer.destroy(); } catch (e) {}
    state.bus = null; state.ws = null; state.peer = null; state.conns = {};
    state.connected = { local: false, relay: false, p2p: false }; state.roomId = null;
    emit("status", status());
  }
  function publish(type, body) {
    return seal(type, body || {}).then(function (env) {
      var sent = { local: sendLocal(env), relay: sendRelay(env), p2p: sendP2P(env) };
      emit("sent", { envelope: env, sent: sent });
      return { envelope: env, sent: sent };
    });
  }
  function chat(text) {
    text = String(text || "").trim().slice(0, 4000);
    if (!text) return Promise.resolve(null);
    return publish("chat", { text: text });
  }
  function shareAnswer(q, a) {
    return publish("answer", { q: String(q).slice(0, 500), a: String(a).slice(0, 2000) });
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>AKSI Overlay · v' + VER + '</h2>' +
      '<p class="muted">AOP/1 · L0 local · L1 relay · L2 P2P</p>' +
      '<pre id="aonSt" class="out">…</pre>' +
      '<div class="row"><button type="button" class="btn p" id="aonCreate">Создать зал</button>' +
      '<button type="button" class="btn" id="aonJoin">Войти</button>' +
      '<button type="button" class="btn" id="aonLeave">Выйти</button></div>' +
      '<input id="aonRoom" placeholder="room id" style="margin-top:10px">' +
      '<input id="aonMsg" placeholder="Сообщение…" style="margin-top:8px">' +
      '<div class="row"><button type="button" class="btn p" id="aonSend">Отправить AOP</button></div>' +
      '<pre id="aonLog" class="out" style="margin-top:10px;max-height:220px">—</pre></div>';
    function st() { var el = document.getElementById("aonSt"); if (el) el.textContent = JSON.stringify(status(), null, 2); }
    function log(line) {
      var el = document.getElementById("aonLog"); if (!el) return;
      el.textContent = (typeof line === "string" ? line : JSON.stringify(line)) + "\n" + el.textContent.slice(0, 2000);
    }
    st();
    on(function (ev, data) {
      if (ev === "status" || ev === "joined") st();
      if (ev === "message") log("[" + (data.via || "?") + (data.verified ? "✓" : "?") + "] " + (data.from || "") + ": " + (data.text || data.type));
      if (ev === "sent") log("→ " + data.envelope.type + " " + JSON.stringify(data.sent));
      if (ev === "error") log("err " + JSON.stringify(data));
    });
    document.getElementById("aonCreate").onclick = function () {
      createRoom().then(function (s) { document.getElementById("aonRoom").value = s.roomId; st(); log("room " + s.roomId); });
    };
    document.getElementById("aonJoin").onclick = function () {
      var id = (document.getElementById("aonRoom").value || "").trim() || prompt("Room ID");
      if (!id) return;
      joinRoom(id, false).then(function (s) { st(); log("joined " + s.roomId); });
    };
    document.getElementById("aonLeave").onclick = function () { leave(); st(); log("left"); };
    document.getElementById("aonSend").onclick = function () {
      chat(document.getElementById("aonMsg").value).then(function () { document.getElementById("aonMsg").value = ""; });
    };
  }
  function hookLiveShare() {
    if (!G.AKSI_LIVE || G.AKSI_LIVE._aonHooked) return;
    var orig = G.AKSI_LIVE.think;
    if (typeof orig !== "function") return;
    G.AKSI_LIVE.think = function (q) {
      return orig(q).then(function (r) {
        if (state.roomId && r && r.text) shareAnswer(q, r.text).catch(function () {});
        return r;
      });
    };
    G.AKSI_LIVE._aonHooked = true;
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(hookLiveShare, 100); });
    else setTimeout(hookLiveShare, 100);
  }
  setInterval(function () { if (state.connected.relay) pingRelay(); }, 15000);
  G.AKSI_OVERLAY = {
    version: VER, protocol: PROTOCOL, createRoom: createRoom, joinRoom: joinRoom, leave: leave,
    chat: chat, publish: publish, shareAnswer: shareAnswer, status: status, on: on, setRelay: setRelay,
    mount: mount, nodeId: nodeId, did: did,
  };
  G.AKSI_NET_LAYER = G.AKSI_OVERLAY;
})(typeof window !== "undefined" ? window : this);
