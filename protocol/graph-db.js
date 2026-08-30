/* AKSI Protocol — encrypted hypergraph memory (IndexedDB + optional AES-GCM) */
(function (G) {
  "use strict";
  var DB_NAME = "aksi_protocol_graph_v2";
  var DB_VER = 1;
  var STORE = "graph";
  var META = "meta";

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "key" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbGet(store, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, "readonly");
        var r = tx.objectStore(store).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function idbPut(store, val) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(val);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbClear(store) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function bufToB64(buf) {
    var u = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function b64ToBuf(b64) {
    var s = atob(b64);
    var u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u.buffer;
  }

  async function deriveKey(password, salt) {
    var enc = new TextEncoder();
    var base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 120000, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptJson(obj, password) {
    if (!password) return { plain: obj };
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(password, salt);
    var data = new TextEncoder().encode(JSON.stringify(obj));
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
    return { enc: true, salt: bufToB64(salt), iv: bufToB64(iv), data: bufToB64(ct) };
  }

  async function decryptJson(pack, password) {
    if (!pack) return null;
    if (!pack.enc) return pack.plain || pack;
    if (!password) throw new Error("password required");
    var key = await deriveKey(password, new Uint8Array(b64ToBuf(pack.salt)));
    var pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(pack.iv)) },
      key,
      b64ToBuf(pack.data)
    );
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function hashStr(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function embed(text) {
    var v = new Float32Array(32);
    var t = String(text || "").toLowerCase();
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      v[c % 32] += 1;
      if (i + 1 < t.length) v[(c * 31 + t.charCodeAt(i + 1)) % 32] += 0.5;
    }
    var norm = 0;
    for (var j = 0; j < 32; j++) norm += v[j] * v[j];
    norm = Math.sqrt(norm) || 1;
    for (var k = 0; k < 32; k++) v[k] /= norm;
    return Array.from(v);
  }

  function cos(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  var GraphDB = {
    password: "",
    nodes: [],
    edges: [],
    setPassword: function (p) { this.password = p || ""; },
    load: async function () {
      try {
        var row = await idbGet(STORE, "main");
        if (!row) {
          try {
            var legacy = localStorage.getItem("aksi_protocol_graph_v1");
            if (legacy) {
              var o = JSON.parse(legacy);
              this.nodes = o.nodes || [];
              this.edges = o.edges || [];
              await this.save();
            }
          } catch (e) {}
          return;
        }
        var data = await decryptJson(row.payload, this.password);
        this.nodes = (data && data.nodes) || [];
        this.edges = (data && data.edges) || [];
      } catch (e) {
        console.warn("GraphDB load", e);
        this.nodes = [];
        this.edges = [];
        throw e;
      }
    },
    save: async function () {
      var payload = await encryptJson({
        nodes: this.nodes.slice(-600),
        edges: this.edges.slice(-1000)
      }, this.password);
      await idbPut(STORE, { id: "main", payload: payload, ts: Date.now() });
    },
    addFact: async function (text, meta) {
      text = String(text || "").trim();
      if (!text) return null;
      var id = "n" + hashStr(text + ":" + Date.now());
      var node = {
        id: id,
        text: text,
        ts: Date.now(),
        emotion: (meta && meta.emotion) || 0,
        w: 1,
        emb: embed(text)
      };
      this.nodes.push(node);
      if (this.nodes.length > 1) {
        var prev = this.nodes[this.nodes.length - 2];
        this.edges.push({ a: prev.id, b: id, w: 0.45, ts: Date.now(), kind: "seq" });
      }
      await this.save();
      return node;
    },
    addLink: async function (aText, bText, w) {
      var a = await this.addFact(aText);
      var b = await this.addFact(bText);
      if (a && b) {
        this.edges.push({ a: a.id, b: b.id, w: w == null ? 1 : w, ts: Date.now(), kind: "rel" });
        await this.save();
      }
      return { a: a, b: b };
    },
    search: function (q, limit) {
      limit = limit || 8;
      var qe = embed(q);
      var words = String(q || "").toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
      return this.nodes.map(function (n) {
        var score = cos(qe, n.emb || embed(n.text));
        var t = n.text.toLowerCase();
        words.forEach(function (w) { if (t.indexOf(w) !== -1) score += 0.15; });
        return { node: n, score: score };
      }).filter(function (x) { return x.score > 0.12; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, limit);
    },
    snapshot: function () {
      return {
        v: 2,
        nodes: this.nodes.slice(-50).map(function (n) {
          return { h: hashStr(n.text), w: n.w, ts: n.ts, emb: (n.emb || []).map(function (x) { return +x.toFixed(4); }) };
        }),
        edges: this.edges.slice(-80).map(function (e) {
          return { a: e.a, b: e.b, w: e.w, kind: e.kind };
        })
      };
    },
    absorbSnapshot: async function (snap, weight) {
      weight = weight == null ? 0.25 : weight;
      (snap.nodes || []).forEach(function (n) {
        var id = "h" + n.h;
        if (!GraphDB.nodes.some(function (x) { return x.id === id; })) {
          GraphDB.nodes.push({
            id: id,
            text: "anon:" + n.h,
            ts: n.ts || Date.now(),
            emotion: 0,
            w: weight,
            emb: n.emb || embed(String(n.h)),
            anon: true
          });
        }
      });
      await this.save();
    },
    clear: async function () {
      this.nodes = [];
      this.edges = [];
      await idbClear(STORE);
    }
  };

  G.AKSI_GRAPH = GraphDB;
})(typeof window !== "undefined" ? window : self);
