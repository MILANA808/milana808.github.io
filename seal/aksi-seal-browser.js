(function (root) {
  "use strict";
  const SCHEMA = "aksi-seal-browser/v1";
  const DOMAIN = "AKSI-SEAL:BROWSER:V1\n";
  const ALGORITHM = { name: "ECDSA", namedCurve: "P-256" };
  const SIGN_ALGORITHM = { name: "ECDSA", hash: "SHA-256" };

  function canonical(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  function bytesOf(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new TypeError("Expected file bytes");
  }
  function toBase64(value) {
    const bytes = bytesOf(value);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    return root.btoa(binary);
  }
  function fromBase64(value) {
    const binary = root.atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  async function sha256(bytes, cryptoApi) {
    const digest = await cryptoApi.subtle.digest("SHA-256", bytesOf(bytes));
    return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("");
  }
  async function fingerprint(publicJwk, cryptoApi) {
    return sha256(new TextEncoder().encode(canonical(publicJwk)), cryptoApi);
  }
  async function createReceipt(args) {
    const cryptoApi = args.cryptoApi || root.crypto;
    const provider = args.provider || root.AKSICryptoProvider;
    if (!provider || typeof provider.getKeyPair !== "function" || typeof provider.sign !== "function") throw new Error("AKSI non-extractable key provider is unavailable");
    const bytes = bytesOf(args.bytes);
    const keyId = String(args.keyId || "").trim();
    if (!keyId || keyId.length > 160) throw new Error("Invalid signing key identifier");
    const pair = await provider.getKeyPair(keyId, { algorithm: ALGORITHM, signAlgorithm: SIGN_ALGORITHM });
    if (pair.extractable !== false) throw new Error("Refusing to use an extractable private key");
    const publicJwk = pair.publicJwk;
    const body = {
      schema: SCHEMA,
      algorithm: "ECDSA-P256-SHA256",
      digest_algorithm: "SHA-256",
      filename: String(args.fileName || "unnamed").slice(0, 255),
      size_bytes: bytes.byteLength,
      content_digest: await sha256(bytes, cryptoApi),
      signer_key_fingerprint: await fingerprint(publicJwk, cryptoApi),
      public_key_jwk: publicJwk,
      key_id: keyId,
      created_at: new Date().toISOString()
    };
    const signed = await provider.sign(keyId, DOMAIN + canonical(body), { algorithm: ALGORITHM, signAlgorithm: SIGN_ALGORITHM });
    if (!signed || !signed.signature) throw new Error("Signing provider returned no signature");
    return Object.assign({}, body, { signature_base64: toBase64(signed.signature) });
  }
  async function verifyReceipt(args) {
    const cryptoApi = args.cryptoApi || root.crypto;
    const provider = args.provider || root.AKSICryptoProvider;
    const bytes = bytesOf(args.bytes);
    const receipt = args.receipt;
    const errors = [];
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return { valid: false, errors: ["RECEIPT_INVALID"] };
    const body = Object.assign({}, receipt);
    const signatureBase64 = body.signature_base64;
    delete body.signature_base64;
    if (body.schema !== SCHEMA) errors.push("SCHEMA_UNSUPPORTED");
    if (body.algorithm !== "ECDSA-P256-SHA256" || body.digest_algorithm !== "SHA-256") errors.push("ALGORITHM_UNSUPPORTED");
    if (body.size_bytes !== bytes.byteLength) errors.push("SIZE_MISMATCH");
    if (body.content_digest !== await sha256(bytes, cryptoApi)) errors.push("CONTENT_DIGEST_MISMATCH");
    if (!body.public_key_jwk || typeof body.public_key_jwk !== "object") errors.push("PUBLIC_KEY_MISSING");
    else if (body.signer_key_fingerprint !== await fingerprint(body.public_key_jwk, cryptoApi)) errors.push("KEY_FINGERPRINT_MISMATCH");
    const expected = String(args.expectedFingerprint || "").trim().toLowerCase();
    if (expected && body.signer_key_fingerprint !== expected) errors.push("UNTRUSTED_SIGNER_FINGERPRINT");
    let signatureValid = false;
    if (signatureBase64 && body.public_key_jwk && provider && typeof provider.verify === "function") {
      try {
        signatureValid = await provider.verify(DOMAIN + canonical(body), fromBase64(signatureBase64), body.public_key_jwk, { algorithm: ALGORITHM, signAlgorithm: SIGN_ALGORITHM });
      } catch (_) { signatureValid = false; }
      if (!signatureValid) errors.push("SIGNATURE_INVALID");
    } else errors.push("SIGNATURE_MISSING_OR_VERIFIER_UNAVAILABLE");
    return {
      valid: errors.length === 0,
      errors,
      integrity_valid: errors.length === 0,
      signature_valid: signatureValid,
      signer_fingerprint: body.signer_key_fingerprint || null,
      signer_trusted: !!expected && body.signer_key_fingerprint === expected,
      note: expected ? "Fingerprint pinning was supplied separately by the verifier." : "Signature consistency only; signer identity is not independently trusted."
    };
  }
  const api = { version: "1.0.0", schema: SCHEMA, canonical, sha256, fingerprint, createReceipt, verifyReceipt };
  root.AKSIBrowserSeal = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
