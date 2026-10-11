/**
 * AKSI Product Seal — experimental classical seal (NOT post-quantum)
 * Classical ECDSA P-256 + non-standard experimental hash commitment
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-seal";
  async function sharedKeyPair(id, legacy) {
    if (!G.AKSICryptoProvider) {
      if (!G.__AKSI_CRYPTO_PROVIDER_PROMISE) {
        G.__AKSI_CRYPTO_PROVIDER_PROMISE = new Promise(function (resolve, reject) {
          if (!G.document) { reject(new Error("AKSI crypto provider unavailable")); return; }
          var script = G.document.createElement("script");
          script.src = "/aksi-crypto-provider.js?v=1";
          script.async = true;
          script.onload = function () { G.AKSICryptoProvider ? resolve(G.AKSICryptoProvider) : reject(new Error("AKSI crypto provider did not initialize")); };
          script.onerror = function () { reject(new Error("Cannot load AKSI crypto provider")); };
          G.document.head.appendChild(script);
        });
      }
      await G.__AKSI_CRYPTO_PROVIDER_PROMISE;
    }
    return G.AKSICryptoProvider.getKeyPair(id, { algorithm: { name: "ECDSA", namedCurve: "P-256" }, privateUsages: ["sign"], legacy: legacy });
  }
  var MANIFEST = {
    product: "AKSI Decision Integrity Platform",
    codename: "WHOLE / MIND",
    version: "2026.08-world",
    vendor: "AKSI",
    contact: "aksilove@internet.ru",
    license: "Proprietary",
    principles: [
      "Local-first: user data stays on device by default",
      "Proof over magic: hash-chain + Trust Compiler",
      "Post-quantum cryptography: NOT IMPLEMENTED; no PQ security claim",
      "Provider-agnostic intelligence layer",
      "Sovereign identity (DID) never leaves browser without consent",
    ],
    modules: [
      "MIND", "Brain", "Trust", "Quantum", "DKV", "Photo/Vision",
      "LLM Adapter", "Overlay AOP/1", "Proof Ledger", "Experimental hash commitment (not PQ cryptography)",
    ],
    claims: { offline_core: true, pq_hybrid_seal: false, byok_llm: true, no_default_telemetry: true },
    runtime: "https://milana808.github.io/",
    product_url: "https://milana808.github.io/product/",
  };
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function hex(buf) {
    var u = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    var h = ""; for (var i = 0; i < u.length; i++) h += ("0" + u[i].toString(16)).slice(-2); return h;
  }
  function b64(buf) {
    var u = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    var s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s);
  }
  async function sha(algo, data) {
    var buf = data instanceof Uint8Array ? data : utf8(data);
    return new Uint8Array(await crypto.subtle.digest(algo, buf));
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
  async function pqCommitment(payload) {
    var salt = crypto.getRandomValues(new Uint8Array(32));
    var p = utf8(payload);
    var h256 = await sha("SHA-256", concat(salt, p));
    var h512 = await sha("SHA-512", concat(p, salt, h256));
    var state = h512;
    for (var i = 0; i < 8; i++) {
      state = await sha("SHA-512", concat(state, h256, utf8("AKSI-PQ-" + i)));
    }
    return {
      alg: "AKSI-PQ-COMMIT-v1",
      note: "Non-standard experimental hash commitment only. NOT a post-quantum signature, KEM, or security guarantee. ML-DSA/ML-KEM support is not implemented.",
      salt_b64: b64(salt),
      sha256: hex(h256),
      commit: hex(state).slice(0, 128),
    };
  }
  async function ensureKey() {
    var pair = await sharedKeyPair("aksi:seal:ecdsa:v1", {
      storageKey: "aksi:seal:ecdsa:v1", privateField: "priv", publicField: "pub"
    });
    return { priv: pair.privateKey, pub: pair.publicKey, pubJwk: pair.publicJwk };
  }
  async function signManifest(extra) {
    var body = Object.assign({}, MANIFEST, extra || {}, { sealed_at: new Date().toISOString(), seal_engine: VER });
    var canonical = JSON.stringify(body, Object.keys(body).sort());
    var pq = await pqCommitment(canonical);
    var keys = await ensureKey();
    var digest = await sha("SHA-256", canonical + "|" + pq.commit);
    var sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.priv, digest));
    var attestation = {
      type: "AKSI-WORLD-ATTESTATION",
      schema: "aksi.seal/1",
      manifest: body,
      pq: pq,
      classical: {
        alg: "ECDSA-P256-SHA256",
        public_jwk: keys.pubJwk,
        signature_b64: b64(sig),
        message_sha256: hex(digest),
      },
      banner: "AKSI WORLD RELEASE — CLASSICAL ECDSA + EXPERIMENTAL HASH COMMITMENT (NOT POST-QUANTUM) · " + body.version + " · " + body.contact,
    };
    try { localStorage.setItem("aksi:world:attestation:v1", JSON.stringify(attestation)); } catch (e) {}
    return attestation;
  }
  async function verifyAttestation(att) {
    if (!att || !att.classical || !att.manifest) return { ok: false, reason: "malformed" };
    try {
      var body = att.manifest;
      var canonical = JSON.stringify(body, Object.keys(body).sort());
      var digest = await sha("SHA-256", canonical + "|" + (att.pq && att.pq.commit));
      if (hex(digest) !== att.classical.message_sha256) return { ok: false, reason: "digest mismatch" };
      var pub = await crypto.subtle.importKey("jwk", att.classical.public_jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
      var sigBin = atob(att.classical.signature_b64);
      var sig = new Uint8Array(sigBin.length);
      for (var i = 0; i < sigBin.length; i++) sig[i] = sigBin.charCodeAt(i);
      var ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, sig, digest);
      return { ok: ok, pq_alg: att.pq && att.pq.alg, classical: att.classical.alg };
    } catch (e) { return { ok: false, reason: String(e.message || e) }; }
  }
  function downloadJSON(obj, name) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name || "AKSI-WORLD-ATTESTATION.json";
    a.click();
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>⚡ World Seal · Classical Signature</h2>' +
      '<p class="muted">Публичная аттестация: ECDSA P-256 + AKSI-PQ-COMMIT</p>' +
      '<div class="row"><button type="button" class="btn primary" id="sealGen">Подписать громко</button>' +
      '<button type="button" class="btn" id="sealDl">Скачать JSON</button>' +
      '<button type="button" class="btn" id="sealVer">Проверить</button></div>' +
      '<pre class="out" id="sealOut">—</pre></div>';
    var last = null;
    document.getElementById("sealGen").onclick = function () {
      document.getElementById("sealOut").textContent = "Sealing…";
      signManifest().then(function (att) {
        last = att;
        document.getElementById("sealOut").textContent = att.banner + "\n\n" + JSON.stringify({
          version: att.manifest.version, pq: att.pq.alg,
          commit: att.pq.commit.slice(0, 32) + "…",
          sig: att.classical.signature_b64.slice(0, 40) + "…",
          contact: att.manifest.contact,
        }, null, 2);
        var b = document.getElementById("stBadge");
        if (b) b.textContent = "ECDSA SEALED";
      });
    };
    document.getElementById("sealDl").onclick = function () {
      if (!last) signManifest().then(function (att) { last = att; downloadJSON(att); });
      else downloadJSON(last);
    };
    document.getElementById("sealVer").onclick = function () {
      if (!last) try { last = JSON.parse(localStorage.getItem("aksi:world:attestation:v1") || "null"); } catch (e) {}
      if (!last) { document.getElementById("sealOut").textContent = "Сначала подпишите."; return; }
      verifyAttestation(last).then(function (r) {
        document.getElementById("sealOut").textContent =
          (r.ok ? "✓ ПОДПИСЬ ВЕРНА" : "✗ Ошибка: " + r.reason) + "\n" + JSON.stringify(r, null, 2);
      });
    };
  }
  G.AKSI_SEAL = { version: VER, MANIFEST: MANIFEST, sign: signManifest, verify: verifyAttestation, mount: mount, download: downloadJSON };
})(typeof window !== "undefined" ? window : this);
