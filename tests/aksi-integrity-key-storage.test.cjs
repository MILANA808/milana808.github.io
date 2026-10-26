const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Integrity uses shared non-extractable key provider and removes legacy private JWK storage', () => {
  const html = fs.readFileSync('integrity/index.html', 'utf8');
  assert.match(html, /<script src="\.\.\/aksi-crypto-provider\.js"><\/script>/);
  assert.match(html, /AKSICryptoProvider\.getKeyPair/);
  assert.match(html, /privateStorageKey: LS_KEY/);
  assert.match(html, /removeKeys: \[LS_KEY\]/);
  assert.doesNotMatch(html, /exportKey\(["']jwk["'],\s*kp\.privateKey\)/);
  assert.doesNotMatch(html, /privJwk:\s*made\.privJwk/);
});
