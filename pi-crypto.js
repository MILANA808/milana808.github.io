/**
 * AKSI MATRIX · pi-crypto.js
 * PiFractalCrypto — client-side AES-GCM with Pi-Entropy salt (Zero-Knowledge local)
 *
 * Local-first / Offline-by-default · Web Crypto only · no npm · no servers
 *
 * Design notes (honest):
 *  - PBKDF2 salt is derived deterministically from password via Math.PI geometry
 *    (same password → same salt). This binds key derivation to the Pi fractal.
 *  - AES-GCM IV is RANDOM per encryption (12 bytes) and stored with ciphertext.
 *    Reusing IVs with the same key is unsafe; random IV is mandatory.
 *  - CryptoKey objects are scoped to the operation; not stored on globalThis.
 *
 * © AKSI · aksilove@internet.ru
 */
"use strict";

const PBKDF2_ITERATIONS = 310000;
const PBKDF2_HASH = "SHA-256";
const AES_KEY_BITS = 256;
const AES_IV_BYTES = 12;
const SALT_BYTES = 16;
const VERSION = 1;

function getSubtle() {
  const c =
    (typeof globalThis !== "undefined" && globalThis.crypto) ||
    (typeof window !== "undefined" && window.crypto) ||
    null;
  if (!c || !c.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) недоступен в этой среде");
  }
  return c.subtle;
}

function getRandom(bytes) {
  const c =
    (typeof globalThis !== "undefined" && globalThis.crypto) ||
    (typeof window !== "undefined" && window.crypto);
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("crypto.getRandomValues недоступен");
  }
  const buf = new Uint8Array(bytes);
  c.getRandomValues(buf);
  return buf;
}

function teEncode(str) {
  return new TextEncoder().encode(String(str));
}

function tdDecode(buf) {
  return new TextDecoder().decode(buf);
}

function u8ToB64(u8) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  return btoa(s);
}

function b64ToU8(b64) {
  const bin = atob(String(b64));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function concatU8(parts) {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function wipe(u8) {
  if (u8 && u8.fill) u8.fill(0);
}

export class PiFractalCrypto {
  constructor(opts = {}) {
    this.iterations = opts.iterations > 0 ? opts.iterations : PBKDF2_ITERATIONS;
    this.version = VERSION;
  }

  async #generatePiSalt(password) {
    const subtle = getSubtle();
    const passBytes = teEncode(password);
    const digest = new Uint8Array(await subtle.digest("SHA-256", passBytes));

    let acc = 0;
    for (let i = 0; i < 8; i++) {
      acc = acc * 256 + digest[i];
    }
    const unit = acc / Math.pow(2, 64);
    const angle = unit * 2 * Math.PI;

    const sx = Math.sin(angle);
    const cx = Math.cos(angle);
    const sy = Math.sin(angle * Math.PI);
    const cy = Math.cos(angle * Math.PI);

    const salt = new Uint8Array(SALT_BYTES);
    const view = new DataView(salt.buffer);
    view.setFloat32(0, sx, true);
    view.setFloat32(4, cx, true);
    view.setFloat32(8, sy, true);
    view.setFloat32(12, cy, true);

    for (let i = 0; i < SALT_BYTES; i++) {
      salt[i] ^= digest[i + 8] ?? digest[i % 32];
    }

    wipe(digest);
    return salt;
  }

  async #deriveKey(password, salt) {
    const subtle = getSubtle();
    const baseKey = await subtle.importKey(
      "raw",
      teEncode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: this.iterations,
        hash: PBKDF2_HASH
      },
      baseKey,
      { name: "AES-GCM", length: AES_KEY_BITS },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(rawData, password, options = {}) {
    if (password == null || String(password).length === 0) {
      throw new Error("password required");
    }
    const format = options.format === "arraybuffer" ? "arraybuffer" : "base64";
    const plaintext =
      typeof rawData === "string" ? rawData : JSON.stringify(rawData);

    let salt = null;
    let iv = null;
    let plainU8 = null;
    try {
      salt = await this.#generatePiSalt(String(password));
      const key = await this.#deriveKey(String(password), salt);
      iv = getRandom(AES_IV_BYTES);
      plainU8 = teEncode(plaintext);
      const subtle = getSubtle();
      const cipherBuf = await subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        plainU8
      );
      const cipherU8 = new Uint8Array(cipherBuf);
      const packed = concatU8([
        new Uint8Array([this.version]),
        iv,
        cipherU8
      ]);
      if (format === "arraybuffer") {
        return packed.buffer.slice(
          packed.byteOffset,
          packed.byteOffset + packed.byteLength
        );
      }
      return u8ToB64(packed);
    } finally {
      wipe(salt);
      wipe(iv);
      wipe(plainU8);
    }
  }

  async decrypt(encryptedData, password, options = {}) {
    if (password == null || String(password).length === 0) {
      throw new Error("password required");
    }

    let packed;
    if (typeof encryptedData === "string") {
      packed = b64ToU8(encryptedData);
    } else if (encryptedData instanceof ArrayBuffer) {
      packed = new Uint8Array(encryptedData);
    } else if (encryptedData instanceof Uint8Array) {
      packed = encryptedData;
    } else {
      throw new Error("encryptedData must be base64 string or ArrayBuffer/Uint8Array");
    }

    if (packed.length < 1 + AES_IV_BYTES + 16) {
      throw new Error("ciphertext too short");
    }

    const version = packed[0];
    if (version !== VERSION) {
      throw new Error("unsupported pi-crypto version: " + version);
    }

    const iv = packed.subarray(1, 1 + AES_IV_BYTES);
    const ciphertext = packed.subarray(1 + AES_IV_BYTES);

    let salt = null;
    try {
      salt = await this.#generatePiSalt(String(password));
      const key = await this.#deriveKey(String(password), salt);
      const subtle = getSubtle();
      const plainBuf = await subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );
      const text = tdDecode(plainBuf);
      if (options.asJson) {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
      return text;
    } finally {
      wipe(salt);
    }
  }

  async selfTest() {
    const sample = { aksi: true, n: Math.PI, t: "проверка" };
    const pwd = "aksi-pi-test-" + Math.random().toString(36).slice(2);
    const enc = await this.encrypt(sample, pwd);
    const dec = await this.decrypt(enc, pwd, { asJson: true });
    return (
      dec &&
      dec.aksi === true &&
      typeof dec.n === "number" &&
      dec.t === "проверка"
    );
  }
}

export default PiFractalCrypto;

if (typeof globalThis !== "undefined") {
  globalThis.PiFractalCrypto = PiFractalCrypto;
  globalThis.AKSI_PI_CRYPTO = {
    version: "1.0.0-pi",
    PiFractalCrypto,
    create: function (opts) {
      return new PiFractalCrypto(opts);
    }
  };
}
