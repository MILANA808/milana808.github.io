/**
 * AKSI Capsule Runtime v1.1 — complete local intelligence state
 * Memory · ECDSA seal · AES-GCM vault · Research fallback · Export/Import · Templates
 * © AKSI · aksilove@internet.ru · 2026-09-18
 */
(function (G) {
  "use strict";
  var VERSION = "1.1.0-capsule";
  var STORE = "aksi_capsule_runtime_v1";
  var KEY_STORE = "aksi_capsule_ecdsa_v1";
  var TEMPLATES = [
    { id: "note", label: "Заметка", prompt: "Заметка: " },
    { id: "client", label: "Клиент", prompt: "Клиент: " },
    { id: "task", label: "Задача", prompt: "Задача: " },
    { id: "decision", label: "Решение", prompt: "Решение: " },
    { id: "meeting", label: "Встреча", prompt: "Встреча: " },
    { id: "idea", label: "Идея", prompt: "Идея: " }
  ];
  function now() { return new Date().toISOString(); }
  function uid() { return "f_" + Date.now().toString(36) + "_" + Math.random().toString(16).slice(2, 8); }
  function hex(buf) {
    var u = buf && buf.byteLength !== undefined && typeof buf.length === "number" && !(buf instanceof ArrayBuffer)
      ? buf : new Uint8Array(buf);
    var h = "", i;
    for (i = 0; i < u.length; i++) h += ("0" + u[i].toString(16)).slice(-2);
    return h;
  }
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function b64(buf) {
    var u = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf);
    var s = "";
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function fromB64(s) {
    var bin = atob(s);
    var u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  async function sha256(text) {
    return hex(await crypto.subtle.digest("SHA-256", utf8(text)));
  }
  var state = { did: null, facts: [], seals: [], chat: [], lastAnswer: null, createdAt: null, updatedAt: null, settings: { research: true, mergeImport: false } };
  var keys = null;
  function defaultState() {
    return {
      did: "did:aksi:" + Math.random().toString(16).slice(2, 12),
      facts: [], seals: [], chat: [], lastAnswer: null,
      createdAt: now(), updatedAt: now(),
      settings: { research: true, mergeImport: false }
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
      else state = defaultState();
    } catch (e) { state = defaultState(); }
    if (!state.did) state.did = defaultState().did;
    if (!state.settings) state.settings = { research: true, mergeImport: false };
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
  async function deriveKey(password, salt) {
    var base = await crypto.subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 120000, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
  }
  async function encryptVault(password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(password, salt);
    var plain = utf8(JSON.stringify({ facts: state.facts, seals: state.seals, did: state.did }));
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plain);
    return {
      format: "aksi-vault", version: VERSION, alg: "AES-GCM-256 + PBKDF2-120k",
      salt: b64(salt), iv: b64(iv), ciphertext: b64(ct), exportedAt: now()
    };
  }
  async function decryptVault(vaultObj, password) {
    var key = await deriveKey(password, fromB64(vaultObj.salt));
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(vaultObj.iv) }, key, fromB64(vaultObj.ciphertext));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  function remember(text, meta) {
    text = String(text || "").trim();
    if (!text) return { ok: false, error: "empty" };
    var fact = { id: uid(), t: text, meta: meta || null, at: now() };
    state.facts.push(fact); persist();
    return { ok: true, fact: fact };
  }
  function forget(id) {
    var n = state.facts.length;
    state.facts = state.facts.filter(function (f) { return f.id !== id; });
    persist();
    return { ok: true, removed: n - state.facts.length };
  }
  function listFacts() { return state.facts.slice().reverse(); }
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
  async function researchWiki(q) {
    try {
      var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(q);
      var r = await fetch(url);
      if (!r.ok) {
        r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(q));
      }
      if (!r.ok) return null;
      var j = await r.json();
      if (j.type === "disambiguation" || !j.extract) return null;
      return { title: j.title, extract: j.extract, url: j.content_urls && j.content_urls.desktop ? j.content_urls.desktop.page : null };
    } catch (e) { return null; }
  }
  async function ask(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Задайте вопрос к памяти.", low: true, source: "empty" };
    var hits = search(q);
    var answer, source, wiki = null;
    if (hits.length) {
      answer = hits.map(function (h, i) {
        return (i + 1) + ". " + h.t + (h.meta ? " [" + h.meta + "]" : "");
      }).join("\n");
      source = "memory";
    } else if ((opts.research !== false) && state.settings.research) {
      wiki = await researchWiki(q);
      if (wiki && wiki.extract) {
        answer = wiki.title + "\n\n" + wiki.extract + (wiki.url ? "\n\nИсточник: " + wiki.url : "");
        source = "wikipedia";
      } else {
        answer = "В капсуле нет совпадений, и краткий поиск не дал результата. Добавьте факт через «Запомнить».";
        source = "empty";
      }
    } else {
      answer = "В капсуле нет совпадений. Добавьте факт через «Запомнить».";
      source = "empty";
    }
    var rec = { q: q, a: answer, at: now(), source: source, n: hits.length };
    state.lastAnswer = rec;
    state.chat.push({ role: "user", text: q, at: rec.at });
    state.chat.push({ role: "bot", text: answer, at: rec.at, source: source });
    if (state.chat.length > 100) state.chat = state.chat.slice(-100);
    persist();
    return { text: answer, source: source, hits: hits.length, lastAnswer: rec, low: source === "empty", wiki: wiki };
  }
  async function sealLast() {
    if (!state.lastAnswer) return { ok: false, error: "no answer" };
    var body = { q: state.lastAnswer.q, a: state.lastAnswer.a, at: state.lastAnswer.at, did: state.did, source: state.lastAnswer.source || "memory" };
    var payload = JSON.stringify(body);
    var hash = await sha256(payload);
    var signed = await signPayload(payload);
    var seal = {
      id: "seal_" + Date.now().toString(36), alg: "ECDSA-P256+SHA-256",
      hash: hash, signature: signed.sig, pubJwk: signed.pubJwk, body: body, sealedAt: now()
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
  async function verifyAll() {
    var out = [];
    for (var i = 0; i < state.seals.length; i++) out.push(await verifySeal(state.seals[i]));
    return out;
  }
  function exportCapsule() {
    return {
      format: "aksi-capsule", version: VERSION, product: "AKSI Capsule",
      contact: "aksilove@internet.ru", exportedAt: now(), did: state.did,
      createdAt: state.createdAt, facts: state.facts, seals: state.seals,
      chat: state.chat.slice(-50), settings: state.settings,
      note: "Portable local intelligence. Verify seals offline."
    };
  }
  function downloadJSON(obj, name) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function downloadCapsule() {
    var cap = exportCapsule();
    downloadJSON(cap, "aksi-" + String(state.did).replace(/:/g, "-") + ".aksi");
    return cap;
  }
  function downloadReceipt(seal) {
    if (!seal) seal = state.seals[state.seals.length - 1];
    if (!seal) return null;
    var receipt = { format: "aksi-receipt", version: VERSION, seal: seal, did: state.did, downloadedAt: now(), contact: "aksilove@internet.ru" };
    downloadJSON(receipt, "aksi-receipt-" + seal.id + ".json");
    return receipt;
  }
  async function importCapsule(data, opts) {
    opts = opts || {};
    if (typeof data === "string") data = JSON.parse(data);
    if (!data) return { ok: false, error: "empty" };
    if (data.format === "aksi-vault") return { ok: false, error: "vault_needs_password", vault: true };
    if (data.format !== "aksi-capsule" && !Array.isArray(data.facts)) return { ok: false, error: "not an aksi-capsule" };
    var merge = opts.merge || state.settings.mergeImport;
    if (merge) {
      var ids = {};
      state.facts.forEach(function (f) { ids[f.id] = true; });
      (data.facts || []).forEach(function (f) {
        if (!f.id || !ids[f.id]) { if (!f.id) f.id = uid(); state.facts.push(f); ids[f.id] = true; }
      });
      state.seals = state.seals.concat(data.seals || []);
    } else {
      state.facts = Array.isArray(data.facts) ? data.facts : [];
      state.seals = Array.isArray(data.seals) ? data.seals : [];
      state.chat = Array.isArray(data.chat) ? data.chat : [];
      if (data.did) state.did = data.did;
      if (data.createdAt) state.createdAt = data.createdAt;
    }
    state.lastAnswer = null; persist();
    var verified = await verifyAll();
    var allOk = verified.every(function (v) { return v.ok; });
    return { ok: true, facts: state.facts.length, seals: state.seals.length, verified: verified, allSealsOk: allOk || state.seals.length === 0, did: state.did, exportedAt: data.exportedAt || null, merged: !!merge };
  }
  async function importVault(vaultObj, password, opts) {
    var data = await decryptVault(vaultObj, password);
    return importCapsule({ format: "aksi-capsule", facts: data.facts || [], seals: data.seals || [], did: data.did }, opts);
  }
  function clearAll() { state = defaultState(); persist(); return { ok: true }; }
  function setSetting(key, val) { state.settings[key] = val; persist(); }
  function status() {
    return {
      version: VERSION, did: state.did, facts: state.facts.length, seals: state.seals.length,
      chat: state.chat.length, hasLast: !!state.lastAnswer, templates: TEMPLATES.length,
      crypto: "ECDSA-P256 + SHA-256", vault: "AES-GCM-256 PBKDF2-120k",
      research: !!state.settings.research, offline: true
    };
  }
  function getState() {
    return { did: state.did, facts: state.facts.slice(), seals: state.seals.slice(), lastAnswer: state.lastAnswer, chat: state.chat.slice(), settings: Object.assign({}, state.settings) };
  }
  load();
  G.AKSI_CAPSULE = {
    version: VERSION, remember: remember, forget: forget, listFacts: listFacts, ask: ask, search: search,
    sealLast: sealLast, verifySeal: verifySeal, verifyAll: verifyAll,
    exportCapsule: exportCapsule, downloadCapsule: downloadCapsule, downloadReceipt: downloadReceipt,
    importCapsule: importCapsule, encryptVault: encryptVault, decryptVault: decryptVault, importVault: importVault,
    clearAll: clearAll, setSetting: setSetting, status: status, getState: getState,
    templates: TEMPLATES, ensureKeys: ensureKeys, researchWiki: researchWiki
  };
})(typeof window !== "undefined" ? window : globalThis);
