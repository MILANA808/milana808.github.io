/**
 * AKSI Language Interpreter v1
 * Domain language → Quantum · Brain · Trust · Memory
 * © AKSI · aksilove@internet.ru · Proprietary · B2B product runtime
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-lang";
  function Token(type, value, line) { this.type = type; this.value = value; this.line = line; }
  function tokenize(src) {
    var tokens = [], i = 0, line = 1; src = String(src || "");
    while (i < src.length) {
      var c = src[i];
      if (c === "\n") { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === '"' || c === "'") {
        var q = c; i++; var s = "";
        while (i < src.length && src[i] !== q) {
          if (src[i] === "\\" && i + 1 < src.length) { s += src[i + 1]; i += 2; continue; }
          s += src[i++];
        }
        i++; tokens.push(new Token("STR", s, line)); continue;
      }
      if (/[0-9]/.test(c)) {
        var n = ""; while (i < src.length && /[0-9.]/.test(src[i])) n += src[i++];
        tokens.push(new Token("NUM", parseFloat(n), line)); continue;
      }
      if (/[A-Za-z_\u0400-\u04FF]/.test(c)) {
        var id = ""; while (i < src.length && /[A-Za-z0-9_\u0400-\u04FF.]/.test(src[i])) id += src[i++];
        var kw = { let: 1, fn: 1, if: 1, else: 1, return: 1, agent: 1, on: 1, true: 1, false: 1, null: 1 };
        if (kw[id]) tokens.push(new Token(id.toUpperCase(), id, line));
        else tokens.push(new Token("ID", id, line));
        continue;
      }
      if ("(){},=;+-*/<>!".indexOf(c) >= 0) {
        var two = src.slice(i, i + 2);
        if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "->") { tokens.push(new Token("OP", two, line)); i += 2; continue; }
        tokens.push(new Token("OP", c, line)); i++; continue;
      }
      i++;
    }
    tokens.push(new Token("EOF", null, line)); return tokens;
  }
  function Parser(tokens) { this.t = tokens; this.i = 0; }
  Parser.prototype.peek = function () { return this.t[this.i]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.expect = function (type, val) {
    var t = this.next();
    if (t.type !== type && t.value !== val) throw new Error("Line " + t.line + ": expected " + (val || type));
    return t;
  };
  Parser.prototype.parseProgram = function () {
    var body = []; while (this.peek().type !== "EOF") body.push(this.parseStmt());
    return { type: "Program", body: body };
  };
  Parser.prototype.parseStmt = function () {
    var p = this.peek();
    if (p.type === "LET") return this.parseLet();
    if (p.type === "FN") return this.parseFn();
    if (p.type === "IF") return this.parseIf();
    if (p.type === "RETURN") { this.next(); var e = this.parseExpr(); if (this.peek().value === ";") this.next(); return { type: "Return", expr: e }; }
    if (p.type === "AGENT") return this.parseAgent();
    if (p.type === "ON") return this.parseOn();
    var ex = this.parseExpr(); if (this.peek().value === ";") this.next(); return { type: "ExprStmt", expr: ex };
  };
  Parser.prototype.parseLet = function () {
    this.next(); var name = this.expect("ID").value; this.expect("OP", "="); var expr = this.parseExpr();
    if (this.peek().value === ";") this.next(); return { type: "Let", name: name, expr: expr };
  };
  Parser.prototype.parseFn = function () {
    this.next(); var name = this.expect("ID").value; this.expect("OP", "("); var params = [];
    if (this.peek().value !== ")") { params.push(this.expect("ID").value); while (this.peek().value === ",") { this.next(); params.push(this.expect("ID").value); } }
    this.expect("OP", ")"); this.expect("OP", "{"); var body = [];
    while (this.peek().value !== "}") body.push(this.parseStmt()); this.expect("OP", "}");
    return { type: "Fn", name: name, params: params, body: body };
  };
  Parser.prototype.parseIf = function () {
    this.next(); this.expect("OP", "("); var cond = this.parseExpr(); this.expect("OP", ")"); this.expect("OP", "{");
    var thenB = []; while (this.peek().value !== "}") thenB.push(this.parseStmt()); this.expect("OP", "}");
    var elseB = null;
    if (this.peek().type === "ELSE") { this.next(); this.expect("OP", "{"); elseB = []; while (this.peek().value !== "}") elseB.push(this.parseStmt()); this.expect("OP", "}"); }
    return { type: "If", cond: cond, then: thenB, else: elseB };
  };
  Parser.prototype.parseAgent = function () {
    this.next(); var name = this.expect("ID").value; this.expect("OP", "{"); var body = [];
    while (this.peek().value !== "}") body.push(this.parseStmt()); this.expect("OP", "}");
    return { type: "Agent", name: name, body: body };
  };
  Parser.prototype.parseOn = function () {
    this.next(); var event = this.expect("ID").value; this.expect("OP", "("); var params = [];
    if (this.peek().value !== ")") { params.push(this.expect("ID").value); while (this.peek().value === ",") { this.next(); params.push(this.expect("ID").value); } }
    this.expect("OP", ")"); this.expect("OP", "{"); var body = [];
    while (this.peek().value !== "}") body.push(this.parseStmt()); this.expect("OP", "}");
    return { type: "On", event: event, params: params, body: body };
  };
  Parser.prototype.parseExpr = function () { return this.parseCompare(); };
  Parser.prototype.parseCompare = function () {
    var left = this.parseAdd(); var op = this.peek().value;
    if (op === "==" || op === "!=" || op === "<" || op === ">" || op === "<=" || op === ">=") {
      this.next(); return { type: "Binary", op: op, left: left, right: this.parseAdd() };
    }
    return left;
  };
  Parser.prototype.parseAdd = function () {
    var left = this.parseMul();
    while (this.peek().value === "+" || this.peek().value === "-") {
      var op = this.next().value; left = { type: "Binary", op: op, left: left, right: this.parseMul() };
    }
    return left;
  };
  Parser.prototype.parseMul = function () {
    var left = this.parseUnary();
    while (this.peek().value === "*" || this.peek().value === "/") {
      var op = this.next().value; left = { type: "Binary", op: op, left: left, right: this.parseUnary() };
    }
    return left;
  };
  Parser.prototype.parseUnary = function () {
    if (this.peek().value === "!") { this.next(); return { type: "Unary", op: "!", expr: this.parseUnary() }; }
    if (this.peek().value === "-") { this.next(); return { type: "Unary", op: "-", expr: this.parseUnary() }; }
    return this.parseCall();
  };
  Parser.prototype.parseCall = function () {
    var left = this.parsePrimary();
    while (true) {
      if (this.peek().value === "(") {
        this.next(); var args = [];
        if (this.peek().value !== ")") { args.push(this.parseExpr()); while (this.peek().value === ",") { this.next(); args.push(this.parseExpr()); } }
        this.expect("OP", ")"); left = { type: "Call", callee: left, args: args };
      } else if (this.peek().value === ".") {
        this.next(); left = { type: "Member", object: left, prop: this.expect("ID").value };
      } else break;
    }
    return left;
  };
  Parser.prototype.parsePrimary = function () {
    var t = this.peek();
    if (t.type === "NUM") { this.next(); return { type: "Num", value: t.value }; }
    if (t.type === "STR") { this.next(); return { type: "Str", value: t.value }; }
    if (t.type === "TRUE") { this.next(); return { type: "Bool", value: true }; }
    if (t.type === "FALSE") { this.next(); return { type: "Bool", value: false }; }
    if (t.type === "NULL") { this.next(); return { type: "Null" }; }
    if (t.type === "ID") { this.next(); return { type: "Id", name: t.value }; }
    if (t.value === "(") { this.next(); var e = this.parseExpr(); this.expect("OP", ")"); return e; }
    if (t.value === "{") { this.next(); while (this.peek().value !== "}" && this.peek().type !== "EOF") this.next(); this.expect("OP", "}"); return { type: "Obj", value: {} }; }
    throw new Error("Line " + t.line + ": unexpected " + t.type);
  };
  function Env(parent) { this.parent = parent || null; this.vars = Object.create(null); }
  Env.prototype.get = function (k) { if (k in this.vars) return this.vars[k]; if (this.parent) return this.parent.get(k); return undefined; };
  Env.prototype.define = function (k, v) { this.vars[k] = v; };
  function ReturnSignal(v) { this.value = v; }
  function simpleHash(s) {
    var h = 0x811c9dc5; s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function makeBuiltins(env, host) {
    host = host || G; var mem = [];
    try { mem = JSON.parse(localStorage.getItem("aksi_lang_mem") || "[]"); } catch (e) {}
    env.define("print", function () { var a = Array.prototype.slice.call(arguments); console.log.apply(console, a); return a.join(" "); });
    env.define("hash", function (s) { return simpleHash(s); });
    env.define("remember", function (s) {
      mem.push({ t: String(s), ts: Date.now() });
      try { localStorage.setItem("aksi_lang_mem", JSON.stringify(mem.slice(-80))); } catch (e) {}
      return true;
    });
    env.define("recall", function (q) {
      q = String(q || "").toLowerCase();
      for (var i = mem.length - 1; i >= 0; i--) if (String(mem[i].t).toLowerCase().indexOf(q) >= 0) return mem[i].t;
      return null;
    });
    env.define("quantum", { shot: function (q) {
      if (host.AKSI_QUANTUM && host.AKSI_QUANTUM.shot) return host.AKSI_QUANTUM.shot(q);
      return { bits: "00", QCLI: 0.5, resonance: 0.5, label: "stub" };
    }});
    env.define("brain", { think: function (q) {
      if (host.AKSI_BRAIN && host.AKSI_BRAIN.complete) {
        var r = host.AKSI_BRAIN.complete(q); if (r && r.text) return r.text;
      }
      return "АКСИ (lang): " + String(q).slice(0, 120);
    }});
    env.define("trust", { verify: function () { return { trust: "medium", score: 0.7 }; } });
    env.define("AKSI", { version: VER, product: "AKSI B2B Runtime" });
  }
  function evalNode(node, env) {
    if (!node) return null;
    switch (node.type) {
      case "Program": { var last = null; for (var i = 0; i < node.body.length; i++) last = evalNode(node.body[i], env); return last; }
      case "Let": env.define(node.name, evalNode(node.expr, env)); return env.get(node.name);
      case "Fn": {
        var fn = function () {
          var args = arguments, local = new Env(env);
          for (var j = 0; j < node.params.length; j++) local.define(node.params[j], args[j]);
          try { for (var k = 0; k < node.body.length; k++) evalNode(node.body[k], local); }
          catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; }
          return null;
        };
        env.define(node.name, fn); return fn;
      }
      case "Return": throw new ReturnSignal(evalNode(node.expr, env));
      case "If": {
        if (evalNode(node.cond, env)) { var t; for (var a = 0; a < node.then.length; a++) t = evalNode(node.then[a], env); return t; }
        else if (node.else) { var e; for (var b = 0; b < node.else.length; b++) e = evalNode(node.else[b], env); return e; }
        return null;
      }
      case "Agent": env.define(node.name, { __agent: true }); for (var c = 0; c < node.body.length; c++) evalNode(node.body[c], env); return node.name;
      case "On": {
        var handlers = env.get("__handlers") || {};
        handlers[node.event] = { params: node.params, body: node.body, env: env };
        env.define("__handlers", handlers); return node.event;
      }
      case "ExprStmt": return evalNode(node.expr, env);
      case "Num": return node.value; case "Str": return node.value; case "Bool": return node.value; case "Null": return null;
      case "Id": return env.get(node.name);
      case "Binary": {
        var L = evalNode(node.left, env), R = evalNode(node.right, env);
        if (node.op === "+") return typeof L === "string" || typeof R === "string" ? String(L) + String(R) : L + R;
        if (node.op === "-") return L - R; if (node.op === "*") return L * R; if (node.op === "/") return L / R;
        if (node.op === "==") return L === R; if (node.op === "!=") return L !== R;
        if (node.op === "<") return L < R; if (node.op === ">") return L > R;
        if (node.op === "<=") return L <= R; if (node.op === ">=") return L >= R; return null;
      }
      case "Unary": { var u = evalNode(node.expr, env); if (node.op === "!") return !u; if (node.op === "-") return -u; return u; }
      case "Member": { var obj = evalNode(node.object, env); return obj == null ? null : obj[node.prop]; }
      case "Call": {
        var callee = evalNode(node.callee, env);
        var args = node.args.map(function (x) { return evalNode(x, env); });
        if (typeof callee !== "function") throw new Error("Not a function");
        return callee.apply(null, args);
      }
      case "Obj": return node.value;
      default: return null;
    }
  }
  function run(src, options) {
    options = options || {};
    var tokens = tokenize(src);
    var ast = new Parser(tokens).parseProgram();
    var env = new Env();
    makeBuiltins(env, options.host || G);
    return { ok: true, result: evalNode(ast, env), env: env, version: VER };
  }
  function runQuery(src, query) {
    return new Promise(function (resolve) {
      try {
        var ran = run(src);
        var handlers = ran.env.get("__handlers") || {};
        var h = handlers.query;
        if (!h) {
          var qx = G.AKSI_QUANTUM && G.AKSI_QUANTUM.shot ? G.AKSI_QUANTUM.shot(query) : { bits: "??" };
          if (G.AKSI_LIVE && G.AKSI_LIVE.think) {
            G.AKSI_LIVE.think(query).then(function (r) {
              resolve({ text: r.text, meta: (r.meta || "lang") + " · q:" + (qx.bits || "?"), quantum: qx, lang: VER });
            });
            return;
          }
          if (G.AKSI_BRAIN && G.AKSI_BRAIN.complete) {
            var br = G.AKSI_BRAIN.complete(query);
            resolve({ text: (br && br.text) || "…", meta: "brain", lang: VER });
            return;
          }
          resolve({ text: "AKSI-Lang: " + query, meta: "lang", lang: VER });
          return;
        }
        var local = new Env(h.env);
        local.define(h.params[0] || "q", query);
        try { for (var i = 0; i < h.body.length; i++) evalNode(h.body[i], local); }
        catch (e) {
          if (e instanceof ReturnSignal) { resolve({ text: String(e.value), meta: "aksi-lang·agent", lang: VER }); return; }
          resolve({ text: "Lang error: " + e.message, meta: "error" }); return;
        }
        resolve({ text: "OK", meta: "aksi-lang", lang: VER });
      } catch (err) { resolve({ text: "Parse/runtime: " + err.message, meta: "error", lang: VER }); }
    });
  }
  var DEFAULT_AGENT = "// AKSI B2B Agent\nagent Sovereign {\n  on query(q) {\n    let qx = quantum.shot(q)\n    let ans = brain.think(q)\n    return ans\n  }\n}";
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>AKSI Language · v' + VER + '</h2>' +
      '<p class="muted">Язык суверенных агентов · B2B Runtime</p>' +
      '<textarea id="alSrc" style="min-height:140px;font-family:ui-monospace,monospace;font-size:12px">' + DEFAULT_AGENT.replace(/</g, "<") + '</textarea>' +
      '<input id="alQ" placeholder="Запрос агенту…" style="margin-top:8px">' +
      '<div class="row"><button type="button" class="btn p" id="alRun">Run source</button>' +
      '<button type="button" class="btn" id="alQuery">Query agent</button></div>' +
      '<pre id="alOut" class="out" style="margin-top:10px;max-height:240px">—</pre></div>';
    function show(x) { var el = document.getElementById("alOut"); if (el) el.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2); }
    document.getElementById("alRun").onclick = function () { try { show(run(document.getElementById("alSrc").value)); } catch (e) { show("Error: " + e.message); } };
    document.getElementById("alQuery").onclick = function () {
      runQuery(document.getElementById("alSrc").value, document.getElementById("alQ").value).then(show);
    };
  }
  G.AKSI_LANG = { version: VER, run: run, runQuery: runQuery, tokenize: tokenize, DEFAULT_AGENT: DEFAULT_AGENT, mount: mount };
})(typeof window !== "undefined" ? window : this);
