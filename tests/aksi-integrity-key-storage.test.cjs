const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("integrity/index.html", "utf8");
const provider = fs.readFileSync("aksi-crypto-provider.js", "utf8");

test("Integrity loads the shared crypto provider before its application code", () => {
  assert.match(html, /<script src="\.\.\/aksi-crypto-provider\.js"><\/script>/);
});

test("Integrity no longer exports, imports, or persists private JWK material", () => {
  assert.doesNotMatch(html, /exportKey\(["']jwk["'],\s*[^)]*privateKey/);
  assert.doesNotMatch(html, /privJwk\s*:/);
  assert.doesNotMatch(html, /importKey\(["']jwk["'],\s*[^)]*priv/i);
  assert.match(html, /AKSICryptoProvider\.getKeyPair/);
  assert.match(html, /privateStorageKey:\s*LS_KEY/);
  assert.match(html, /removeKeys:\s*\[LS_KEY\]/);
});

test("shared provider persists a non-extractable private CryptoKey and fails closed", () => {
  assert.match(provider, /importKey\('jwk',\s*privateJwk,\s*algorithm,\s*false,\s*usages\)/);
  assert.match(provider, /if \(pair\.extractable\) throw new Error/);
  assert.match(provider, /IndexedDB unavailable; refusing plaintext key fallback/);
});

test("rotated key identity survives reload through a non-secret active-key pointer", () => {
  assert.match(html, /var LS_ACTIVE_KEY = "aksi_integrity_active_key_v1"/);
  assert.match(html, /localStorage\.setItem\(LS_ACTIVE_KEY, keyId\)/);
  assert.match(html, /localStorage\.getItem\(LS_ACTIVE_KEY\) \|\| "aksi-integrity-v1"/);
  assert.match(html, /crypto\.getRandomValues\(new Uint8Array\(12\)\)/);
});

test("Integrity uses the provider key only for ECDSA-P256 signing", () => {
  assert.match(html, /name: "ECDSA", hash: "SHA-256"/);
  assert.doesNotMatch(html, /name: "Ed25519"/);
});
