/**
 * AKSICortexKernel — AES-GCM vault + quantum resonance (no deps)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0-cortex-kernel";
  var N_QUBITS = 6;
  var DIM = 1 << N_QUBITS;
  var PBKDF2_ITERS = 120000;
  var MAX_CHUNK = 12000;
  var STORAGE_KEY = "aksi:cortex:vault:v1";
  var te = new TextEncoder();
  var td = new TextDecoder();

  function C(re, im) { return { re: re || 0, im: im || 0 }; }
  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cscale(a, s) { return C(a.re * s, a.im * s); }
  function cconj(a) { return C(a.re, -a.im); }
  function cabs2(a) { return a.re * a.re + a.im * a.im; }
  function cexp_i(theta) { return C(Math.cos(theta), Math.sin(theta)); }
  function normalize(st) {
    var nrm = 0, i;
    for (i = 0; i < st.length; i++) nrm += cabs2(st[i]);
    nrm = Math.sqrt(nrm);
    if (nrm < 1e-15) return st;
    for (i = 0; i < st.length; i++) st[i] = cscale(st[i], 1 / nrm);
    return st;
  }
  function inner(a, b) {
    var re = 0, im = 0, n = Math.min(a.length, b.length), i, p;
    for (i = 0; i < n; i++) {
      p = cmul(cconj(a[i]), b[i]);
      re += p.re; im += p.im;
    }
    return C(re, im);
  }
  function fidelity(a, b) { return cabs2(inner(a, b)); }
  function utf8(s) { return te.encode(String(s)); }
  function b64(buf) {
    var u = buf instanceof Uint8Array ? buf : new Uint8Array(buf), s = "", i;
    for (i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function unb64(s) {
    var bin = atob(s), u = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  async function sha256(data) {
    var buf = data instanceof Uint8Array ? data : utf8(data);
    return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  }
  function fnv1a(str) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function encodeToState(text) {
    var st = new Array(DIM), i, s, seed, tokens, t, tok, h, idx, phase, amp, w, spread, j;
    for (i = 0; i < DIM; i++) st[i] = C(0, 0);
    s = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!s) { st[0] = C(1, 0); return st; }
    seed = fnv1a(s);
    tokens = s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!tokens.length) {
      st[seed % DIM] = cexp_i((seed % 6283) / 1000);
      return normalize(st);
    }
    for (t = 0; t < tokens.length; t++) {
      tok = tokens[t];
      h = fnv1a(tok + ":" + t + ":" + seed);
      idx = h % DIM;
      phase = ((h >>> 8) % 628319) / 100000;
      amp = cexp_i(phase);
      w = 1 / (1 + t * 0.15);
      st[idx] = cadd(st[idx], cscale(amp, w));
    }
    spread = new Array(DIM);
    for (i = 0; i < DIM; i++) spread[i] = C(st[i].re, st[i].im);
    for (i = 0; i < DIM; i++) {
      if (cabs2(st[i]) < 1e-18) continue;
      j = (i + 1) % DIM;
      spread[j] = cadd(spread[j], cscale(st[i], 0.12));
    }
    return normalize(spread);
  }
  function stateToFlat(st) {
    var out = new Array(st.length * 2), i;
    for (i = 0; i < st.length; i++) { out[i * 2] = st[i].re; out[i * 2 + 1] = st[i].im; }
    return out;
  }
  function flatToState(flat) {
    var st = new Array(flat.length >> 1), i;
    for (i = 0; i < st.length; i++) st[i] = C(flat[i * 2], flat[i * 2 + 1]);
    return st;
  }
  async function deriveKey(password, salt) {
    var base = await crypto.subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
  }
  async function encryptText(plaintext, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(password, salt);
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, utf8(plaintext));
    return { saltB64: b64(salt), ivB64: b64(iv), ctB64: b64(ct) };
  }
  async function decryptText(pack, password) {
    var key = await deriveKey(password, unb64(pack.saltB64));
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(pack.ivB64) }, key, unb64(pack.ctB64));
    return td.decode(pt);
  }
  function loadVault() {
    try {
      if (typeof localStorage === "undefined") return [];
      var arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveVault(entries) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  function newId() {
    var r = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(r, function (x) { return x.toString(16).padStart(2, "0"); }).join("");
  }

  function AKSICortexKernel() {
    this._password = null;
    this._vault = loadVault();
  }
  Object.defineProperty(AKSICortexKernel.prototype, "version", { get: function () { return VERSION; } });
  Object.defineProperty(AKSICortexKernel.prototype, "size", { get: function () { return this._vault.length; } });
  Object.defineProperty(AKSICortexKernel.prototype, "nQubits", { get: function () { return N_QUBITS; } });
  Object.defineProperty(AKSICortexKernel.prototype, "dim", { get: function () { return DIM; } });

  AKSICortexKernel.prototype.setSessionPassword = function (password) {
    this._password = password ? String(password) : null;
  };
  AKSICortexKernel.prototype.clearSession = function (opts) {
    opts = opts || {};
    this._password = null;
    if (opts.wipeVault) { this._vault = []; saveVault([]); }
  };
  AKSICortexKernel.prototype.ingestDocument = async function (text, password) {
    var body = String(text == null ? "" : text).trim();
    if (!body) throw new Error("AKSICortexKernel.ingestDocument: empty text");
    if (!password) throw new Error("AKSICortexKernel.ingestDocument: password required");
    this._password = String(password);
    var pieces = [], i, piece, pack, state, digest, previewHash, entry, last = null;
    if (body.length <= MAX_CHUNK) pieces.push(body);
    else for (i = 0; i < body.length; i += MAX_CHUNK) pieces.push(body.slice(i, i + MAX_CHUNK));
    for (i = 0; i < pieces.length; i++) {
      piece = pieces[i];
      pack = await encryptText(piece, password);
      state = encodeToState(piece);
      digest = await sha256(utf8(piece));
      previewHash = Array.from(digest.slice(0, 8)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
      entry = {
        id: newId(), ts: Date.now(),
        saltB64: pack.saltB64, ivB64: pack.ivB64, ctB64: pack.ctB64,
        stateFlat: stateToFlat(state), previewHash: previewHash, chars: piece.length
      };
      this._vault.push(entry);
      last = { id: entry.id, chars: entry.chars, fidelitySelf: fidelity(state, state) };
    }
    saveVault(this._vault);
    return last;
  };
  AKSICortexKernel.prototype.resonantQuery = async function (queryText) {
    var q = String(queryText == null ? "" : queryText).trim();
    if (!q) return null;
    if (!this._password) throw new Error("AKSICortexKernel.resonantQuery: no session password");
    if (!this._vault.length) return null;
    var qState = encodeToState(q), bestIdx = -1, bestScore = -1, i, score, win, plain;
    for (i = 0; i < this._vault.length; i++) {
      score = fidelity(qState, flatToState(this._vault[i].stateFlat));
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx < 0 || bestScore < 1e-12) return null;
    win = this._vault[bestIdx];
    try {
      plain = await decryptText({ saltB64: win.saltB64, ivB64: win.ivB64, ctB64: win.ctB64 }, this._password);
    } catch (e) { return null; }
    return { text: plain, score: bestScore, id: win.id, chars: win.chars };
  };
  AKSICortexKernel.prototype.rank = function (queryText, k) {
    k = k || 3;
    var qState = encodeToState(String(queryText == null ? "" : queryText));
    var ranked = this._vault.map(function (e) {
      return { id: e.id, score: fidelity(qState, flatToState(e.stateFlat)), chars: e.chars, ts: e.ts };
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked.slice(0, Math.max(1, k));
  };
  AKSICortexKernel.prototype.listMeta = function () {
    return this._vault.map(function (e) {
      return { id: e.id, ts: e.ts, chars: e.chars, previewHash: e.previewHash };
    });
  };
  AKSICortexKernel.prototype.remove = function (id) {
    var n = this._vault.length;
    this._vault = this._vault.filter(function (e) { return e.id !== id; });
    if (this._vault.length !== n) { saveVault(this._vault); return true; }
    return false;
  };

  var cortexKernel = new AKSICortexKernel();
  G.AKSICortexKernel = AKSICortexKernel;
  G.AKSI_CORTEX_KERNEL = cortexKernel;
})(typeof window !== "undefined" ? window : globalThis);
