/**
 * AKSI Link Protocol v1 — proprietary application layer
 * DID · ECDSA P-256 · SHA-256 chain · Resonance EQS · transport-agnostic
 * © AKSI · aksilove@internet.ru · LICENSE (Proprietary)
 */
(function (global) {
  "use strict";

  var VER = "1.0.0-link";
  var ALG = "ECDSA";
  var CURVE = "P-256";
  var HASH = "SHA-256";
  var STORE = "aksi:link:v1";
  var ledger = [];
  var identity = null;
  var listeners = [];

  function text(v) { return String(v == null ? "" : v); }
  function now() { return Date.now(); }

  function b64u(buf) {
    var bin = "";
    var bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function b64uToBuf(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }

  function sha256(str) {
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest(HASH, data).then(function (buf) { return b64u(buf); });
  }

  function resonance(payload) {
    var s = text(payload).trim();
    if (!s) return 0;
    var len = s.length;
    var structure = Math.min(1, len / 280);
    var words = s.split(/\s+/).filter(Boolean);
    var uniq = {};
    words.forEach(function (w) { uniq[w.toLowerCase()] = 1; });
    var signal = words.length ? Object.keys(uniq).length / words.length : 0;
    var hasQ = /[?]/.test(s) ? 0.15 : 0;
    var hasCode = /[{}`]|=>|function|const /.test(s) ? 0.2 : 0;
    var novelty = Math.min(1, hasQ + hasCode + (len > 40 ? 0.3 : 0.1));
    var trust = identity && identity.did ? 0.85 : 0.4;
    var eqs = 0.3 * structure + 0.35 * signal + 0.25 * novelty + 0.1 * trust;
    return Math.round(Math.max(0, Math.min(1, eqs)) * 1000) / 1000;
  }

  function didFromJwk(jwk) {
    var raw = (jwk.x || "") + "." + (jwk.y || "");
    return sha256("aksi:did:key:" + raw).then(function (h) {
      return "did:aksi:" + h.slice(0, 24);
    });
  }

  function generateIdentity() {
    return crypto.subtle.generateKey(
      { name: ALG, namedCurve: CURVE }, true, ["sign", "verify"]
    ).then(function (pair) {
      return crypto.subtle.exportKey("jwk", pair.publicKey).then(function (pub) {
        return didFromJwk(pub).then(function (did) {
          identity = { did: did, publicJwk: pub, publicKey: pair.publicKey, privateKey: pair.privateKey };
          try {
            localStorage.setItem(STORE + ":did", did);
            localStorage.setItem(STORE + ":pub", JSON.stringify(pub));
          } catch (e) {}
          return identity;
        });
      });
    });
  }

  function loadOrCreateIdentity() {
    if (identity) return Promise.resolve(identity);
    return generateIdentity();
  }

  function sign(bytes) {
    return loadOrCreateIdentity().then(function (id) {
      return crypto.subtle.sign({ name: ALG, hash: HASH }, id.privateKey, bytes).then(function (sig) {
        return b64u(sig);
      });
    });
  }

  function verify(publicJwk, bytes, sigB64) {
    return crypto.subtle.importKey("jwk", publicJwk, { name: ALG, namedCurve: CURVE }, false, ["verify"])
      .then(function (key) {
        return crypto.subtle.verify({ name: ALG, hash: HASH }, key, b64uToBuf(sigB64), bytes);
      }).catch(function () { return false; });
  }

  function lastHash() {
    if (!ledger.length) return "aksi:genesis";
    return ledger[ledger.length - 1].hash;
  }

  function seal(type, body) {
    return loadOrCreateIdentity().then(function (id) {
      var prev = lastHash();
      var eqs = resonance(typeof body === "string" ? body : JSON.stringify(body));
      var core = {
        v: 1, protocol: "AKSI-Link", type: type, body: body,
        did: id.did, pub: id.publicJwk, prev: prev, eqs: eqs, ts: now()
      };
      var canonical = JSON.stringify(core);
      return sha256(canonical).then(function (hash) {
        core.hash = hash;
        var toSign = new TextEncoder().encode(canonical + "|" + hash);
        return sign(toSign).then(function (sig) {
          core.sig = sig;
          ledger.push(core);
          try { localStorage.setItem(STORE + ":ledger", JSON.stringify(ledger.slice(-200))); } catch (e) {}
          listeners.forEach(function (fn) { try { fn(core); } catch (e) {} });
          return core;
        });
      });
    });
  }

  function open(envelope) {
    if (!envelope || envelope.protocol !== "AKSI-Link" || !envelope.sig || !envelope.hash) {
      return Promise.resolve({ ok: false, reason: "malformed" });
    }
    var core = {
      v: envelope.v, protocol: envelope.protocol, type: envelope.type, body: envelope.body,
      did: envelope.did, pub: envelope.pub, prev: envelope.prev, eqs: envelope.eqs, ts: envelope.ts
    };
    var canonical = JSON.stringify(core);
    return sha256(canonical).then(function (hash) {
      if (hash !== envelope.hash) return { ok: false, reason: "hash_mismatch" };
      var toSign = new TextEncoder().encode(canonical + "|" + hash);
      return verify(envelope.pub, toSign, envelope.sig).then(function (ok) {
        if (!ok) return { ok: false, reason: "bad_signature" };
        if (!ledger.some(function (e) { return e.hash === envelope.hash; })) ledger.push(envelope);
        return { ok: true, envelope: envelope, eqs: envelope.eqs };
      });
    });
  }

  function exportLedger() { return ledger.slice(); }
  function verifyChain() {
    return { length: ledger.length, tip: lastHash() };
  }

  function publishViaMesh(envelope) {
    try { global.dispatchEvent(new CustomEvent("aksi-link", { detail: envelope })); } catch (e) {}
    return true;
  }

  function chat(textBody) {
    return seal("CHAT", text(textBody)).then(function (env) {
      publishViaMesh(env);
      return env;
    });
  }

  function hello() {
    return seal("HELLO", { agent: "AKSI", ver: VER }).then(function (env) {
      publishViaMesh(env);
      return env;
    });
  }

  function onEnvelope(fn) { listeners.push(fn); }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card">' +
      "<h2>AKSI Link · Protocol Lab</h2>" +
      '<p class="muted">Проприетарный стек: DID · ECDSA · proof chain · Resonance (EQS).</p>' +
      '<div class="kv" style="margin-top:12px">' +
      '<div class="cell"><b id="linkDid">—</b><span>DID</span></div>' +
      '<div class="cell"><b id="linkTip">—</b><span>tip hash</span></div>' +
      '<div class="cell"><b id="linkN">0</b><span>envelopes</span></div>' +
      '<div class="cell"><b id="linkEqs">—</b><span>last EQS</span></div>' +
      "</div>" +
      '<div class="row">' +
      '<button type="button" class="btn p" id="linkHello">HELLO</button>' +
      '<button type="button" class="btn" id="linkChat">Seal CHAT</button>' +
      '<button type="button" class="btn" id="linkVerify">Verify chain</button>' +
      '<button type="button" class="btn" id="linkExport">Export ledger</button>' +
      "</div>" +
      '<input id="linkInput" placeholder="Текст для CHAT envelope…" style="margin-top:12px">' +
      '<pre id="linkOut" class="out" style="margin-top:12px;max-height:240px">—</pre>' +
      "</div>";

    function paint() {
      var d = document.getElementById("linkDid");
      var t = document.getElementById("linkTip");
      var n = document.getElementById("linkN");
      var e = document.getElementById("linkEqs");
      if (d) d.textContent = identity ? identity.did.slice(0, 18) + "…" : "—";
      if (t) t.textContent = String(lastHash()).slice(0, 16) + "…";
      if (n) n.textContent = String(ledger.length);
      if (e && ledger.length) e.textContent = String(ledger[ledger.length - 1].eqs);
    }
    function show(obj) {
      var o = document.getElementById("linkOut");
      if (o) o.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
      paint();
    }
    loadOrCreateIdentity().then(function () { paint(); });
    document.getElementById("linkHello").onclick = function () { hello().then(show); };
    document.getElementById("linkChat").onclick = function () {
      var v = (document.getElementById("linkInput") || {}).value || "ping from AKSI Link";
      chat(v).then(show);
    };
    document.getElementById("linkVerify").onclick = function () { show(verifyChain()); };
    document.getElementById("linkExport").onclick = function () {
      var data = JSON.stringify(exportLedger(), null, 2);
      show(exportLedger().slice(-5));
      try {
        var blob = new Blob([data], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aksi-link-ledger.json";
        a.click();
      } catch (e) {}
    };
    onEnvelope(function () { paint(); });
  }

  try {
    var saved = JSON.parse(localStorage.getItem(STORE + ":ledger") || "[]");
    if (Array.isArray(saved)) ledger = saved;
  } catch (e) {}

  global.AKSI_LINK = {
    version: VER, protocol: "AKSI-Link",
    generateIdentity: generateIdentity, loadOrCreateIdentity: loadOrCreateIdentity,
    getDid: function () { return identity && identity.did; },
    resonance: resonance, seal: seal, open: open, chat: chat, hello: hello,
    exportLedger: exportLedger, verifyChain: verifyChain, onEnvelope: onEnvelope,
    mount: mount, lastHash: lastHash
  };
})(typeof window !== "undefined" ? window : this);
