/**
 * AKSI Capsule Runtime v1.0 — full local intelligence state
 * Memory · Seal (SHA-256 + ECDSA P-256) · Export/Import .aksi · Templates
 * © AKSI · aksilove@internet.ru · 2026-09-18
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0-capsule";
  var STORE = "aksi_capsule_runtime_v1";
  var KEY_STORE = "aksi_capsule_ecdsa_v1";
  var TEMPLATES = [
    { id: "note", label: "Заметка", prompt: "Заметка: " },
    { id: "client", label: "Клиент", prompt: "Клиент: " },
    { id: "task", label: "Задача", prompt: "Задача: " },
    { id: "decision", label: "Решение", prompt: "Решение: " },
    { id: "meeting", label: "Встреча", prompt: "Встреча: " }
  ];
  function now() { return new Date().toISOString(); }
  function uid() { return "f_" + Date.now().toString(36) + "_" + Math.random().toString(16).slice(2, 8); }
  function hex(buf) {
    var u = buf && buf.buffer !== undefined && buf.byteLength !== undefined && buf.length !== undefined
      ? buf : new Uint8Array(buf);
    var h = "", i;
    for (i = 0; i < u.length; i++) h += ("0" + u[i].toString(16)).slice(-2);
    return h;
  }
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  async function sha256(text) {
    return hex(await crypto.subtle.digest("SHA-256", utf8(text)));
  }
  var state = { did: null, facts: [], seals: [], chat: [], lastAnswer: null, createdAt: null, updatedAt: null };
  var keys = null;
  function defaultState() {
    return {
      did: "did:aksi:" + Math.random().toString(16).slice(2, 12),
      facts: [], seals: [], chat: [], lastAnswer: null,
      createdAt: now(), updatedAt: now()
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
      else state = defaultState();
    } catch (e) { state = defaultState(); }
    if (!state.did) state.did = defaultState().did;
  }
  function persist() {
    state.updatedAt = now();
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }
  async function ensureKeys() {
    if (keys) return keys;
    var raw = null;
    try { raw = localStorage.getItem(KEY_STORE); } catch (e) {}
    if (raw) {
      try {
        var j = JSON.parse(raw);
        var priv = await crypto.subtle.importKey("jwk", j.priv, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
        var pub = await crypto.subtle.importKey("jwk", j.pub, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
        keys = { priv: priv, pub: pub, pubJwk: j.pub };
        return keys;
      } catch (e) {}
    }
    var pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    var privJ = await crypto.subtle.exportKey("jwk", pair.privateKey);
    var pubJ = await crypto.subtle.exportKey("jwk", pair.publicKey);
    try { localStorage.setItem(KEY_STORE, JSON.stringify({ priv: privJ, pub: pubJ })); } catch (e) {}
    keys = { priv: pair.privateKey, pub: pair.publicKey, pubJwk: pubJ };
    return keys;
  }
  async function signPayload(payloadStr) {
    var k = await ensureKeys();
    var sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k.priv, utf8(payloadStr));
    return { sig: hex(sig), pubJwk: k.pubJwk };
  }
  function hexToBytes(sigHex) {
    sigHex = String(sigHex || "").replace(/\s/g, "");
    if (sigHex.length % 2) return new Uint8Array(0);
    var out = new Uint8Array(sigHex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(sigHex.substr(i * 2, 2), 16);
    return out;
  }
  async function verifySig(payloadStr, sigHex, pubJwk) {
    try {
      var pub = await crypto.subtle.importKey("jwk", pubJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
      return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, hexToBytes(sigHex), utf8(payloadStr));
    } catch (e) { return false; }
  }
  function remember(text, meta) {
    text = String(text || "").trim();
    if (!text) return { ok: false, error: "empty" };
    var fact = { id: uid(), t: text, meta: meta || null, at: now() };
    state.facts.push(fact); persist();
    return { ok: true, fact: fact };
  }
  function search(q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return state.facts.slice();
    var words = q.split(/\s+/).filter(function (w) { return w.length > 1; });
    return state.facts.filter(function (f) {
      var t = f.t.toLowerCase();
      if (t.indexOf(q) >= 0) return true;
      var hit = 0;
      for (var i = 0; i < words.length; i++) if (t.indexOf(words[i]) >= 0) hit++;
      return words.length && hit >= Math.ceil(words.length * 0.5);
    });
  }
  function ask(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Задайте вопрос к памяти.", low: true };
    var hits = search(q);
    var answer, source;
    if (!hits.length) {
      answer = "В капсуле нет совпадений. Добавьте факт через «Запомнить».";
      source = "empty";
    } else {
      answer = hits.map(function (h, i) {
        return (i + 1) + ". " + h.t + (h.meta ? " [" + h.meta + "]" : "");
      }).join("\n");
      source = "memory";
    }
    var rec = { q: q, a: answer, at: now(), source: source, n: hits.length };
    state.lastAnswer = rec;
    state.chat.push({ role: "user", text: q, at: rec.at });
    state.chat.push({ role: "bot", text: answer, at: rec.at, source: source });
    if (state.chat.length > 80) state.chat = state.chat.slice(-80);
    persist();
    return { text: answer, source: source, hits: hits.length, lastAnswer: rec, low: !hits.length };
  }
  async function sealLast() {
    if (!state.lastAnswer) return { ok: false, error: "no answer" };
    var body = {
      q: state.lastAnswer.q, a: state.lastAnswer.a, at: state.lastAnswer.at,
      did: state.did, source: state.lastAnswer.source || "memory"
    };
    var payload = JSON.stringify(body);
    var hash = await sha256(payload);
    var signed = await signPayload(payload);
    var seal = {
      id: "seal_" + Date.now().toString(36),
      alg: "ECDSA-P256+SHA-256",
      hash: hash, signature: signed.sig, pubJwk: signed.pubJwk,
      body: body, sealedAt: now()
    };
    state.seals.push(seal); persist();
    return { ok: true, seal: seal };
  }
  async function verifySeal(seal) {
    if (!seal || !seal.body) return { ok: false, error: "invalid seal" };
    var payload = JSON.stringify(seal.body);
    var hash = await sha256(payload);
    var hashOk = hash === seal.hash;
    var sigOk = false;
    if (seal.signature && seal.pubJwk) sigOk = await verifySig(payload, seal.signature, seal.pubJwk);
    return { ok: hashOk && (sigOk || !seal.signature), hashOk: hashOk, sigOk: sigOk, hash: hash, sealHash: seal.hash };
  }
  function exportCapsule() {
    return {
      format: "aksi-capsule", version: VERSION, product: "AKSI Capsule",
      contact: "aksilove@internet.ru", exportedAt: now(), did: state.did,
      createdAt: state.createdAt, facts: state.facts, seals: state.seals,
      chat: state.chat.slice(-40),
      note: "Portable local intelligence. Verify seals offline. Not a cloud account."
    };
  }
  function downloadCapsule() {
    var cap = exportCapsule();
    var blob = new Blob([JSON.stringify(cap, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aksi-" + String(state.did).replace(/:/g, "-") + ".aksi";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    return cap;
  }
  async function importCapsule(data) {
    if (typeof data === "string") data = JSON.parse(data);
    if (!data || (data.format !== "aksi-capsule" && !Array.isArray(data.facts)))
      return { ok: false, error: "not an aksi-capsule" };
    state.facts = Array.isArray(data.facts) ? data.facts : [];
    state.seals = Array.isArray(data.seals) ? data.seals : [];
    state.chat = Array.isArray(data.chat) ? data.chat : [];
    if (data.did) state.did = data.did;
    if (data.createdAt) state.createdAt = data.createdAt;
    state.lastAnswer = null; persist();
    var verified = [];
    for (var i = 0; i < state.seals.length; i++) verified.push(await verifySeal(state.seals[i]));
    var allOk = verified.every(function (v) { return v.ok; });
    return {
      ok: true, facts: state.facts.length, seals: state.seals.length,
      verified: verified, allSealsOk: allOk || state.seals.length === 0,
      did: state.did, exportedAt: data.exportedAt || null
    };
  }
  function clearAll() { state = defaultState(); persist(); return { ok: true }; }
  function status() {
    return {
      version: VERSION, did: state.did, facts: state.facts.length, seals: state.seals.length,
      chat: state.chat.length, hasLast: !!state.lastAnswer, templates: TEMPLATES.length,
      crypto: "ECDSA-P256 + SHA-256", offline: true
    };
  }
  function getState() {
    return { did: state.did, facts: state.facts.slice(), seals: state.seals.slice(), lastAnswer: state.lastAnswer, chat: state.chat.slice() };
  }
  load();
  G.AKSI_CAPSULE = {
    version: VERSION, remember: remember, ask: ask, search: search,
    sealLast: sealLast, verifySeal: verifySeal, exportCapsule: exportCapsule,
    downloadCapsule: downloadCapsule, importCapsule: importCapsule, clearAll: clearAll,
    status: status, getState: getState, templates: TEMPLATES, ensureKeys: ensureKeys
  };
})(typeof window !== "undefined" ? window : globalThis);
