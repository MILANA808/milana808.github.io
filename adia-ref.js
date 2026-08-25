/**
 * ADIA — AKSI Decision Integrity Algorithm v1.0
 * Reference implementation. Proprietary license.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ADIA = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var VERSION = "1.0.0";
  function shannonH(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var freq = Object.create(null), i, c, n = text.length, h = 0, p;
    for (i = 0; i < n; i++) { c = text.charAt(i); freq[c] = (freq[c] || 0) + 1; }
    for (c in freq) { p = freq[c] / n; h -= p * Math.log(p) / Math.LN2; }
    return h;
  }
  function qcli(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var h = shannonH(text), uniq = {}, i;
    for (i = 0; i < text.length; i++) uniq[text.charAt(i)] = 1;
    var alphabet = Math.min(256, Object.keys(uniq).length);
    var maxH = Math.log(Math.max(2, alphabet)) / Math.LN2;
    return maxH ? Math.min(1, h / maxH) : 0;
  }
  function heff(text) {
    text = String(text || "").trim();
    if (!text) return 0;
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    var set = {};
    for (var i = 0; i < words.length; i++) set[words[i].toLowerCase()] = 1;
    return shannonH(text) * (Object.keys(set).length / words.length);
  }
  function eqs(text, reliability, coherence, ageFactor) {
    var H = shannonH(text || "");
    var R = typeof reliability === "number" ? reliability : 0.85;
    var C = typeof coherence === "number" ? coherence : 0.8;
    var A = typeof ageFactor === "number" ? ageFactor : 0.7;
    var score = 0.3 * (H / 5) + 0.35 * R + 0.25 * C + 0.1 * A;
    score = Math.max(0, Math.min(1, score));
    return Math.round(score * 1000) / 10;
  }
  var STOP = {"и":1,"в":1,"не":1,"на":1,"я":1,"с":1,"что":1,"а":1,"то":1,"как":1,"это":1,"по":1,"из":1,"за":1,"от":1,"для":1,"но":1,"да":1,"ты":1,"вы":1,"мы":1,"the":1,"a":1,"is":1,"to":1,"of":1,"and":1,"in":1,"for":1};
  function stem(w) {
    w = w.toLowerCase();
    if (w.length < 5) return w;
    var ends = ["иями","ями","ами","иях","ях","ов","ев","ом","ем","ах","ию","ью","ия","ья","ие","ье","ый","ий","ой","ая","яя","ое","ее","ые","ать","ять","ить"];
    for (var i = 0; i < ends.length; i++) {
      var e = ends[i];
      if (w.length - e.length >= 3 && w.slice(-e.length) === e) return w.slice(0, -e.length);
    }
    return w;
  }
  function tokens(s) {
    return String(s).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/g, " ").split(/\s+/).map(stem).filter(function (w) { return w.length > 1 && !STOP[w]; });
  }
  function retrieve(query, facts, limit) {
    limit = limit || 5;
    var qt = tokens(query), qset = {}, i;
    for (i = 0; i < qt.length; i++) qset[qt[i]] = 1;
    var low = String(query).toLowerCase(), hits = [];
    for (var f = 0; f < facts.length; f++) {
      var text = typeof facts[f] === "string" ? facts[f] : (facts[f] && facts[f].t) || "";
      if (!text) continue;
      var tt = tokens(text), sc = 0, j;
      for (j = 0; j < tt.length; j++) if (qset[tt[j]]) sc++;
      if (tt.length) sc += (sc / tt.length) * 0.4;
      if (low.length > 3 && text.toLowerCase().indexOf(low) !== -1) sc += 3;
      if (sc > 0) hits.push({ text: text, score: sc, index: f });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, limit);
  }
  function canonical(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) return "[" + obj.map(canonical).join(",") + "]";
    var keys = Object.keys(obj).sort();
    return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + canonical(obj[k]); }).join(",") + "}";
  }
  function sha256HexSyncFallback(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8) + "adiafnv";
  }
  function sha256Hex(str) {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      });
    }
    return Promise.resolve(sha256HexSyncFallback(str));
  }
  function createChain() { return []; }
  function appendEvent(chain, type, payload, eqsScore) {
    var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var body = { type: type, ts: Date.now(), prev: prev, eqs: typeof eqsScore === "number" ? eqsScore : null, payload: payload };
    return sha256Hex(canonical(body)).then(function (hash) {
      body.hash = hash;
      body.id = "e_" + chain.length + "_" + hash.slice(0, 8);
      chain.push(body);
      return body;
    });
  }
  function verifyChain(chain) {
    if (!chain.length) return { ok: true, msg: "empty" };
    for (var i = 0; i < chain.length; i++) {
      var e = chain[i];
      var expectPrev = i === 0 ? "GENESIS" : chain[i - 1].hash;
      if (e.prev !== expectPrev) return { ok: false, msg: "prev break at " + i };
      if (!e.hash) return { ok: false, msg: "missing hash at " + i };
    }
    return { ok: true, msg: "OK · " + chain.length + " events" };
  }
  function fingerprint(seed, material) {
    return sha256Hex(String(seed || "AKSI") + "|" + String(material || "")).then(function (h) {
      return h.slice(0, 16).toUpperCase();
    });
  }
  function localDid(seed, material) {
    return fingerprint(seed, material).then(function (fp) {
      return "did:aksi:local:" + fp.toLowerCase().slice(0, 16);
    });
  }
  return { VERSION: VERSION, shannonH: shannonH, qcli: qcli, heff: heff, eqs: eqs, tokens: tokens, retrieve: retrieve, canonical: canonical, sha256Hex: sha256Hex, createChain: createChain, appendEvent: appendEvent, verifyChain: verifyChain, fingerprint: fingerprint, localDid: localDid };
});
