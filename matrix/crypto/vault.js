/**
 * AKSI MATRIX — TrustVault
 * Web Crypto: PBKDF2 (≥100k) → AES-GCM-256
 */

function bufToBase64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function base64ToBuf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}

export class TrustVault {
  constructor(kernel) {
    this.kernel = kernel;
    this.iterations = 120000;
  }

  async deriveKey(password, saltBuf) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(String(password || '')),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuf,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptState(payload, password) {
    if (!crypto.subtle) throw new Error('Web Crypto unavailable');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const plain = new TextEncoder().encode(JSON.stringify(payload));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
    return {
      v: 1,
      alg: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA256',
      iter: this.iterations,
      salt: bufToBase64(salt),
      iv: bufToBase64(iv),
      ct: bufToBase64(ct)
    };
  }

  async decryptState(encryptedData, password) {
    if (!crypto.subtle) throw new Error('Web Crypto unavailable');
    const env = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
    if (!env || !env.ct || !env.salt || !env.iv) throw new Error('Invalid envelope');
    const salt = base64ToBuf(env.salt);
    const iv = new Uint8Array(base64ToBuf(env.iv));
    const ct = base64ToBuf(env.ct);
    const key = await this.deriveKey(password, new Uint8Array(salt));
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plainBuf));
  }

  async exportEncrypted(password) {
    const chunks = await this.kernel.exocortex.dumpAll();
    const payload = {
      format: 'aksi-matrix-capsule',
      version: this.kernel.version,
      exportedAt: new Date().toISOString(),
      memory_chunks: chunks,
      meta: { count: chunks.length, contact: 'aksilove@internet.ru' }
    };
    const env = await this.encryptState(payload, password);
    const wrapper = { ext: 'aksi', product: 'AKSI MATRIX', envelope: env };
    return new Blob([JSON.stringify(wrapper)], { type: 'application/octet-stream' });
  }

  async importEncrypted(fileOrBuffer, password) {
    let text;
    if (typeof fileOrBuffer === 'string') text = fileOrBuffer;
    else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File)
      text = await fileOrBuffer.text();
    else if (fileOrBuffer instanceof ArrayBuffer)
      text = new TextDecoder().decode(fileOrBuffer);
    else throw new Error('Unsupported import input');
    text = text.replace(/^\uFEFF/, '');
    const wrapper = JSON.parse(text);
    const env = wrapper.envelope || wrapper;
    const payload = await this.decryptState(env, password);
    if (!payload || !Array.isArray(payload.memory_chunks))
      throw new Error('Capsule missing memory_chunks');
    await this.kernel.exocortex.replaceAll(payload.memory_chunks);
    return payload.memory_chunks.length;
  }

  downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'matrix-capsule.aksi';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
}

export default TrustVault;
