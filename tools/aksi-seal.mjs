#!/usr/bin/env node
'use strict';

// AKSI Seal v1: SHA-256 content digest + Ed25519 signature over a domain-separated canonical envelope.
// The embedded public key verifies integrity, but identity/trust requires comparing its fingerprint out of band.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SCHEMA = 'aksi-seal/v1';
const DOMAIN = 'AKSI-SEAL:FILE:V1\n';

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function readArg(args, name, fallback = null) {
  const i = args.indexOf(name);
  return i < 0 ? fallback : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null);
}
function required(value, label) {
  if (!value) throw new Error('Missing required argument: ' + label);
  return value;
}
function writePrivate(file, key) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, key, { mode: 0o600, flag: 'wx' });
}
function usage() {
  process.stdout.write(`AKSI Seal v1 — local file integrity and authorship proof

Commands:
  node tools/aksi-seal.mjs keygen --private private.pem --public public.pem
  node tools/aksi-seal.mjs sign <file> --key private.pem --out file.aksi.json
  node tools/aksi-seal.mjs verify <file> <file.aksi.json> [--fingerprint SHA256]

Keep the private key offline. A valid signature proves the signed bytes were not changed
and that the matching private key signed them; it does not prove the document is true,
the signer is a named person, or the timestamp is trusted.
`);
}
function keygen(args) {
  const privatePath = required(readArg(args, '--private'), '--private');
  const publicPath = required(readArg(args, '--public'), '--public');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  writePrivate(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  fs.mkdirSync(path.dirname(path.resolve(publicPath)), { recursive: true });
  fs.writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }), { flag: 'wx' });
  process.stdout.write(JSON.stringify({ algorithm: 'Ed25519', public_key_file: publicPath, private_key_file: privatePath, warning: 'Back up the private key securely. Never upload it.' }, null, 2) + '\n');
}
function sign(args) {
  const file = required(args.find(x => !x.startsWith('--')), '<file>');
  const keyPath = required(readArg(args, '--key'), '--key');
  const out = required(readArg(args, '--out'), '--out');
  const bytes = fs.readFileSync(file);
  const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath));
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('Signing key must be Ed25519');
  const publicKey = crypto.createPublicKey(privateKey);
  const publicDer = publicKey.export({ type: 'spki', format: 'der' });
  const body = {
    schema: SCHEMA,
    algorithm: 'Ed25519',
    digest_algorithm: 'SHA-256',
    filename: path.basename(file),
    size_bytes: bytes.length,
    content_digest: sha256(bytes),
    signer_key_fingerprint: sha256(publicDer),
    public_key_spki_der_base64: publicDer.toString('base64'),
    created_at: new Date().toISOString()
  };
  const signature = crypto.sign(null, Buffer.from(DOMAIN + canonical(body)), privateKey).toString('base64');
  const receipt = { ...body, signature_base64: signature };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ status: 'SIGNED', receipt: out, fingerprint: body.signer_key_fingerprint, content_digest: body.content_digest }, null, 2) + '\n');
}
function verify(file, receiptFile, expectedFingerprint) {
  const bytes = fs.readFileSync(file);
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  const { signature_base64, ...body } = receipt;
  const errors = [];
  if (body.schema !== SCHEMA) errors.push('SCHEMA_UNSUPPORTED');
  if (body.algorithm !== 'Ed25519' || body.digest_algorithm !== 'SHA-256') errors.push('ALGORITHM_UNSUPPORTED');
  if (body.size_bytes !== bytes.length) errors.push('SIZE_MISMATCH');
  if (body.content_digest !== sha256(bytes)) errors.push('CONTENT_DIGEST_MISMATCH');
  let publicKey;
  try {
    const der = Buffer.from(body.public_key_spki_der_base64 || '', 'base64');
    if (sha256(der) !== body.signer_key_fingerprint) errors.push('KEY_FINGERPRINT_MISMATCH');
    if (expectedFingerprint && body.signer_key_fingerprint !== expectedFingerprint.toLowerCase()) errors.push('UNTRUSTED_SIGNER_FINGERPRINT');
    publicKey = crypto.createPublicKey({ key: der, type: 'spki', format: 'der' });
    if (publicKey.asymmetricKeyType !== 'ed25519') errors.push('PUBLIC_KEY_TYPE_INVALID');
  } catch { errors.push('PUBLIC_KEY_INVALID'); }
  if (publicKey && signature_base64) {
    try {
      const ok = crypto.verify(null, Buffer.from(DOMAIN + canonical(body)), publicKey, Buffer.from(signature_base64, 'base64'));
      if (!ok) errors.push('SIGNATURE_INVALID');
    } catch { errors.push('SIGNATURE_INVALID'); }
  } else errors.push('SIGNATURE_MISSING');
  const result = { status: errors.length ? 'INVALID' : 'VALID', integrity_valid: errors.length === 0, signer_fingerprint: body.signer_key_fingerprint || null, errors };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (errors.length) process.exitCode = 1;
}
function main(argv) {
  const [command, ...args] = argv;
  if (!command || command === '--help' || command === 'help') return usage();
  if (command === 'keygen') return keygen(args);
  if (command === 'sign') return sign(args);
  if (command === 'verify') {
    const file = args.find(x => !x.startsWith('--'));
    const rest = args.filter(x => x !== file && !x.startsWith('--'));
    const receipt = rest[0];
    return verify(required(file, '<file>'), required(receipt, '<receipt>'), readArg(args, '--fingerprint'));
  }
  throw new Error('Unknown command: ' + command);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write('AKSI Seal error: ' + error.message + '\n'); process.exitCode = 2; }
}

export { canonical, sha256, SCHEMA, DOMAIN, main };
