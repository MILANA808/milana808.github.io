/**
 * AKSI MATRIX · pi-crypto.js
 * PiFractalCrypto — client AES-GCM + Pi-Entropy PBKDF2 salt
 * Classic script safe (no top-level export)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";

  var PBKDF2_ITERATIONS = 310000;
  var PBKDF2_HASH = "SHA-256";
  var AES_KEY_BITS = 256;
  var AES_IV_BYTES = 12;
  var SALT_BYTES = 16;
  var VERSION = 1;

  function getSubtle() {
    var c = G.crypto || null;
    if (!c || !c.subtle) {
      throw new Error("Web Crypto API (crypto.subtle) недоступен");
    }
    return c.subtle;
  }

  function getRandom(bytes) {
    if (!G.crypto || typeof G.crypto.getRandomValues !== "function") {
      throw new Error("crypto.getRandomValues недоступен");
    }
    var buf = new Uint8Array(bytes);
    G.crypto.getRandomValues(buf);
    return buf;
  }

  function teEncode(str) {
    return new TextEncoder().encode(String(str));
  }

  function tdDecode(buf) {
    return new TextDecoder().decode(buf);
  }

  function u8ToB64(u8) {
    var s = "";
    var chunk = 0x8000;
    for (var i = 0; i < u8.length; i += chunk) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(s);
  }

  function b64ToU8(b64) {
    var bin = atob(String(b64));
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  function concatU8(parts) {
    var n = 0;
    for (var i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n);
    var o = 0;
    for (var j = 0; j < parts.length; j++) {
      out.set(parts[j], o);
      o += parts[j].length;
    }
    return out;
  }

  function wipe(u8) {
    if (u8 && u8.fill) u8.fill(0);
  }

  function PiFractalCrypto(opts) {
    opts = opts || {};
    this.iterations = opts.iterations > 0 ? opts.iterations : PBKDF2_ITERATIONS;
    this.version = VERSION;
  }

  PiFractalCrypto.prototype._generatePiSalt = function (password) {
    var subtle = getSubtle();
    var passBytes = teEncode(password);
    return subtle.digest("SHA-256", passBytes).then(function (dig) {
      var digest = new Uint8Array(dig);
      var acc = 0;
      for (var i = 0; i < 8; i++) acc = acc * 256 + digest[i];
      var unit = acc / Math.pow(2, 64);
      var angle = unit * 2 * Math.PI;
      var sx = Math.sin(angle);
      var cx = Math.cos(angle);
      var sy = Math.sin(angle * Math.PI);
      var cy = Math.cos(angle * Math.PI);
      var salt = new Uint8Array(SALT_BYTES);
      var view = new DataView(salt.buffer);
      view.setFloat32(0, sx, true);
      view.setFloat32(4, cx, true);
      view.setFloat32(8, sy, true);
      view.setFloat32(12, cy, true);
      for (var k = 0; k < SALT_BYTES; k++) {
        salt[k] ^= digest[(k + 8) % 32];
      }
      wipe(digest);
      return salt;
    });
  };

  PiFractalCrypto.prototype._deriveKey = function (password, salt) {
    var subtle = getSubtle();
    var self = this;
    return subtle
      .importKey("raw", teEncode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (baseKey) {
        return subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: salt,
            iterations: self.iterations,
            hash: PBKDF2_HASH
          },
          baseKey,
          { name: "AES-GCM", length: AES_KEY_BITS },
          false,
          ["encrypt", "decrypt"]
        );
      });
  };

  PiFractalCrypto.prototype.encrypt = function (rawData, password, options) {
    options = options || {};
    if (password == null || String(password).length === 0) {
      return Promise.reject(new Error("password required"));
    }
    var format = options.format === "arraybuffer" ? "arraybuffer" : "base64";
    var plaintext =
      typeof rawData === "string" ? rawData : JSON.stringify(rawData);
    var self = this;
    var salt = null;
    var iv = null;
    var plainU8 = null;
    return self
      ._generatePiSalt(String(password))
      .then(function (s) {
        salt = s;
        return self._deriveKey(String(password), salt);
      })
      .then(function (key) {
        iv = getRandom(AES_IV_BYTES);
        plainU8 = teEncode(plaintext);
        return getSubtle().encrypt({ name: "AES-GCM", iv: iv }, key, plainU8);
      })
      .then(function (cipherBuf) {
        var cipherU8 = new Uint8Array(cipherBuf);
        var packed = concatU8([new Uint8Array([self.version]), iv, cipherU8]);
        if (format === "arraybuffer") {
          return packed.buffer.slice(
            packed.byteOffset,
            packed.byteOffset + packed.byteLength
          );
        }
        return u8ToB64(packed);
      })
      .finally(function () {
        wipe(salt);
        wipe(iv);
        wipe(plainU8);
      });
  };

  PiFractalCrypto.prototype.decrypt = function (encryptedData, password, options) {
    options = options || {};
    if (password == null || String(password).length === 0) {
      return Promise.reject(new Error("password required"));
    }
    var packed;
    if (typeof encryptedData === "string") {
      packed = b64ToU8(encryptedData);
    } else if (encryptedData instanceof ArrayBuffer) {
      packed = new Uint8Array(encryptedData);
    } else if (encryptedData instanceof Uint8Array) {
      packed = encryptedData;
    } else {
      return Promise.reject(
        new Error("encryptedData must be base64 string or ArrayBuffer/Uint8Array")
      );
    }
    if (packed.length < 1 + AES_IV_BYTES + 16) {
      return Promise.reject(new Error("ciphertext too short"));
    }
    var version = packed[0];
    if (version !== VERSION) {
      return Promise.reject(new Error("unsupported pi-crypto version: " + version));
    }
    var iv = packed.subarray(1, 1 + AES_IV_BYTES);
    var ciphertext = packed.subarray(1 + AES_IV_BYTES);
    var self = this;
    var salt = null;
    return self
      ._generatePiSalt(String(password))
      .then(function (s) {
        salt = s;
        return self._deriveKey(String(password), salt);
      })
      .then(function (key) {
        return getSubtle().decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
      })
      .then(function (plainBuf) {
        var text = tdDecode(plainBuf);
        if (options.asJson) {
          try {
            return JSON.parse(text);
          } catch (e) {
            return text;
          }
        }
        return text;
      })
      .finally(function () {
        wipe(salt);
      });
  };

  PiFractalCrypto.prototype.selfTest = function () {
    var sample = { aksi: true, n: Math.PI, t: "проверка" };
    var pwd = "aksi-pi-test-" + Math.random().toString(36).slice(2);
    var self = this;
    return self.encrypt(sample, pwd).then(function (enc) {
      return self.decrypt(enc, pwd, { asJson: true });
    }).then(function (dec) {
      return !!(dec && dec.aksi === true && typeof dec.n === "number" && dec.t === "проверка");
    });
  };

  G.PiFractalCrypto = PiFractalCrypto;
  G.AKSI_PI_CRYPTO = {
    version: "1.0.1-pi",
    PiFractalCrypto: PiFractalCrypto,
    create: function (opts) {
      return new PiFractalCrypto(opts);
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
