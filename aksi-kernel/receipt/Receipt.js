/**
 * AKSI Receipt — ECDSA P-256 (prime256v1) signed decision receipts.
 * Offline verify. Node.js crypto only.
 */
import {
  generateKeyPairSync,
  createHash,
  createSign,
  createVerify,
  createPrivateKey,
  createPublicKey,
} from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_DIR = join(__dirname, '../.keys');
const PRIV_PATH = join(KEY_DIR, 'aksi-permit-priv.pem');
const PUB_PATH = join(KEY_DIR, 'aksi-permit-pub.pem');

const SCHEMA = 'aksi-permit/v1';
const ALG = 'ECDSA-P256-SHA256';

function sha256Hex(data) {
  return createHash('sha256').update(typeof data === 'string' ? data : Buffer.from(data)).digest('hex');
}

function canon(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

export function ensureKeyPair() {
  if (!existsSync(KEY_DIR)) mkdirSync(KEY_DIR, { recursive: true });
  if (existsSync(PRIV_PATH) && existsSync(PUB_PATH)) {
    return {
      privateKeyPem: readFileSync(PRIV_PATH, 'utf8'),
      publicKeyPem: readFileSync(PUB_PATH, 'utf8'),
    };
  }
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  writeFileSync(PRIV_PATH, privateKey, { mode: 0o600 });
  writeFileSync(PUB_PATH, publicKey, { mode: 0o644 });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

export function loadPublicKeyPem(pem) {
  return createPublicKey(pem);
}

export function createReceipt({
  toolRequest,
  contextFingerprint,
  gate,
  reasons,
  policy,
  sessionId,
  privateKeyPem,
}) {
  const keys = privateKeyPem
    ? { privateKeyPem, publicKeyPem: null }
    : ensureKeyPair();

  const id = `m_${sha256Hex(String(Date.now()) + Math.random()).slice(0, 16)}`;
  const toolHash = sha256Hex(JSON.stringify(toolRequest || {}));
  const ctxHash = sha256Hex(contextFingerprint || '');
  const payloadCore = {
    schema: SCHEMA,
    id,
    ts: new Date().toISOString(),
    sessionId: sessionId || null,
    tool: toolRequest?.tool || toolRequest?.name || null,
    toolHash,
    contextHash: ctxHash,
    gate,
    reasons: reasons || [],
    policy: policy || 'strict',
    principle: 'technology_serves_human',
  };

  const payload_hash = sha256Hex(canon(payloadCore));
  const sign = createSign('SHA256');
  sign.update(payload_hash);
  sign.end();
  const privateKey = createPrivateKey(keys.privateKeyPem);
  const signature = sign.sign(privateKey).toString('hex');
  const pub = keys.publicKeyPem || ensureKeyPair().publicKeyPem;

  return {
    ...payloadCore,
    payload_hash,
    signature,
    alg: ALG,
    publicKeyPem: pub,
  };
}

export function offlineVerifyReceipt(receipt, publicKeyPem) {
  if (!receipt || !receipt.signature || !receipt.payload_hash) {
    return { ok: false, error: 'missing_signature' };
  }
  const core = {
    schema: receipt.schema,
    id: receipt.id,
    ts: receipt.ts,
    sessionId: receipt.sessionId,
    tool: receipt.tool,
    toolHash: receipt.toolHash,
    contextHash: receipt.contextHash,
    gate: receipt.gate,
    reasons: receipt.reasons,
    policy: receipt.policy,
    principle: receipt.principle,
  };
  const expected = sha256Hex(canon(core));
  if (expected !== receipt.payload_hash) {
    return { ok: false, error: 'payload_hash_mismatch', expected, got: receipt.payload_hash };
  }
  const pem = publicKeyPem || receipt.publicKeyPem;
  if (!pem) return { ok: false, error: 'no_public_key' };
  try {
    const verify = createVerify('SHA256');
    verify.update(receipt.payload_hash);
    verify.end();
    const ok = verify.verify(createPublicKey(pem), Buffer.from(receipt.signature, 'hex'));
    return {
      ok,
      gate: receipt.gate,
      id: receipt.id,
      alg: receipt.alg,
      integrity: ok ? 'valid' : 'invalid',
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export default { ensureKeyPair, createReceipt, offlineVerifyReceipt };
