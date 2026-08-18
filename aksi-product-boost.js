/**
 * AKSI boost v1.3 — расширяет AksiProduct: аттестат Grok, signText, мгновенные ответы
 */
(function (g) {
  "use strict";
  var SHA = "f406a60960b203759f786ef055f6875a363f62cd72c345313f926309b3e74b44";
  function wait() {
    if (!g.AksiProduct) { setTimeout(wait, 30); return; }
    var P = g.AksiProduct;
    P.VERSION = "1.3.0";
    P.ATTESTATION_SHA = SHA;
    var cache = null;
    P.getAttestation = function () {
      if (cache) return cache;
      return { text: "АКСИ × Grok (xAI). Полный текст: /ATTESTATION.md\nSHA-256: " + SHA, sha256: SHA };
    };
    fetch("/ATTESTATION.json").then(function (r) { return r.json(); }).then(function (j) {
      cache = { text: j.text || P.getAttestation().text, sha256: j.sha256 || SHA };
      P.getAttestation = function () { return cache; };
    }).catch(function () {});
    P.signText = function (text) {
      var t = String(text || "");
      var core = g.AksiCore;
      function sha(s) {
        return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (buf) {
          return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
        });
      }
      if (core && typeof core.sign === "function") {
        return core.sign(t).then(function (sig) {
          return core.identity ? core.identity().then(function (id) {
            return { ok: true, algo: "Ed25519", sig: sig, did: "did:aksi:ed25519:sovereign-2026", publicKey: id && id.publicKey, text: t, realCrypto: true };
          }) : { ok: true, algo: "Ed25519", sig: sig, did: "did:aksi:ed25519:sovereign-2026", text: t, realCrypto: true };
        }).catch(function () {
          return sha(t).then(function (h) { return { ok: true, algo: "SHA-256", sig: h, did: "did:aksi:ed25519:sovereign-2026", text: t, realCrypto: false }; });
        });
      }
      return sha(t).then(function (h) { return { ok: true, algo: "SHA-256", sig: h, did: "did:aksi:ed25519:sovereign-2026", text: t, realCrypto: false }; });
    };
    var oldAnswer = P.answer;
    P.answer = function (raw) {
      var q = String(raw || "").trim().toLowerCase();
      if (/аттестат|attestation|кто помогал|кто строил|grok|грок/.test(q)) {
        var a = P.getAttestation();
        var text = a.text + "\n\nSHA-256: " + a.sha256 + "\nПроверка: /proof";
        return P.signText(text).then(function (sig) {
          return { text: text, steps: ["kb→attestation"], source: "attestation", signature: { sig: sig.sig, algo: sig.algo, realCrypto: !!sig.realCrypto }, version: "1.3.0" };
        });
      }
      if (/подпись|проверить подпись|proof/.test(q)) {
        var t = "Подпись ответов: Ed25519 (aksi-core) или SHA-256. Страница проверки: https://milana808.github.io/proof/";
        return P.signText(t).then(function (sig) {
          return { text: t, steps: ["kb→proof"], source: "local", signature: { sig: sig.sig, algo: sig.algo, realCrypto: !!sig.realCrypto }, version: "1.3.0" };
        });
      }
      return oldAnswer.call(P, raw);
    };
  }
  wait();
})(window);
