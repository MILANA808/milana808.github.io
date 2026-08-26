/**
 * AKSI Channel v1 — guaranteed same-origin bus + optional PeerJS
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0";
  var bus = null, peer = null, conn = null, room = null, role = null;
  var listeners = [];

  function emit(msg) { listeners.forEach(function (f) { try { f(msg); } catch (e) {} }); }
  function on(fn) { listeners.push(fn); }

  function openBus(id) {
    if (typeof BroadcastChannel === "undefined") return false;
    try {
      if (bus) bus.close();
      bus = new BroadcastChannel("aksi-ch-" + id);
      bus.onmessage = function (e) { emit({ via: "local", data: e.data }); };
      return true;
    } catch (e) { return false; }
  }

  function send(obj) {
    var ok = false;
    if (bus) { try { bus.postMessage(obj); ok = true; } catch (e) {} }
    if (conn && conn.open) {
      try { conn.send(JSON.stringify(obj)); ok = true; } catch (e) {}
    }
    return ok;
  }

  function create() {
    room = "c-" + Math.random().toString(36).slice(2, 9);
    role = "host";
    openBus(room);
    return loadPeer().then(function () {
      return new Promise(function (resolve) {
        peer = new Peer(room, {
          host: "0.peerjs.com", port: 443, path: "/", secure: true,
          config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
        });
        peer.on("open", function (id) {
          room = id;
          openBus(room);
          peer.on("connection", function (c) {
            conn = c;
            c.on("data", function (d) {
              try { emit({ via: "peer", data: typeof d === "string" ? JSON.parse(d) : d }); }
              catch (e) { emit({ via: "peer", data: d }); }
            });
            emit({ via: "sys", data: { type: "peer-open" } });
          });
          resolve({ room: room, share: location.origin + "/?ch=" + encodeURIComponent(room) });
        });
        peer.on("error", function (e) {
          resolve({ room: room, share: location.origin + "/?ch=" + encodeURIComponent(room), peerError: e.type || String(e), localOnly: true });
        });
      });
    }).catch(function () {
      return { room: room, share: null, localOnly: true };
    });
  }

  function join(id) {
    room = String(id || "").trim();
    role = "guest";
    openBus(room);
    return loadPeer().then(function () {
      return new Promise(function (resolve) {
        peer = new Peer({
          host: "0.peerjs.com", port: 443, path: "/", secure: true,
          config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
        });
        peer.on("open", function () {
          conn = peer.connect(room, { reliable: true });
          var t = setTimeout(function () {
            resolve({ room: room, open: !!(conn && conn.open), local: true });
          }, 15000);
          conn.on("open", function () {
            clearTimeout(t);
            resolve({ room: room, open: true });
          });
          conn.on("data", function (d) {
            try { emit({ via: "peer", data: typeof d === "string" ? JSON.parse(d) : d }); }
            catch (e) { emit({ via: "peer", data: d }); }
          });
        });
        peer.on("error", function (e) {
          resolve({ room: room, open: false, error: e.type || String(e), local: true });
        });
      });
    }).catch(function (e) {
      return { room: room, open: false, local: true, error: String(e) };
    });
  }

  function loadPeer() {
    return new Promise(function (resolve, reject) {
      if (G.Peer) return resolve();
      var s = document.createElement("script");
      s.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
      s.onload = function () { G.Peer ? resolve() : reject(new Error("no Peer")); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card"><h2>Канал v' + VER + '</h2>' +
      '<p class="muted">Гарантия: две вкладки одного браузера. PeerJS — по возможности.</p>' +
      '<div id="chSt" class="muted" style="margin:10px 0;padding:10px;background:rgba(0,0,0,.25);border-radius:12px">—</div>' +
      '<div class="row"><button type="button" class="btn p" id="chC">Создать</button>' +
      '<button type="button" class="btn" id="chJ">Войти</button></div>' +
      '<input id="chId" placeholder="ID комнаты" style="margin-top:10px">' +
      '<div id="chTh" style="margin-top:12px;max-height:200px;overflow:auto"></div>' +
      '<div class="row" style="margin-top:8px"><input id="chIn" placeholder="сообщение" style="flex:1">' +
      '<button type="button" class="btn p" id="chS">→</button></div></div>';
    function st(s) { var e = document.getElementById("chSt"); if (e) e.textContent = s; }
    function bub(t, meta) {
      var th = document.getElementById("chTh");
      if (!th) return;
      var d = document.createElement("div");
      d.className = "msg ai";
      d.innerHTML = '<div class="bub">' + String(t).replace(/</g, "&lt;") +
        '<div class="meta">' + (meta || "") + "</div></div>";
      th.appendChild(d);
      th.scrollTop = th.scrollHeight;
    }
    on(function (m) {
      if (m.data && m.data.type === "chat") bub(m.data.text, m.via);
    });
    document.getElementById("chC").onclick = function () {
      st("создание…");
      create().then(function (r) {
        st((r.localOnly ? "локальный канал · " : "зал · ") + r.room + (r.share ? "\n" + r.share : ""));
        if (document.getElementById("chId")) document.getElementById("chId").value = r.room;
        bub("Комната " + r.room + (r.localOnly ? " (только вкладки)" : ""), "sys");
      });
    };
    document.getElementById("chJ").onclick = function () {
      var id = (document.getElementById("chId") || {}).value || prompt("ID");
      if (!id) return;
      st("вход…");
      join(id).then(function (r) {
        st(r.open ? "peer OK · " + r.room : "локальный bus · " + r.room + (r.error ? " · " + r.error : ""));
        bub(r.open ? "Связь peer" : "Только локальные вкладки / хост оффлайн", "sys");
      });
    };
    document.getElementById("chS").onclick = function () {
      var i = document.getElementById("chIn");
      var v = (i && i.value || "").trim();
      if (!v) return;
      if (i) i.value = "";
      bub(v, "вы");
      send({ type: "chat", text: v, ts: Date.now() });
    };
    try {
      var q = new URLSearchParams(location.search).get("ch");
      if (q) {
        document.getElementById("chId").value = q;
        setTimeout(function () { document.getElementById("chJ").click(); }, 400);
      }
    } catch (e) {}
  }

  G.AKSI_CHANNEL = {
    version: VER, create: create, join: join, send: send, on: on, mount: mount
  };
})(typeof window !== "undefined" ? window : this);
