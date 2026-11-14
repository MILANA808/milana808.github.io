/* AKSI Q Browser Runtime v0.3.0
 * Browser-native, bounded interpreter + user-controlled IndexedDB memory.
 * No eval(), Function(), dynamic imports, network calls or implicit telemetry.
 * © AKSI MATRIX
 */
(function (root) {
  "use strict";
  const VERSION = "0.3.0";
  const MAX_SOURCE = 100000;
  const MAX_LINE = 4096;
  const MAX_TOKENS = 2048;
  const MAX_LINES = 2000;
  const MAX_VECTOR = 4096;
  const MAX_TENSOR = 65536;
  const MAX_QUBITS = 10;
  const DB_NAME = "aksi-q-memory";
  const DB_VERSION = 1;
  const STORE = "records";

  class AksiError extends Error {
    constructor(message, line) {
      super(line ? "line " + line + ": " + message : message);
      this.name = "AksiError";
    }
  }

  function decodeString(token) {
    const body = token.slice(1, -1);
    let out = "";
    for (let i = 0; i < body.length; i += 1) {
      const ch = body[i];
      if (ch !== "\\") { out += ch; continue; }
      i += 1;
      if (i >= body.length) throw new AksiError("unfinished string escape");
      const esc = body[i];
      const simple = { n: "\n", r: "\r", t: "\t", "\\": "\\", "'": "'", '"': '"', "0": "\0" };
      if (Object.prototype.hasOwnProperty.call(simple, esc)) { out += simple[esc]; continue; }
      if (esc === "u" || esc === "x") {
        const count = esc === "u" ? 4 : 2;
        const digits = body.slice(i + 1, i + 1 + count);
        if (!new RegExp("^[0-9a-fA-F]{" + count + "}$").test(digits)) throw new AksiError("invalid hexadecimal string escape");
        out += String.fromCharCode(parseInt(digits, 16));
        i += count;
        continue;
      }
      throw new AksiError("unsupported string escape: \\" + esc);
    }
    return out;
  }

  function tokenize(source) {
    const tokens = [];
    const re = /\s+|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_][A-Za-z0-9_]*|\*\*|\/\/|==|!=|<=|>=|[+\-*/%<>()\[\],=]/gy;
    let pos = 0;
    while (pos < source.length) {
      re.lastIndex = pos;
      const match = re.exec(source);
      if (!match) throw new AksiError("unexpected character at column " + (pos + 1));
      pos = re.lastIndex;
      if (!/^\s+$/.test(match[0])) tokens.push(match[0]);
      if (tokens.length > MAX_TOKENS) throw new AksiError("expression exceeds the 2048-token budget");
    }
    tokens.push("<EOF>");
    return tokens;
  }

  class ExpressionParser {
    constructor(source, env) {
      this.tokens = tokenize(source);
      this.pos = 0;
      this.env = env;
    }
    peek() { return this.tokens[this.pos]; }
    take() { return this.tokens[this.pos++]; }
    expect(value) {
      if (this.take() !== value) throw new AksiError("expected " + value);
    }
    parse() {
      if (this.peek() === "<EOF>") throw new AksiError("empty expression");
      const value = this.expression(0);
      if (this.peek() !== "<EOF>") throw new AksiError("unexpected token: " + this.peek());
      return value;
    }
    expression(minimum) {
      let left = this.prefix();
      while (true) {
        const token = this.peek();
        if (token === "(") {
          if (8 < minimum) break;
          left = this.call(left);
          continue;
        }
        if (token === "[") {
          if (8 < minimum) break;
          this.take();
          const index = this.expression(0);
          this.expect("]");
          if (!Array.isArray(left) || !Number.isInteger(index) || index < 0 || index >= left.length) throw new AksiError("index is outside the value");
          left = left[index];
          continue;
        }
        const precedence = ({ or: 1, and: 2, "==": 3, "!=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3, "+": 4, "-": 4, "*": 5, "/": 5, "//": 5, "%": 5, "**": 6 })[token];
        if (precedence === undefined || precedence < minimum) break;
        this.take();
        if (["==", "!=", "<", "<=", ">", ">="].includes(token)) {
          let right = this.expression(precedence + 1);
          let result = compare(token, left, right);
          left = right;
          while (["==", "!=", "<", "<=", ">", ">="].includes(this.peek())) {
            const op = this.take();
            const right = this.expression(precedence + 1);
            result = result && compare(op, left, right);
            left = right;
          }
          left = result;
          continue;
        }
        const right = this.expression(token === "**" ? precedence : precedence + 1);
        left = binary(token, left, right);
      }
      return left;
    }
    prefix() {
      const token = this.take();
      if (["+", "-", "not"].includes(token)) {
        const value = this.expression(token === "not" ? 3 : 6);
        if (token === "not") return !value;
        if (typeof value !== "number") throw new AksiError("unary arithmetic requires a number");
        return token === "-" ? -value : value;
      }
      if (token === "(") {
        const first = this.expression(0);
        if (this.peek() === ",") {
          const values = [first];
          while (this.peek() === ",") {
            this.take();
            if (this.peek() === ")") break;
            values.push(this.expression(0));
          }
          this.expect(")");
          return values;
        }
        this.expect(")");
        return first;
      }
      if (token === "[") {
        const values = [];
        if (this.peek() !== "]") {
          while (true) {
            values.push(this.expression(0));
            if (this.peek() !== ",") break;
            this.take();
            if (this.peek() === "]") break;
          }
        }
        this.expect("]");
        return values;
      }
      if (token.startsWith('"') || token.startsWith("'")) return decodeString(token);
      if (/^(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/.test(token)) {
        const number = Number(token);
        if (!Number.isFinite(number)) throw new AksiError("number must be finite");
        return Number.isInteger(number) && !/[.eE]/.test(token) ? number : number;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
        const key = token.toLowerCase();
        if (key === "true") return true;
        if (key === "false") return false;
        if (key === "null" || key === "none") return null;
        if (!Object.prototype.hasOwnProperty.call(this.env, token)) throw new AksiError("unknown name: " + token);
        return this.env[token];
      }
      throw new AksiError("unexpected token: " + token);
    }
    call(fn) {
      if (typeof fn !== "function") throw new AksiError("only registered AKSI built-ins can be called");
      this.expect("(");
      const args = [];
      const kwargs = {};
      if (this.peek() !== ")") {
        while (true) {
          if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(this.peek()) && this.tokens[this.pos + 1] === "=") {
            const name = this.take(); this.take();
            if (Object.prototype.hasOwnProperty.call(kwargs, name)) throw new AksiError("duplicate keyword argument: " + name);
            kwargs[name] = this.expression(0);
          } else args.push(this.expression(0));
          if (this.peek() !== ",") break;
          this.take();
          if (this.peek() === ")") break;
        }
      }
      this.expect(")");
      try { return fn.apply(null, args.concat(Object.keys(kwargs).length ? [kwargs] : [])); }
      catch (error) { if (error instanceof AksiError) throw error; throw new AksiError(error.message || String(error)); }
    }
  }

  function compare(op, a, b) {
    if (op === "==") return JSON.stringify(a) === JSON.stringify(b);
    if (op === "!=") return JSON.stringify(a) !== JSON.stringify(b);
    if (typeof a !== typeof b || (typeof a !== "number" && typeof a !== "string")) throw new AksiError("comparison requires values of the same scalar type");
    return ({ "<": () => a < b, "<=": () => a <= b, ">": () => a > b, ">=": () => a >= b })[op]();
  }
  function binary(op, a, b) {
    if (op === "and") return Boolean(a) && Boolean(b);
    if (op === "or") return Boolean(a) || Boolean(b);
    if (op === "+" && typeof a === "string" && typeof b === "string") return a + b;
    if (typeof a !== "number" || typeof b !== "number") throw new AksiError("arithmetic operators require numbers");
    if (op === "**" && Math.abs(b) > 1024) throw new AksiError("power exponent is limited to |n| <= 1024");
    const result = ({ "+": () => a + b, "-": () => a - b, "*": () => a * b, "/": () => a / b, "//": () => Math.floor(a / b), "%": () => a % b, "**": () => Math.pow(a, b) })[op]();
    if (!Number.isFinite(result)) throw new AksiError("arithmetic result is not finite");
    return result;
  }

  const C = (re, im) => ({ re: Number(re) || 0, im: Number(im) || 0 });
  const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
  const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cscale = (a, s) => C(a.re * s, a.im * s);
  const cabs2 = a => a.re * a.re + a.im * a.im;
  function stateVector(state) {
    if (!Array.isArray(state) || state.length < 2 || (state.length & (state.length - 1)) !== 0 || state.length > (1 << MAX_QUBITS)) throw new AksiError("state must have 2^n amplitudes for 1..10 qubits");
    return state.map(v => typeof v === "number" ? C(v, 0) : C(v.re, v.im));
  }
  function applyGate(state, target, matrix) {
    const v = stateVector(state);
    const n = Math.log2(v.length);
    if (!Number.isInteger(target) || target < 0 || target >= n) throw new AksiError("target qubit is outside the register");
    const out = v.slice();
    const bit = 1 << target;
    for (let i = 0; i < v.length; i += 1) {
      if (i & bit) continue;
      const j = i | bit, a = v[i], b = v[j];
      out[i] = cadd(cmul(matrix[0], a), cmul(matrix[1], b));
      out[j] = cadd(cmul(matrix[2], a), cmul(matrix[3], b));
    }
    return out;
  }
  function qstate(n) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) throw new AksiError("qstate() supports 1..10 qubits");
    const state = Array.from({ length: 1 << n }, () => C(0, 0));
    state[0] = C(1, 0);
    return state;
  }
  function probabilities(state) {
    const v = stateVector(state);
    const total = v.reduce((sum, a) => sum + cabs2(a), 0);
    if (!(total > 0)) throw new AksiError("quantum state has zero norm");
    return v.map(a => cabs2(a) / total);
  }
  function h(state, target) {
    const v = stateVector(state);
    if (target === undefined) {
      if (v.length !== 2) throw new AksiError("h(state) requires one qubit; pass target for a register");
      target = 0;
    }
    const s = 1 / Math.sqrt(2);
    return applyGate(v, target, [C(s, 0), C(s, 0), C(s, 0), C(-s, 0)]);
  }
  function x(state, target) { return applyGate(state, target === undefined ? 0 : target, [C(0, 0), C(1, 0), C(1, 0), C(0, 0)]); }
  function z(state, target) { return applyGate(state, target === undefined ? 0 : target, [C(1, 0), C(0, 0), C(0, 0), C(-1, 0)]); }
  function phase(state, theta, target) {
    const angle = Number(theta);
    return applyGate(state, target === undefined ? 0 : target, [C(1, 0), C(0, 0), C(0, 0), C(Math.cos(angle), Math.sin(angle))]);
  }
  function rx(state, theta, target) {
    const c = Math.cos(Number(theta) / 2), s = Math.sin(Number(theta) / 2);
    return applyGate(state, target === undefined ? 0 : target, [C(c, 0), C(0, -s), C(0, -s), C(c, 0)]);
  }
  function ry(state, theta, target) {
    const c = Math.cos(Number(theta) / 2), s = Math.sin(Number(theta) / 2);
    return applyGate(state, target === undefined ? 0 : target, [C(c, 0), C(-s, 0), C(s, 0), C(c, 0)]);
  }
  function rz(state, theta, target) {
    const angle = Number(theta) / 2;
    return applyGate(state, target === undefined ? 0 : target, [C(Math.cos(angle), -Math.sin(angle)), C(0, 0), C(0, 0), C(Math.cos(angle), Math.sin(angle))]);
  }
  function cnot(state, control, target) {
    const v = stateVector(state), n = Math.log2(v.length);
    if (![control, target].every(q => Number.isInteger(q) && q >= 0 && q < n) || control === target) throw new AksiError("CNOT requires two different valid qubit indices");
    const out = v.slice(), cb = 1 << control, tb = 1 << target;
    for (let i = 0; i < v.length; i += 1) if ((i & cb) && !(i & tb)) { const j = i | tb; out[i] = v[j]; out[j] = v[i]; }
    return out;
  }
  function measure(state, shots, seed) {
    const probs = probabilities(state);
    if (shots && typeof shots === "object") { seed = shots.seed; shots = shots.shots; }
    shots = shots === undefined ? 1 : shots;
    seed = seed === undefined ? 0 : seed;
    if (!Number.isInteger(shots) || shots < 1 || shots > 100000) throw new AksiError("measure shots must be 1..100000");
    let xseed = (Number(seed) >>> 0) || 0x9e3779b9;
    function random() { xseed ^= xseed << 13; xseed ^= xseed >>> 17; xseed ^= xseed << 5; return (xseed >>> 0) / 4294967296; }
    const labels = probs.map((_, i) => i.toString(2).padStart(Math.log2(probs.length), "0"));
    const counts = {};
    for (let shot = 0; shot < shots; shot += 1) {
      const draw = random(); let sum = 0;
      for (let i = 0; i < probs.length; i += 1) {
        sum += probs[i];
        if (draw < sum || i === probs.length - 1) { counts[labels[i]] = (counts[labels[i]] || 0) + 1; break; }
      }
    }
    if (shots === 1) return Object.keys(counts)[0];
    return counts;
  }

  function normalizeKey(value) { return String(value).trim().toLocaleLowerCase("ru").replace(/ё/g, "е"); }
  function MemoryStore() { this.dbPromise = null; }
  MemoryStore.prototype.open = function () {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === "undefined") return Promise.reject(new AksiError("IndexedDB is unavailable in this browser"));
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open AKSI memory"));
      request.onblocked = () => reject(new Error("AKSI memory upgrade is blocked by another tab"));
    });
    return this.dbPromise;
  };
  MemoryStore.prototype.digest = async function (text) {
    if (!root.crypto || !root.crypto.subtle) return null;
    const bytes = new TextEncoder().encode(text);
    const hash = await root.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
  };
  MemoryStore.prototype.put = async function (key, value, tags) {
    key = String(key || "").trim();
    if (!key || key.length > 160) throw new AksiError("memory key must contain 1..160 characters");
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (serialized.length > 100000) throw new AksiError("one memory item is limited to 100 KB");
    const db = await this.open();
    const previous = await this.get(key);
    const now = new Date().toISOString();
    const record = {
      id: normalizeKey(key), key, value: serialized,
      tags: Array.isArray(tags) ? tags.map(String).slice(0, 20) : [],
      createdAt: previous ? previous.createdAt : now,
      updatedAt: now, schema: "AKSI-MEMORY/1"
    };
    record.sha256 = await this.digest(JSON.stringify(record));
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Memory write failed"));
      tx.onabort = () => reject(tx.error || new Error("Memory write aborted"));
    });
    return record;
  };
  MemoryStore.prototype.get = async function (key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(normalizeKey(key));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  };
  MemoryStore.prototype.remove = async function (key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(normalizeKey(key));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  };
  MemoryStore.prototype.all = async function () {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      request.onerror = () => reject(request.error);
    });
  };
  MemoryStore.prototype.search = async function (query) {
    const q = normalizeKey(query);
    const records = await this.all();
    if (!q) return records.slice(0, 100);
    const terms = q.split(/\s+/).filter(Boolean);
    return records.filter(record => {
      const haystack = normalizeKey(record.key + " " + record.value + " " + (record.tags || []).join(" "));
      return terms.every(term => haystack.includes(term));
    }).slice(0, 100);
  };
  MemoryStore.prototype.export = async function () {
    return { schema: "AKSI-MEMORY-EXPORT/1", exportedAt: new Date().toISOString(), records: await this.all() };
  };
  MemoryStore.prototype.import = async function (payload) {
    if (!payload || payload.schema !== "AKSI-MEMORY-EXPORT/1" || !Array.isArray(payload.records)) throw new AksiError("unsupported memory export schema");
    if (payload.records.length > 10000) throw new AksiError("memory import is limited to 10000 records");
    let imported = 0;
    for (const record of payload.records) {
      if (!record || record.schema !== "AKSI-MEMORY/1" || typeof record.key !== "string" || typeof record.value !== "string" || record.key.length > 160 || record.value.length > 100000) throw new AksiError("invalid memory record in import");
      await this.put(record.key, record.value, Array.isArray(record.tags) ? record.tags : []);
      imported += 1;
    }
    return imported;
  };

  function Runtime(options) {
    options = options || {};
    this.env = {
      pi: Math.PI, e: Math.E, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
      exp: Math.exp, log: Math.log, abs: Math.abs, sum: xs => xs.reduce((a, b) => a + b, 0),
      len: xs => xs.length, min: Math.min, max: Math.max, round: Math.round,
      vector: (...xs) => xs, dot: (a, b) => { if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) throw new AksiError("dot requires equal-length vectors"); return a.reduce((s, x, i) => s + x * b[i], 0); },
      norm: xs => Math.sqrt(xs.reduce((s, x) => s + x * x, 0)),
      normalize: xs => { const n = Math.sqrt(xs.reduce((s, x) => s + x * x, 0)); if (!n) throw new AksiError("cannot normalize zero vector"); return xs.map(x => x / n); },
      tensor: (a, b) => { if (!Array.isArray(a) || !Array.isArray(b) || a.length * b.length > MAX_TENSOR) throw new AksiError("tensor exceeds the 65536-element limit"); return a.flatMap(x => b.map(y => x * y)); },
      interfere: (a, b) => { if (a.length !== b.length || a.length * b.length > MAX_VECTOR * MAX_VECTOR) throw new AksiError("interfere requires equal-length vectors"); return a.map((x, i) => x + b[i]); },
      probabilities, qstate, h, x, z, phase, rx, ry, rz, cnot, measure
    };
    this.concepts = new Map();
    this.relations = [];
    this.memory = options.memory || new MemoryStore();
  }
  Runtime.prototype.expression = function (source) {
    if (source.length > MAX_LINE) throw new AksiError("expression exceeds the 4096-character limit");
    return new ExpressionParser(source, this.env).parse();
  };
  Runtime.prototype.resolve = function (name) {
    const key = normalizeKey(name);
    if (this.concepts.has(key)) return key;
    return key;
  };
  Runtime.prototype.runLine = async function (line, lineNumber) {
    const source = line.trim();
    if (!source || source.startsWith("#")) return null;
    if (source.length > MAX_LINE) throw new AksiError("source line exceeds the 4096-character limit", lineNumber);
    try {
      let match;
      if ((match = source.match(/^let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/))) {
        if (Object.prototype.hasOwnProperty.call(this.env, match[1])) throw new AksiError("cannot replace a built-in: " + match[1]);
        this.env[match[1]] = this.expression(match[2]); return null;
      }
      if (source.startsWith("print ")) return this.expression(source.slice(6));
      if (source.startsWith("assert ")) { if (!this.expression(source.slice(7))) throw new AksiError("assertion failed"); return "PASS"; }
      if ((match = source.match(/^concept\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s+means\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/))) {
        const key = normalizeKey(decodeString(match[1]));
        this.concepts.set(key, decodeString(match[2])); return null;
      }
      if ((match = source.match(/^relate\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*->\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s+as\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/))) {
        const edge = [normalizeKey(decodeString(match[1])), normalizeKey(decodeString(match[3])), normalizeKey(decodeString(match[2]))];
        if (!this.relations.some(item => JSON.stringify(item) === JSON.stringify(edge))) this.relations.push(edge);
        return null;
      }
      if ((match = source.match(/^ask\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/))) {
        const key = this.resolve(decodeString(match[1]));
        if (!this.concepts.has(key)) return "Unknown concept: " + key;
        const edges = this.relations.filter(edge => edge[0] === key).map(edge => edge[1] + ": " + edge[2]);
        return this.concepts.get(key) + (edges.length ? "; relations: " + edges.join(", ") : "");
      }
      if ((match = source.match(/^infer\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/))) {
        const start = this.resolve(decodeString(match[1])), found = [], seen = new Set([start]), queue = [start];
        while (queue.length) {
          const current = queue.shift();
          for (const edge of this.relations) if (edge[0] === current && edge[1] === "is_a" && !seen.has(edge[2])) { seen.add(edge[2]); found.push(edge[2]); queue.push(edge[2]); }
        }
        return found;
      }
      if ((match = source.match(/^remember\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*=\s*(.+)$/))) {
        const key = decodeString(match[1]), value = this.expression(match[2]);
        await this.memory.put(key, value);
        return "MEMORY SAVED: " + key;
      }
      if ((match = source.match(/^recall\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/))) {
        const key = decodeString(match[1]), record = await this.memory.get(key);
        if (!record) return "MEMORY NOT FOUND: " + key;
        try { return JSON.parse(record.value); } catch (_) { return record.value; }
      }
      if ((match = source.match(/^search\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/))) {
        return (await this.memory.search(decodeString(match[1]))).map(record => ({ key: record.key, value: record.value, updatedAt: record.updatedAt }));
      }
      if ((match = source.match(/^forget\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/))) {
        const key = decodeString(match[1]); await this.memory.remove(key); return "MEMORY DELETED: " + key;
      }
      return this.expression(source);
    } catch (error) {
      if (error instanceof AksiError) throw new AksiError(error.message, lineNumber);
      throw new AksiError(error.message || String(error), lineNumber);
    }
  };
  Runtime.prototype.run = async function (source) {
    if (typeof source !== "string" || source.length > MAX_SOURCE) throw new AksiError("program must be text up to 100 KB");
    const lines = source.split(/\r?\n/);
    if (lines.length > MAX_LINES) throw new AksiError("program exceeds the 2000-line limit");
    const output = [];
    for (let i = 0; i < lines.length; i += 1) {
      const result = await this.runLine(lines[i], i + 1);
      if (result !== null && result !== undefined) output.push(result);
    }
    return output;
  };

  function safeJSON(value) {
    return JSON.stringify(value, (key, item) => {
      if (typeof item === "number" && !Number.isFinite(item)) return String(item);
      return item;
    }, 2);
  }
  MemoryStore.prototype.verify = async function () {
    const records = await this.all();
    const results = [];
    for (const record of records) {
      const copy = Object.assign({}, record);
      const expected = copy.sha256;
      delete copy.sha256;
      const actual = await this.digest(JSON.stringify(copy));
      results.push({ key: record.key, valid: !!actual && actual === expected, available: !!actual });
    }
    return { checked: results.length, valid: results.filter(x => x.valid).length, unavailable: results.filter(x => !x.available).length, records: results };
  };

  function initUI() {
    if (typeof document === "undefined") return;
    const byId = id => document.getElementById(id);
    const runtime = new Runtime();
    const qOut = byId("aksiQOutput");
    const memoryOut = byId("memoryOutput");
    const status = byId("aksiQStatus");
    const show = (el, value) => { if (el) el.textContent = typeof value === "string" ? value : safeJSON(value); };
    if (status) status.textContent = "AKSI Q Browser Runtime v" + VERSION + " · локальное исполнение готово";
    const runButton = byId("aksiQRun");
    if (runButton) runButton.addEventListener("click", async () => {
      runButton.disabled = true;
      show(qOut, "Выполняю программу…");
      try {
        const results = await runtime.run(byId("aksiQSource").value);
        show(qOut, results.length ? results : "Программа выполнена. Нет печатаемых результатов.");
        if (status) status.textContent = "Выполнено · " + results.length + " результата(ов) · AKSI Q " + VERSION;
      } catch (error) {
        show(qOut, "ОШИБКА: " + (error.message || String(error)));
        if (status) status.textContent = "Остановлено: программа не прошла проверку";
      } finally { runButton.disabled = false; }
    });
    const example = byId("aksiQExample");
    if (example) example.addEventListener("click", () => {
      byId("aksiQSource").value = [
        '# AKSI Q · математический и квантовый пример',
        'let v = vector(3, 4)',
        'print norm(v)',
        'let zero = qstate(2)',
        'let plus = h(zero, 0)',
        'let bell = cnot(plus, 0, 1)',
        'print probabilities(bell)',
        'print measure(bell, shots=100, seed=42)',
        'concept "cat" means "mammal"',
        'concept "mammal" means "animal"',
        'relate "cat" -> "mammal" as "is_a"',
        'relate "mammal" -> "animal" as "is_a"',
        'print ask("cat")',
        'print infer("cat")'
      ].join("\n");
      show(qOut, "Пример загружен. Нажми «Выполнить».");
    });
    const save = byId("memorySave");
    if (save) save.addEventListener("click", async () => {
      save.disabled = true;
      try {
        const tags = (byId("memoryTags").value || "").split(",").map(x => x.trim()).filter(Boolean);
        const record = await runtime.memory.put(byId("memoryKey").value, byId("memoryValue").value, tags);
        show(memoryOut, "Сохранено локально · " + record.key + " · SHA-256 " + (record.sha256 || "недоступен"));
        await renderMemory();
      } catch (error) { show(memoryOut, "Не удалось сохранить: " + (error.message || String(error))); }
      finally { save.disabled = false; }
    });
    async function renderMemory(query) {
      const list = byId("memoryList");
      if (!list) return;
      list.replaceChildren();
      try {
        const records = query ? await runtime.memory.search(query) : (await runtime.memory.all()).slice(0, 30);
        if (!records.length) { list.textContent = "Записей не найдено."; return; }
        records.forEach(record => {
          const item = document.createElement("article");
          item.className = "memory-item";
          const title = document.createElement("b"); title.textContent = record.key;
          const body = document.createElement("p"); body.textContent = record.value;
          const meta = document.createElement("small"); meta.textContent = new Date(record.updatedAt).toLocaleString() + (record.tags && record.tags.length ? " · " + record.tags.join(", ") : "");
          const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Удалить";
          remove.addEventListener("click", async () => { if (!root.confirm || root.confirm("Удалить запись «" + record.key + "» с этого устройства?")) { await runtime.memory.remove(record.key); await renderMemory(query); } });
          item.append(title, body, meta, remove); list.append(item);
        });
      } catch (error) { list.textContent = "Память недоступна: " + (error.message || String(error)); }
    }
    const search = byId("memorySearch");
    if (search) search.addEventListener("click", () => renderMemory(byId("memoryQuery").value));
    const refresh = byId("memoryRefresh");
    if (refresh) refresh.addEventListener("click", () => renderMemory());
    const exportButton = byId("memoryExport");
    if (exportButton) exportButton.addEventListener("click", async () => {
      try {
        const data = await runtime.memory.export();
        const blob = new Blob([safeJSON(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "aksi-memory-export.json"; a.click();
        URL.revokeObjectURL(url); show(memoryOut, "Экспорт подготовлен: " + data.records.length + " записей.");
      } catch (error) { show(memoryOut, "Экспорт не выполнен: " + (error.message || String(error))); }
    });
    const importButton = byId("memoryImportButton");
    const fileInput = byId("memoryImportFile");
    if (importButton && fileInput) importButton.addEventListener("click", () => fileInput.click());
    if (fileInput) fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024) throw new AksiError("import file exceeds 5 MB");
        const payload = JSON.parse(await file.text());
        const count = await runtime.memory.import(payload);
        show(memoryOut, "Импортировано записей: " + count);
        await renderMemory();
      } catch (error) { show(memoryOut, "Импорт отклонён: " + (error.message || String(error))); }
      finally { fileInput.value = ""; }
    });
    const verify = byId("memoryVerify");
    if (verify) verify.addEventListener("click", async () => {
      try { show(memoryOut, await runtime.memory.verify()); }
      catch (error) { show(memoryOut, "Проверка не выполнена: " + (error.message || String(error))); }
    });
    renderMemory();
  }
  initUI();
  const api = {
    version: VERSION, Runtime, MemoryStore, AksiError, tokenize,
    limits: { sourceBytes: MAX_SOURCE, lineCharacters: MAX_LINE, tokens: MAX_TOKENS, lines: MAX_LINES, vectorElements: MAX_VECTOR, tensorElements: MAX_TENSOR, qubits: MAX_QUBITS },
    safeJSON
  };
  root.AKSI_Q_BROWSER = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
