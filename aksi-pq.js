/**
 * AKSI-PQ · Post-Quantum Sovereign Crypto Layer v1
 * Hybrid P-256 + optional ML-KEM-768 · Resonance Seal · Dual-DID · E2E envelopes
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (global) {
  "use strict";
  var VER = "1.0.0-pq";
  var DB = "aksi_pq_vault_v1";
  var STORE = "keys";
  var LS_PUB = "aksi:pq:pubpack:v1";
  var LS_LEDGER = "aksi_proof_ledger_v1";
  var noble = null;
  var pqReady = false;
  var identity = null;

  function b64(buf) {
    var u = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    var s = "";
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function unb64(s) {
    var bin = atob(s);
    var u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function concat() {
    var parts = [], n = 0, i;
    for (i = 0; i < arguments.length; i++) {
      var p = arguments[i] instanceof Uint8Array ? arguments[i] : new Uint8Array(arguments[i]);
      parts.push(p); n += p.length;
    }
    var out = new Uint8Array(n), o = 0;
    for (i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function fromUtf8(u) { return new TextDecoder().decode(u); }
  async function sha256(data) {
    var buf = data instanceof Uint8Array ? data : utf8(data);
    return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  }
  function hex(u) {
    return Array.from(u).map(function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
  }
  async function fingerprint(pubRaw) {
    return hex((await sha256(pubRaw)).slice(0, 16));
  }

  function lastLedgerHash() {
    try {
      var a = JSON.parse(localStorage.getItem(LS_LEDGER) || "[]");
      if (a.length) return a[a.length - 1].hash || "GENESIS";
    } catch (e) {}
    return "GENESIS";
  }
  function appendLedger(kind, payload) {
    try {
      var chain = JSON.parse(localStorage.getItem(LS_LEDGER) || "[]");
      if (!Array.isArray(chain)) chain = [];
      var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
      var body = { i: chain.length, ts: Date.now(), kind: kind, payload: String(payload).slice(0, 400), prev: prev };
      var h = 0x811c9dc5, s = JSON.stringify(body), i;
      for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      body.hash = ("00000000" + (h >>> 0).toString(16)).slice(-8);
      chain.push(body);
      localStorage.setItem(LS_LEDGER, JSON.stringify(chain.slice(-200)));
      return body;
    } catch (e) { return null; }
  }

  async function resonanceSeal(eqs, hint) {
    var prev = lastLedgerHash();
    var material = "AKSI-RES|v1|" + String(eqs == null ? "0.55" : eqs) + "|" + String(hint || "").slice(0, 64) + "|" + prev;
    return sha256(material);
  }

  function idb() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }
  async function idbGet(key) {
    var db = await idb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var q = tx.objectStore(STORE).get(key);
      q.onsuccess = function () { resolve(q.result); };
      q.onerror = function () { reject(q.error); };
    });
  }
  async function idbSet(key, val) {
    var db = await idb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  async function genClassical() {
    var kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    var signKp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    return { ecdh: kp, ecdsa: signKp };
  }
  async function exportPub(key, type) {
    var fmt = type === "ecdsa" ? "spki" : "raw";
    return new Uint8Array(await crypto.subtle.exportKey(fmt, key));
  }
  async function importEcdhPub(raw) {
    return crypto.subtle.importKey("raw", raw, { name: "ECDH", namedCurve: "P-256" }, true, []);
  }
  async function importEcdsaPub(spki) {
    return crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  }
  async function ecdhShared(priv, pubRaw) {
    var pub = await importEcdhPub(pubRaw);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256));
  }
  async function deriveAesKey(shared, salt, info) {
    var base = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: salt, info: utf8(info || "AKSI-HQ1") },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
  }
  async function aesEncrypt(key, plain, aad) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv, additionalData: aad }, key, plain);
    return { iv: iv, ct: new Uint8Array(ct) };
  }
  async function aesDecrypt(key, iv, ct, aad) {
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv, additionalData: aad }, key, ct));
  }
  async function signBytes(ecdsaPriv, data) {
    return new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, ecdsaPriv, data));
  }
  async function verifyBytes(ecdsaPubSpki, data, sig) {
    var pub = await importEcdsaPub(ecdsaPubSpki);
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, sig, data);
  }

  async function loadNoble() {
    if (pqReady) return true;
    if (global.AKSI_PQ_DISABLE_NOBLE) return false;
    try {
      noble = await import("https://cdn.jsdelivr.net/npm/@noble/post-quantum@0.4.1/ml-kem.js/+esm");
      pqReady = true; return true;
    } catch (e1) {
      try {
        noble = await import("https://esm.sh/@noble/post-quantum@0.4.1/ml-kem");
        pqReady = true; return true;
      } catch (e2) { pqReady = false; return false; }
    }
  }
  function kemApi() {
    if (!noble) return null;
    if (noble.ml_kem768) return noble.ml_kem768;
    return noble.mlkem768 || noble.ML_KEM_768 || noble.default || noble;
  }
  async function pqKeygen() {
    if (!(await loadNoble())) return null;
    var api = kemApi();
    if (!api || typeof api.keygen !== "function") return null;
    try {
      var keys = api.keygen();
      return { publicKey: keys.publicKey || keys.pubKey || keys.public, secretKey: keys.secretKey || keys.secKey || keys.secret };
    } catch (e) { return null; }
  }
  async function pqEncapsulate(pubKey) {
    if (!(await loadNoble())) return null;
    var api = kemApi();
    if (!api || typeof api.encapsulate !== "function") return null;
    try {
      var r = api.encapsulate(pubKey);
      return { cipherText: r.cipherText || r.ct, sharedSecret: r.sharedSecret || r.shared };
    } catch (e) { return null; }
  }
  async function pqDecapsulate(cipherText, secretKey) {
    if (!(await loadNoble())) return null;
    var api = kemApi();
    if (!api || typeof api.decapsulate !== "function") return null;
    try { return api.decapsulate(cipherText, secretKey); } catch (e) { return null; }
  }

  async function ensureIdentity() {
    if (identity) return identity;
    var stored = await idbGet("identity");
    if (stored && stored.ecdhPrivJwk) {
      identity = {
        ecdh: {
          privateKey: await crypto.subtle.importKey("jwk", stored.ecdhPrivJwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
          publicKey: await crypto.subtle.importKey("jwk", stored.ecdhPubJwk, { name: "ECDH", namedCurve: "P-256" }, true, []),
        },
        ecdsa: {
          privateKey: await crypto.subtle.importKey("jwk", stored.ecdsaPrivJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
          publicKey: await crypto.subtle.importKey("jwk", stored.ecdsaPubJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]),
        },
        ecdhPubRaw: unb64(stored.ecdhPubRawB64),
        ecdsaPubSpki: unb64(stored.ecdsaPubSpkiB64),
        did: stored.did,
        pq: stored.pq || null,
        createdAt: stored.createdAt,
      };
      return identity;
    }
    var cl = await genClassical();
    var ecdhPubRaw = await exportPub(cl.ecdh.publicKey, "ecdh");
    var ecdsaPubSpki = await exportPub(cl.ecdsa.publicKey, "ecdsa");
    var fp = await fingerprint(ecdhPubRaw);
    var did = "did:aksi:pq:" + fp;
    var pq = null;
    try {
      var pqk = await pqKeygen();
      if (pqk) pq = { publicKeyB64: b64(pqk.publicKey), secretKeyB64: b64(pqk.secretKey), alg: "ML-KEM-768" };
    } catch (e) {}
    var pack = {
      ecdhPrivJwk: await crypto.subtle.exportKey("jwk", cl.ecdh.privateKey),
      ecdhPubJwk: await crypto.subtle.exportKey("jwk", cl.ecdh.publicKey),
      ecdsaPrivJwk: await crypto.subtle.exportKey("jwk", cl.ecdsa.privateKey),
      ecdsaPubJwk: await crypto.subtle.exportKey("jwk", cl.ecdsa.publicKey),
      ecdhPubRawB64: b64(ecdhPubRaw),
      ecdsaPubSpkiB64: b64(ecdsaPubSpki),
      did: did, pq: pq, createdAt: Date.now(), ver: VER,
    };
    await idbSet("identity", pack);
    var pubPack = {
      did: did, alg: "AKSI-HQ1",
      ecdhPub: pack.ecdhPubRawB64, ecdsaPub: pack.ecdsaPubSpkiB64,
      pqPub: pq ? pq.publicKeyB64 : null, pqAlg: pq ? pq.alg : null, createdAt: pack.createdAt,
    };
    try { localStorage.setItem(LS_PUB, JSON.stringify(pubPack)); } catch (e) {}
    identity = { ecdh: cl.ecdh, ecdsa: cl.ecdsa, ecdhPubRaw: ecdhPubRaw, ecdsaPubSpki: ecdsaPubSpki, did: did, pq: pq, createdAt: pack.createdAt };
    appendLedger("pq-identity", did);
    return identity;
  }

  function publicPack() {
    try { return JSON.parse(localStorage.getItem(LS_PUB) || "null"); } catch (e) { return null; }
  }

  async function seal(plaintext, recipientPubPack, opts) {
    opts = opts || {};
    var me = await ensureIdentity();
    var text = String(plaintext);
    var eqs = opts.eqs != null ? opts.eqs : 0.55;
    var hint = opts.hint || text.slice(0, 24);
    if (!recipientPubPack || !recipientPubPack.ecdhPub) throw new Error("Нужен public pack получателя");
    var theirEcdh = unb64(recipientPubPack.ecdhPub);
    var eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    var ephPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
    var sharedCl = await ecdhShared(eph.privateKey, theirEcdh);
    var pqCtB64 = null, sharedPq = null;
    if (recipientPubPack.pqPub) {
      var enc = await pqEncapsulate(unb64(recipientPubPack.pqPub));
      if (enc) {
        pqCtB64 = b64(enc.cipherText);
        sharedPq = enc.sharedSecret instanceof Uint8Array ? enc.sharedSecret : new Uint8Array(enc.sharedSecret);
      }
    }
    var mixed = sharedPq ? concat(sharedCl, sharedPq) : sharedCl;
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var aesKey = await deriveAesKey(mixed, salt, "AKSI-HQ1-seal");
    var aad = await resonanceSeal(eqs, hint);
    var encR = await aesEncrypt(aesKey, utf8(text), aad);
    var header = { v: 1, alg: "AKSI-HQ1", pq: Boolean(pqCtB64), from: me.did, to: recipientPubPack.did || null, eqs: eqs, hint: hint, ts: Date.now() };
    var headerBytes = utf8(JSON.stringify(header));
    var sig = await signBytes(me.ecdsa.privateKey, concat(headerBytes, encR.ct));
    var envelope = {
      type: "aksi-envelope", header: header,
      ephPub: b64(ephPubRaw), salt: b64(salt), iv: b64(encR.iv), ct: b64(encR.ct),
      aad: b64(aad), pqCt: pqCtB64, sig: b64(sig), fromEcdsa: b64(me.ecdsaPubSpki),
    };
    appendLedger("pq-seal", header.from + "→" + (header.to || "?") + "·" + hex(aad).slice(0, 12));
    return envelope;
  }

  async function open(envelope, opts) {
    opts = opts || {};
    var me = await ensureIdentity();
    if (!envelope || envelope.type !== "aksi-envelope") throw new Error("не AKSI envelope");
    var header = envelope.header;
    var aad = unb64(envelope.aad);
    if (opts.strictResonance) {
      var expect = await resonanceSeal(opts.eqs != null ? opts.eqs : header.eqs, header.hint);
      var ok = expect.length === aad.length;
      for (var i = 0; i < expect.length; i++) ok = ok && expect[i] === aad[i];
      if (!ok) throw new Error("Resonance Seal mismatch");
    }
    var headerBytes = utf8(JSON.stringify(header));
    var ct = unb64(envelope.ct);
    var sigOk = await verifyBytes(unb64(envelope.fromEcdsa), concat(headerBytes, ct), unb64(envelope.sig));
    if (!sigOk) throw new Error("Подпись ECDSA неверна");
    var sharedCl = await ecdhShared(me.ecdh.privateKey, unb64(envelope.ephPub));
    var sharedPq = null;
    if (envelope.pqCt && me.pq && me.pq.secretKeyB64) {
      var ss = await pqDecapsulate(unb64(envelope.pqCt), unb64(me.pq.secretKeyB64));
      if (ss) sharedPq = ss instanceof Uint8Array ? ss : new Uint8Array(ss);
    }
    var mixed = sharedPq ? concat(sharedCl, sharedPq) : sharedCl;
    var aesKey = await deriveAesKey(mixed, unb64(envelope.salt), "AKSI-HQ1-seal");
    var pt = await aesDecrypt(aesKey, unb64(envelope.iv), ct, aad);
    appendLedger("pq-open", header.from + "·ok");
    return { text: fromUtf8(pt), header: header, hybrid: Boolean(envelope.pqCt && sharedPq), verified: true };
  }

  async function status() {
    var me = await ensureIdentity();
    var hasPq = Boolean(me.pq && me.pq.publicKeyB64);
    var nobleOk = await loadNoble();
    return {
      version: VER, did: me.did,
      classical: "P-256 ECDH + ECDSA + AES-256-GCM + HKDF",
      postQuantum: hasPq ? "ML-KEM-768 hybrid" : nobleOk ? "PQ lib loaded — refresh identity" : "classical-only",
      pqKeys: hasPq, noble: nobleOk, publicPack: publicPack(),
      mission: "E2E · Resonance Seal · Dual-DID · server sees ciphertext only",
    };
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card"><h2>AKSI-PQ · Post-Quantum</h2>' +
      '<p class="muted">Hybrid P-256 + ML-KEM · Resonance Seal · E2E. Релей не читает plaintext.</p>' +
      '<pre id="pqSt" class="out" style="max-height:160px">…</pre>' +
      '<div class="row"><button type="button" class="btn p" id="pqBoot">Идентичность</button>' +
      '<button type="button" class="btn" id="pqExport">Экспорт pub</button>' +
      '<button type="button" class="btn" id="pqImport">Импорт pub</button></div>' +
      '<textarea id="pqPeer" placeholder="public pack получателя JSON" style="margin-top:10px;min-height:72px"></textarea>' +
      '<textarea id="pqMsg" placeholder="Текст для seal…" style="margin-top:8px;min-height:56px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="pqSeal">Seal (шифр)</button>' +
      '<button type="button" class="btn" id="pqOpen">Open</button></div>' +
      '<textarea id="pqEnv" placeholder="envelope JSON" style="margin-top:10px;min-height:100px"></textarea></div>';
    function show(x) {
      var el = document.getElementById("pqSt");
      if (el) el.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2);
    }
    document.getElementById("pqBoot").onclick = function () {
      show("…"); status().then(show).catch(function (e) { show(String(e.message || e)); });
    };
    document.getElementById("pqExport").onclick = function () {
      ensureIdentity().then(function () {
        var p = publicPack();
        document.getElementById("pqEnv").value = JSON.stringify(p, null, 2);
        show(p);
        try { if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(p)); } catch (e) {}
      });
    };
    document.getElementById("pqImport").onclick = function () {
      try {
        var j = JSON.parse(document.getElementById("pqPeer").value || document.getElementById("pqEnv").value);
        document.getElementById("pqPeer").value = JSON.stringify(j, null, 2);
        show({ imported: j.did || "ok" });
      } catch (e) { show("JSON error: " + e.message); }
    };
    document.getElementById("pqSeal").onclick = function () {
      var peer;
      try { peer = JSON.parse(document.getElementById("pqPeer").value || "{}"); }
      catch (e) { return show("peer JSON invalid"); }
      seal(document.getElementById("pqMsg").value || "", peer, { eqs: 0.55 })
        .then(function (env) {
          document.getElementById("pqEnv").value = JSON.stringify(env, null, 2);
          show({ sealed: true, alg: env.header.alg, pq: env.header.pq });
        }).catch(function (e) { show(String(e.message || e)); });
    };
    document.getElementById("pqOpen").onclick = function () {
      var env;
      try { env = JSON.parse(document.getElementById("pqEnv").value || "{}"); }
      catch (e) { return show("envelope JSON invalid"); }
      open(env).then(function (r) {
        document.getElementById("pqMsg").value = r.text;
        show({ opened: true, hybrid: r.hybrid, from: r.header.from });
      }).catch(function (e) { show(String(e.message || e)); });
    };
    status().then(show).catch(function (e) { show(String(e.message || e)); });
  }

  global.AKSI_PQ = {
    version: VER, ensureIdentity: ensureIdentity, publicPack: publicPack,
    seal: seal, open: open, status: status, resonanceSeal: resonanceSeal,
    loadNoble: loadNoble, mount: mount,
  };
})(typeof window !== "undefined" ? window : this);
