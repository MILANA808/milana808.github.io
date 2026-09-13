/**
 * AKSI Decision Receipt Protocol v0.1
 * seal · verify · chain — offline, Ed25519, no server
 * Spec: DECISION-RECEIPT.md
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AKSI_RECEIPT = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PROTOCOL = "aksi-decision-receipt";
  const VERSION = "0.1";

  function toHex(buf) {
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  function fromHex(h) {
    if (!h || h.length % 2) throw new Error("bad hex");
    const a = new Uint8Array(h.length / 2);
    for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
    return a.buffer;
  }
  async function sha256Hex(s) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return toHex(b);
  }

  function canonicalJSON(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) return "[" + obj.map((x) => canonicalJSON(x)).join(",") + "]";
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJSON(obj[k])).join(",") + "}";
  }

  function payloadForSign(body) {
    const o = Object.assign({}, body);
    delete o.signature;
    delete o.receipt_id;
    return o;
  }

  async function generateKeyPair() {
    const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    const pub = toHex(await crypto.subtle.exportKey("raw", kp.publicKey));
    const priv = toHex(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
    return { publicKey: kp.publicKey, privateKey: kp.privateKey, pubHex: pub, privHex: priv };
  }

  async function importKeys(pubHex, privHex) {
    const publicKey = await crypto.subtle.importKey(
      "raw",
      fromHex(pubHex),
      { name: "Ed25519" },
      true,
      ["verify"]
    );
    let privateKey = null;
    if (privHex) {
      privateKey = await crypto.subtle.importKey(
        "pkcs8",
        fromHex(privHex),
        { name: "Ed25519" },
        true,
        ["sign"]
      );
    }
    return { publicKey, privateKey, pubHex };
  }

  async function seal(fields, privateKey, pubHex) {
    if (!privateKey) throw new Error("no private key");
    const body = {
      protocol: PROTOCOL,
      version: VERSION,
      query: String(fields.query || ""),
      decision: fields.decision === "ALLOWED" ? "ALLOWED" : "DEFERRED",
      final_answer: String(fields.final_answer || ""),
      confidence: +(+fields.confidence || 0).toFixed(6),
      engine: String(fields.engine || "unknown"),
      eqs: +(+fields.eqs || 0).toFixed(4),
      mode: String(fields.mode || "local"),
      n: Math.max(0, parseInt(fields.n, 10) || 0),
      aksi_score: +(+fields.aksi_score || 0).toFixed(4),
      sources: Array.isArray(fields.sources) ? fields.sources.slice(0, 12) : [],
      policy: String(fields.policy || "companion"),
      prev_receipt_hash: fields.prev_receipt_hash || null,
      public_key: pubHex,
      timestamp: fields.timestamp || new Date().toISOString(),
    };
    const canon = canonicalJSON(payloadForSign(body));
    body.receipt_id = await sha256Hex(canon);
    const sig = await crypto.subtle.sign(
      { name: "Ed25519" },
      privateKey,
      new TextEncoder().encode(canon)
    );
    body.signature = toHex(sig);
    return body;
  }

  async function verify(receipt, publicKeyOrHex) {
    try {
      if (!receipt || receipt.protocol !== PROTOCOL)
        return { ok: false, reason: "protocol mismatch" };
      if (!receipt.signature) return { ok: false, reason: "no signature" };
      let publicKey = publicKeyOrHex;
      if (typeof publicKeyOrHex === "string") {
        publicKey = await crypto.subtle.importKey(
          "raw",
          fromHex(publicKeyOrHex || receipt.public_key),
          { name: "Ed25519" },
          true,
          ["verify"]
        );
      } else if (!publicKey && receipt.public_key) {
        publicKey = await crypto.subtle.importKey(
          "raw",
          fromHex(receipt.public_key),
          { name: "Ed25519" },
          true,
          ["verify"]
        );
      }
      if (!publicKey) return { ok: false, reason: "no public key" };

      const canon = canonicalJSON(payloadForSign(receipt));
      const id = await sha256Hex(canon);
      if (receipt.receipt_id && receipt.receipt_id !== id)
        return { ok: false, reason: "receipt_id mismatch" };

      const valid = await crypto.subtle.verify(
        { name: "Ed25519" },
        publicKey,
        fromHex(receipt.signature),
        new TextEncoder().encode(canon)
      );
      if (!valid) return { ok: false, reason: "signature invalid" };
      return { ok: true, receipt_id: id };
    } catch (e) {
      return { ok: false, reason: e.message || String(e) };
    }
  }

  async function receiptHash(receipt) {
    return sha256Hex(JSON.stringify(receipt));
  }

  async function verifyChain(receipts) {
    if (!Array.isArray(receipts) || !receipts.length)
      return { ok: false, reason: "empty chain" };
    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i];
      const v = await verify(r);
      if (!v.ok) return { ok: false, reason: "receipt " + i + ": " + v.reason, index: i };
      if (i === 0) {
        if (r.prev_receipt_hash && r.prev_receipt_hash !== null)
          return { ok: false, reason: "first receipt should have null prev", index: 0 };
      } else {
        const prevHash = await receiptHash(receipts[i - 1]);
        if (r.prev_receipt_hash !== prevHash)
          return { ok: false, reason: "chain break at " + i, index: i };
      }
    }
    return { ok: true, length: receipts.length };
  }

  function download(receipt, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })
    );
    a.download = filename || "aksi-decision-receipt.json";
    a.click();
  }

  return {
    PROTOCOL,
    VERSION,
    canonicalJSON,
    generateKeyPair,
    importKeys,
    seal,
    verify,
    receiptHash,
    verifyChain,
    download,
    toHex,
    fromHex,
    sha256Hex,
  };
});
