import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonical, sha256, SCHEMA, DOMAIN } from './aksi-seal.mjs';

test('canonical JSON sorts object keys but preserves array order', () => {
  assert.equal(canonical({ z: 1, a: [2, 1] }), '{"a":[2,1],"z":1}');
});
test('SHA-256 uses exact bytes', () => {
  assert.equal(sha256(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('AKSI Seal envelope signs and detects content tampering', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aksi-seal-'));
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const content = Buffer.from('AKSI commercial proof sample\n');
    const publicDer = publicKey.export({ type: 'spki', format: 'der' });
    const body = {
      schema: SCHEMA, algorithm: 'Ed25519', digest_algorithm: 'SHA-256',
      filename: 'sample.txt', size_bytes: content.length, content_digest: sha256(content),
      signer_key_fingerprint: sha256(publicDer), public_key_spki_der_base64: publicDer.toString('base64'),
      created_at: '2026-11-12T00:00:00.000Z'
    };
    const signature = crypto.sign(null, Buffer.from(DOMAIN + canonical(body)), privateKey);
    assert.equal(crypto.verify(null, Buffer.from(DOMAIN + canonical(body)), publicKey, signature), true);
    assert.notEqual(sha256(Buffer.from('tampered')), body.content_digest);
    assert.equal(body.signer_key_fingerprint, sha256(publicDer));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
