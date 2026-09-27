/**
 * AKSI Math AI v1.0.1 — tokens → metrics → safe math → answer
 * Offline. Not AGI. aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.1-math";
  var IDENTITY = "АКСИ";

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFKC").replace(/ё/g, "е");
  }
  function tokenize(s) {
    s = norm(s).replace(/([+\-*/^=()%])/g, " $1 ");
    return s.split(/[^a-zа-я0-9.]+/i).filter(Boolean);
  }
  function words(s) {
    return tokenize(s).filter(function (t) {
      return t.length > 1 && !/^[+\-*/^=()%]$/.test(t);
    });
  }
  function tokenStats(s) {
    var toks = tokenize(s), w = words(s), f = {}, i, t, H = 0, n;
    for (i = 0; i < toks.length; i++) {
      t = toks[i];
      f[t] = (f[t] || 0) + 1;
    }
    n = toks.length || 1;
    for (t in f) {
      var p = f[t] / n;
      H -= p * Math.log2(p);
    }
    return {
      tokens: toks,
      count: toks.length,
      wordCount: w.length,
      unique: Object.keys(f).length,
      entropy: Math.round(H * 1000) / 1000,
      list: toks.slice(0, 40)
    };
  }
  function weightedOverlap(q, text) {
    var qt = words(q), tt = words(text), set = {}, i, hit = 0, wsum = 0;
    if (!qt.length) return 0;
    for (i = 0; i < tt.length; i++) set[tt[i]] = (set[tt[i]] || 0) + 1;
    for (i = 0; i < qt.length; i++) {
      var idf = 1 / Math.log2(3 + (set[qt[i]] || 0));
      wsum += idf;
      if (set[qt[i]]) hit += idf;
    }
    return wsum ? hit / wsum : 0;
  }

  function extractMath(s) {
    var m = String(s || "").match(
      /(?:посчитай|вычисли|сколько будет|calculate|compute)?\s*([0-9+\-*/().^\s%]+)=?/i
    );
    var expr = m ? m[1] : /^[0-9+\-*/().^\s%]+$/.test(String(s).trim()) ? String(s).trim() : null;
    if (!expr) return null;
    expr = expr.replace(/\s+/g, "").replace(/\^/g, "**");
    if (!/[0-9]/.test(expr)) return null;
    if (!/^[0-9+\-*/().%*]+$/.test(expr)) return null;
    return expr;
  }

  function safeEval(expr) {
    expr = String(expr).replace(/\s+/g, "");
    var toks = [], i = 0, n = expr.length;
    while (i < n) {
      if (/[0-9.]/.test(expr[i])) {
        var j = i;
        while (j < n && /[0-9.]/.test(expr[j])) j++;
        toks.push({ t: "n", v: parseFloat(expr.slice(i, j)) });
        i = j;
        continue;
      }
      if (expr.slice(i, i + 2) === "**") {
        toks.push({ t: "o", v: "**" });
        i += 2;
        continue;
      }
      if ("+-*/%()".indexOf(expr[i]) >= 0) {
        toks.push({ t: "()".indexOf(expr[i]) >= 0 ? "p" : "o", v: expr[i] });
        i++;
        continue;
      }
      return { ok: false, error: "char" };
    }
    var prec = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "**": 3 };
    var right = { "**": 1 };
    var out = [], st = [], k, op;
    for (k = 0; k < toks.length; k++) {
      var tok = toks[k];
      if (tok.t === "n") out.push(tok);
      else if (tok.t === "o") {
        while (st.length && st[st.length - 1].t === "o") {
          op = st[st.length - 1];
          var p1 = prec[op.v] || 0,
            p2 = prec[tok.v] || 0;
          if (p1 > p2 || (p1 === p2 && !right[tok.v])) out.push(st.pop());
          else break;
        }
        st.push(tok);
      } else if (tok.v === "(") st.push(tok);
      else if (tok.v === ")") {
        while (st.length && st[st.length - 1].v !== "(") out.push(st.pop());
        if (!st.length) return { ok: false, error: "paren" };
        st.pop();
      }
    }
    while (st.length) {
      if (st[st.length - 1].t === "p") return { ok: false, error: "paren" };
      out.push(st.pop());
    }
    var vs = [];
    for (k = 0; k < out.length; k++) {
      tok = out[k];
      if (tok.t === "n") vs.push(tok.v);
      else {
        if (vs.length < 2) return { ok: false, error: "stack" };
        var b = vs.pop(),
          a = vs.pop(),
          r;
        if (tok.v === "+") r = a + b;
        else if (tok.v === "-") r = a - b;
        else if (tok.v === "*") r = a * b;
        else if (tok.v === "/") r = b === 0 ? NaN : a / b;
        else if (tok.v === "%") r = a % b;
        else if (tok.v === "**") r = Math.pow(a, b);
        else return { ok: false, error: "op" };
        if (!isFinite(r)) return { ok: false, error: "nan" };
        vs.push(r);
      }
    }
    if (vs.length !== 1) return { ok: false, error: "end" };
    return { ok: true, value: vs[0], expr: expr };
  }

  var SEED = [
    { q: "формула aksi", a: "AKSI = (A × I × S) × (1 + 0.4√n): A=agency, I=integrity, S=sovereignty, n=опыт." },
    { q: "что такое токен", a: "Токен — единица разбора текста. Считаю частоты, энтропию и overlap, затем ранжирую ответ." },
    { q: "кто ты", a: "Я АКСИ Math AI: offline слой. Токены → метрики → safe math → ответ. Не облачная LLM." },
    { q: "как считаешь", a: "Токены запроса, веса, пересечение с SEED/Neuro/CLM; выражения — через shunting-yard без eval." },
    { q: "gate", a: "Gate ALLOW/BLOCK: слабый evidence → BLOCK. Default-deny на действие без фактов." },
    { q: "eqs", a: "EQS — качество ответа (ADIA): entropy, reliability, coherence, trust, memory → 0…100." }
  ];

  function rank(q) {
    return SEED.map(function (s) {
      return {
        text: s.a,
        score: 0.55 * weightedOverlap(q, s.q) + 0.45 * weightedOverlap(q, s.a),
        source: "math-seed"
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
  }

  function pullNeuro(q) {
    if (!G.AKSI_NEURO) return null;
    try {
      var r =
        (G.AKSI_NEURO.think && G.AKSI_NEURO.think(q)) ||
        (G.AKSI_NEURO.query && G.AKSI_NEURO.query(q));
      if (r && (r.text || r.answer))
        return { text: String(r.text || r.answer), score: r.score || 0.5, source: "neuro" };
    } catch (e) {}
    return null;
  }

  function pullCLM(q) {
    if (!G.AKSI_CLM || !G.AKSI_CLM.lookup) return null;
    try {
      var lr = G.AKSI_CLM.lookup(q);
      var items = (lr && lr.items) || (Array.isArray(lr) ? lr : lr ? [lr] : []);
      if (!items.length) return null;
      var t = items[0].fact || items[0].text || items[0].answer || "";
      return {
        text: String(t).slice(0, 400),
        score: items[0].tier === "sealed" ? 0.75 : 0.55,
        source: "clm"
      };
    } catch (e) {
      return null;
    }
  }

  function answer(query) {
    var q = String(query || "").trim();
    if (!q) return { ok: false, error: "empty", speaker: IDENTITY };
    var stats = tokenStats(q);
    var expr = extractMath(q);
    var math = expr ? safeEval(expr) : null;
    var parts = rank(q);
    var neu = pullNeuro(q);
    if (neu) parts.push(neu);
    var clm = pullCLM(q);
    if (clm) parts.push(clm);
    parts.sort(function (a, b) {
      return b.score - a.score;
    });
    var chunks = [];
    if (math && math.ok)
      chunks.push(
        "Результат: " + math.value + " (выражение: " + math.expr.replace(/\*\*/g, "^") + ")"
      );
    if (parts[0] && parts[0].score >= 0.22) chunks.push(parts[0].text);
    else if (!math || !math.ok)
      chunks.push(
        "Токенов: " +
          stats.count +
          " (уник. " +
          stats.unique +
          ", H=" +
          stats.entropy +
          "). Уточните вопрос или дайте выражение."
      );
    var text = "Я АКСИ. " + chunks.join(" ");
    var conf = math && math.ok ? 0.95 : parts[0] ? Math.min(0.9, Math.max(0.35, parts[0].score)) : 0.35;
    return {
      ok: true,
      speaker: IDENTITY,
      version: VER,
      answer: text,
      text: text,
      confidence: Math.round(conf * 1000) / 1000,
      tokens: stats,
      math: math,
      top: parts.slice(0, 3).map(function (p) {
        return {
          source: p.source,
          score: Math.round(p.score * 1000) / 1000,
          preview: String(p.text).slice(0, 80)
        };
      }),
      no_llm: true
    };
  }

  G.AKSI_MATH = {
    version: VER,
    answer: answer,
    tokenize: tokenize,
    tokenStats: tokenStats,
    safeEvalMath: safeEval,
    status: function () {
      return {
        version: VER,
        speaker: IDENTITY,
        no_llm: true,
        hasNeuro: !!(G.AKSI_NEURO && (G.AKSI_NEURO.think || G.AKSI_NEURO.query)),
        hasCLM: !!(G.AKSI_CLM && G.AKSI_CLM.lookup)
      };
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
