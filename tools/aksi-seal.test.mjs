import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './aksi-seal.mjs';

const cli = fileURLToPath(new URL('./aksi-seal.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('canonical JSON sorts object keys but preserves array order', () => {
  assert.equal(canonical({ z: 1, a: [2, 1] }), '{"a":[2,1],"z":1}');
});

test('SHA-256 uses exact bytes', () => {
  assert.equal(sha256(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('CLI generates keys, signs a file, verifies it and rejects tampering', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aksi-seal-'));
  try {
    const privateKey = path.join(dir, 'private.pem');
    const publicKey = path.join(dir, 'public.pem');
    const source = path.join(dir, 'contract.txt');
    const receipt = path.join(dir, 'contract.aksi.json');
    fs.writeFileSync(source, 'approved version 1\n');

    const generated = run('keygen', '--private', privateKey, '--public', publicKey);
    assert.equal(generated.status, 0, generated.stderr);
    assert.ok(fs.existsSync(privateKey));
    assert.ok(fs.existsSync(publicKey));

    const signed = run('sign', source, '--key', privateKey, '--out', receipt);
    assert.equal(signed.status, 0, signed.stderr);
    const valid = run('verify', source, receipt);
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /"status": "VALID"/);

    fs.writeFileSync(source, 'tampered version 2\n');
    const invalid = run('verify', source, receipt);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /CONTENT_DIGEST_MISMATCH/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
