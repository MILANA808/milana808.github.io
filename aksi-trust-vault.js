/**
 * AKSI Trust Vault — AES-GCM encrypt/export/import of local RAG DB
 */
(function (G) {
  "use strict";
  function bufToB64(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function b64ToBuf(b64) {
    var s = atob(b64), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b.buffer;
  }
  async function deriveKey(passphrase, salt) {
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(passphrase || "")), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function seal(plain, passphrase) {
    if (!passphrase || String(passphrase).length < 4) throw new Error("Пароль минимум 4 символа");
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(passphrase, salt);
    var data = new TextEncoder().encode(JSON.stringify(plain));
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
    return { type: "aksi-vault", version: 1, alg: "AES-256-GCM", kdf: "PBKDF2-SHA256-150k", salt: bufToB64(salt.buffer), iv: bufToB64(iv.buffer), ciphertext: bufToB64(ct), sealedAt: Date.now() };
  }
  async function open(envelope, passphrase) {
    if (!envelope || envelope.type !== "aksi-vault") throw new Error("Не файл АКСИ vault");
    if (!passphrase) throw new Error("Нужен пароль");
    try {
      var salt = new Uint8Array(b64ToBuf(envelope.salt));
      var iv = new Uint8Array(b64ToBuf(envelope.iv));
      var key = await deriveKey(passphrase, salt);
      var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, b64ToBuf(envelope.ciphertext));
      return JSON.parse(new TextDecoder().decode(pt));
    } catch (e) { throw new Error("Неверный пароль или повреждённый файл"); }
  }
  function downloadAksi(envelope, filename) {
    var blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = filename || "memory-" + Date.now() + ".aksi"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function readFileAsJson(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { try { resolve(JSON.parse(String(fr.result || ""))); } catch (e) { reject(new Error("Файл не JSON")); } };
      fr.onerror = function () { reject(new Error("Ошибка чтения")); };
      fr.readAsText(file);
    });
  }
  async function exportEncrypted(passphrase) {
    if (!G.AKSI_RAG) throw new Error("RAG не загружен");
    var plain = AKSI_RAG.exportPlain();
    var env = await seal(plain, passphrase);
    downloadAksi(env);
    return { ok: true, docs: (plain.docs && plain.docs.length) || 0 };
  }
  async function importEncrypted(fileOrEnvelope, passphrase) {
    var env = fileOrEnvelope;
    if (fileOrEnvelope && fileOrEnvelope.name) env = await readFileAsJson(fileOrEnvelope);
    var plain = await open(env, passphrase);
    if (!G.AKSI_RAG) throw new Error("RAG не загружен");
    var n = AKSI_RAG.importPlain(plain);
    return { ok: true, docs: n };
  }
  G.AKSI_TRUST_VAULT = { seal: seal, open: open, downloadAksi: downloadAksi, readFileAsJson: readFileAsJson, exportEncrypted: exportEncrypted, importEncrypted: importEncrypted };
})(typeof window !== "undefined" ? window : globalThis);
