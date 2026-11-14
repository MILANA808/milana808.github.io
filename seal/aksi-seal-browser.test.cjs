"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const Seal = require("./aksi-seal-browser.js");

async function providerFixture() {
  const generated = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privateJwk = await webcrypto.subtle.exportKey("jwk", generated.privateKey);
  const publicJwk = await webcrypto.subtle.exportKey("jwk", generated.publicKey);
  const privateKey = await webcrypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return {
    async getKeyPair(id) { return { id, privateKey, publicKey: generated.publicKey, publicJwk, extractable: false }; },
    async sign(id, data) {
      return { signature: await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(data)), publicJwk, keyId: id };
    },
    async verify(data, signature, jwk) {
      const key = await webcrypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
      return webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, new TextEncoder().encode(data));
    }
  };
}

test("canonical JSON is deterministic", () => {
  assert.equal(Seal.canonical({ z: 1, a: [2, 1] }), '{"a":[2,1],"z":1}');
});

test("browser receipt signs exact file bytes and verifies offline", async () => {
  const provider = await providerFixture();
  const bytes = new TextEncoder().encode("AKSI Seal approved file v1\n");
  const receipt = await Seal.createReceipt({ fileName: "report.txt", bytes, keyId: "test-key", provider, cryptoApi: webcrypto });
  assert.equal(receipt.schema, "aksi-seal-browser/v1");
  assert.equal(receipt.algorithm, "ECDSA-P256-SHA256");
  assert.equal(receipt.size_bytes, bytes.byteLength);
  assert.equal(typeof receipt.signer_key_fingerprint, "string");
  const valid = await Seal.verifyReceipt({ bytes, receipt, provider, cryptoApi: webcrypto });
  assert.equal(valid.valid, true);
  assert.equal(valid.signature_valid, true);
  assert.equal(valid.signer_trusted, false);
  const pinned = await Seal.verifyReceipt({ bytes, receipt, provider, cryptoApi: webcrypto, expectedFingerprint: receipt.signer_key_fingerprint });
  assert.equal(pinned.valid, true);
  assert.equal(pinned.signer_trusted, true);
});

test("browser receipt rejects changed bytes, altered body and wrong pinned fingerprint", async () => {
  const provider = await providerFixture();
  const bytes = new TextEncoder().encode("original bytes");
  const receipt = await Seal.createReceipt({ fileName: "file.bin", bytes, keyId: "test-key", provider, cryptoApi: webcrypto });
  const changed = await Seal.verifyReceipt({ bytes: new TextEncoder().encode("modified bytes"), receipt, provider, cryptoApi: webcrypto });
  assert.equal(changed.valid, false);
  assert.ok(changed.errors.includes("CONTENT_DIGEST_MISMATCH"));
  const altered = { ...receipt, filename: "forged-name.bin" };
  const invalidSignature = await Seal.verifyReceipt({ bytes, receipt: altered, provider, cryptoApi: webcrypto });
  assert.equal(invalidSignature.valid, false);
  assert.ok(invalidSignature.errors.includes("SIGNATURE_INVALID"));
  const wrongPin = await Seal.verifyReceipt({ bytes, receipt, provider, cryptoApi: webcrypto, expectedFingerprint: "0".repeat(64) });
  assert.equal(wrongPin.valid, false);
  assert.ok(wrongPin.errors.includes("UNTRUSTED_SIGNER_FINGERPRINT"));
});
