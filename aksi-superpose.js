/**
 * AKSI Superpose Engine v1.0
 * New interaction mode: multi-candidate answers → quantum amplitudes → collapse → seal
 * Not a physical QPU. Browser state-vector + Born-weighted selection over LLM/local candidates.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-superpose";
  var listeners = [];
  var lastSession = null;

  function emit(ev, data) {
    var p = { event: ev, t: Date.now(), data: data || {} };
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](p); } catch (e) {}
    }
    try {
      if (typeof CustomEvent !== "undefined") {
        window.dispatchEvent(new CustomEvent("aksi-superpose", { detail: p }));
      }
    } catch (e) {}
    return p;
  }
  function on(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
  }
  function clamp01(x) { x = +x; if (isNaN(x)) return 0; return x < 0 ? 0 : x > 1 ? 1 : x; }
  function round(x, d) { var p = Math.pow(10, d == null ? 4 : d); return Math.round(+x * p) / p; }
  function fnv(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function tok(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function overlap(a, b) {
    var s = {}, i, n = 0;
    for (i = 0; i < b.length; i++) s[b[i]] = 1;
    for (i = 0; i < a.length; i++) if (s[a[i]]) n++;
    return a.length ? n / a.length : 0;
  }

  function scoreCandidate(q, text, hint) {
    var conf = hint && hint.conf != null ? +hint.conf : 0.55;
    var o = overlap(tok(q), tok(text));
    var len = String(text || "").length;
    var structure = clamp01(0.3 + Math.min(0.4, len / 400));
    var eqs = conf * 0.55 + o * 0.25 + structure * 0.2;
    var qx = null, qcli = 0.5;
    try {
      if (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) {
        qx = AKSI_QUANTUM.answerGate(q, text);
        if (qx && qx.QCLI != null) qcli = +qx.QCLI;
        if (qx && qx.resonance != null) eqs = clamp01(eqs * 0.7 + (+qx.resonance) * 0.3);
      }
    } catch (e) {}
    try {
      if (G.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
        var ev = AKSI_ALGORITHM.evaluate(q, text, {});
        var e2 = ev && (ev.eqs != null ? ev.eqs : (ev.metrics && ev.metrics.eqs));
        if (e2 != null) eqs = clamp01(Number(e2) > 1 ? Number(e2) / 100 : Number(e2));
      }
    } catch (e) {}
    var amp = Math.sqrt(clamp01(eqs) * (0.35 + 0.65 * qcli));
    return {
      text: text,
      source: (hint && hint.source) || "cand",
      conf: round(conf, 3),
      eqs: round(eqs, 4),
      qcli: round(qcli, 4),
      amp: amp,
      quantum: qx
    };
  }

  function normalizeAmps(cands) {
    var sum = 0, i;
    for (i = 0; i < cands.length; i++) sum += cands[i].amp * cands[i].amp;
    if (sum < 1e-12) {
      var u = 1 / Math.sqrt(Math.max(1, cands.length));
      for (i = 0; i < cands.length; i++) {
        cands[i].amp = u;
        cands[i].prob = 1 / cands.length;
      }
      return cands;
    }
    var inv = 1 / Math.sqrt(sum);
    for (i = 0; i < cands.length; i++) {
      cands[i].amp = cands[i].amp * inv;
      cands[i].prob = cands[i].amp * cands[i].amp;
    }
    return cands;
  }

  function collapse(cands, mode) {
    mode = mode || "born";
    normalizeAmps(cands);
    var i, best = 0, bestP = -1;
    for (i = 0; i < cands.length; i++) {
      if (cands[i].prob > bestP) { bestP = cands[i].prob; best = i; }
    }
    if (mode === "max") {
      return { index: best, method: "max-amp", picked: cands[best] };
    }
    var r = Math.random(), acc = 0, idx = best;
    for (i = 0; i < cands.length; i++) {
      acc += cands[i].prob;
      if (r <= acc) { idx = i; break; }
    }
    if (cands[idx].prob < cands[best].prob * 0.35) idx = best;
    return { index: idx, method: "born+bias", picked: cands[idx] };
  }

  function localCandidates(q) {
    var out = [], seen = {};
    function add(text, source, conf) {
      text = String(text || "").trim();
      if (!text || text.length < 8) return;
      var k = text.slice(0, 80);
      if (seen[k]) return;
      seen[k] = 1;
      out.push({ text: text, source: source, conf: conf });
    }
    try {
      if (G.AKSI_ZERO && AKSI_ZERO.think) {
        var z = AKSI_ZERO.think(q);
        if (z) add(z.answer || z.text, "zero", z.confidence != null ? z.confidence : 0.65);
      }
    } catch (e) {}
    try {
      if (G.AKSI_NEURO && AKSI_NEURO.think) {
        var n = AKSI_NEURO.think(q);
        if (n) add(n.text || n.answer, "neuro", n.score != null ? n.score : 0.55);
      }
    } catch (e) {}
    try {
      if (G.AKSI_COMPOSE && AKSI_COMPOSE.think) {
        var c = AKSI_COMPOSE.think(q);
        if (c) add(c.text, c.mode || "compose", c.confidence != null ? c.confidence : 0.6);
      }
    } catch (e) {}
    try {
      if (G.AKSI_DECISION && AKSI_DECISION.decide) {
        var d = AKSI_DECISION.decide(q);
        if (d && d.answer) add(d.answer, "decision", 0.7);
      }
    } catch (e) {}
    add("АКСИ Superpose: локальный контур. Кандидаты взвешиваются амплитудами, ответ выбирается коллапсом (Born). WebLLM усиливает базис, если загружена.", "seed", 0.5);
    add("Принцип: не один поток токенов, а суперпозиция ответов → измерение по score/QCLI → печать.", "seed", 0.48);
    if (!out.length) add("Нет кандидатов. Загрузите WebLLM или используйте Zero.", "empty", 0.3);
    return out;
  }

  function llmCandidates(q, n) {
    n = Math.min(4, Math.max(1, n || 3));
    if (!G.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) {
      return Promise.resolve([]);
    }
    var temps = [0.2, 0.7, 1.05];
    var prompts = [
      q,
      "Ответь иначе, коротко и по делу:\n" + q,
      "Дай практичный вариант ответа:\n" + q
    ];
    var jobs = [];
    for (var i = 0; i < n; i++) {
      (function (idx) {
        jobs.push(
          AKSI_WEBLLM.complete(prompts[idx] || q, { temperature: temps[idx] || 0.7, max_tokens: 220 })
            .then(function (r) {
              if (r && r.text) return { text: r.text, source: "webllm-t" + (temps[idx] || 0.7), conf: 0.75 - idx * 0.05 };
              return null;
            })
            .catch(function () { return null; })
        );
      })(i);
    }
    return Promise.all(jobs).then(function (arr) {
      return arr.filter(Boolean);
    });
  }

  function ask(query, opts) {
    opts = opts || {};
    var q = String(query || "").trim();
    if (!q) return Promise.resolve({ ok: false, error: "empty" });
    var t0 = Date.now();
    emit("start", { query: q });
    emit("phase", { phase: "basis", note: "собираю базисные состояния (кандидаты)" });

    var local = opts.includeLocal === false ? [] : localCandidates(q);
    emit("candidates-local", { count: local.length });

    return llmCandidates(q, opts.n || 3).then(function (llm) {
      emit("candidates-llm", { count: llm.length });
      var raw = local.concat(llm);
      if (!raw.length) raw = localCandidates(q);
      emit("phase", { phase: "superpose", note: "строю амплитуды" });
      var scored = raw.map(function (c) {
        return scoreCandidate(q, c.text, c);
      });
      normalizeAmps(scored);
      emit("superposition", {
        states: scored.map(function (c, i) {
          return {
            i: i,
            source: c.source,
            prob: round(c.prob, 4),
            amp: round(c.amp, 4),
            eqs: c.eqs,
            qcli: c.qcli,
            preview: c.text.slice(0, 120)
          };
        })
      });
      emit("phase", { phase: "collapse", note: "измерение / коллапс" });
      var col = collapse(scored, opts.mode || "born");
      var picked = col.picked;
      var finalQx = null;
      try {
        if (G.AKSI_QPIPE && AKSI_QPIPE.processAnswer) {
          return AKSI_QPIPE.processAnswer(q, picked.text, { force: true }).then(function (qp) {
            finalQx = qp && (qp.quantum || qp);
            return finish();
          }).catch(function () { return finish(); });
        }
        if (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) {
          finalQx = AKSI_QUANTUM.answerGate(q, picked.text);
        }
      } catch (e) {}
      return finish();

      function finish() {
        var seal = {
          alg: "FNV-superpose-1",
          hash: fnv(q + "|" + picked.text + "|" + col.index),
          did: "did:aksi:local:superpose",
          ts: Date.now()
        };
        var session = {
          ok: true,
          version: VER,
          query: q,
          answer: picked.text,
          source: picked.source,
          collapse: { index: col.index, method: col.method, prob: round(picked.prob, 4) },
          scores: { eqs: picked.eqs, qcli: picked.qcli, amp: round(picked.amp, 4) },
          superposition: scored.map(function (c, i) {
            return {
              i: i,
              source: c.source,
              prob: round(c.prob, 4),
              eqs: c.eqs,
              qcli: c.qcli,
              text: c.text,
              selected: i === col.index
            };
          }),
          quantum: finalQx,
          seal: seal,
          offline: !(G.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready()),
          ms: Date.now() - t0
        };
        lastSession = session;
        emit("collapsed", session);
        emit("done", { ms: session.ms, index: col.index });
        return session;
      }
    });
  }

  function status() {
    var w = G.AKSI_WEBLLM ? AKSI_WEBLLM.status() : null;
    return {
      version: VER,
      webllm: w,
      quantum: !!(G.AKSI_QUANTUM || G.AKSI_QPIPE),
      last: lastSession && {
        query: lastSession.query,
        index: lastSession.collapse && lastSession.collapse.index,
        ms: lastSession.ms
      }
    };
  }

  G.AKSI_SUPERPOSE = {
    version: VER,
    ask: ask,
    on: on,
    status: status,
    last: function () { return lastSession; }
  };
})(typeof window !== "undefined" ? window : globalThis);
