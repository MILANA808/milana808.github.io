/**
 * AKSI Resonance Integrity Network — ARIN v2.0 FULL
 * text → complex embed → complex dense CReLU → interference memory → Born readout → gate
 * © AKSI · aksilove@internet.ru · 2026-09-17
 */
(function (G) {
  "use strict";
  var VERSION = "2.0.0-arin-full";
  var STORE = "aksi_arin_v2";
  var D = 24;
  var FEAT = 96;
  var HIDDEN = 24;
  var TAU_CONF = 0.28;
  var TAU_MARGIN = 0.04;
  var TAU_BORN = 0.008;
  var KB = [
    { q: "что такое акси", a: "АКСИ — локальный интеллектуальный контур: Resonance Net (ARIN), память на устройстве, интернет-поиск и опциональная LLM." },
    { q: "что такое arin", a: "ARIN — AKSI Resonance Integrity Network: комплекснозначная сеть с интерференцией памяти и Born-like отбором ответа." },
    { q: "что такое resonance net", a: "Resonance Net (ARIN v2) — полный стек: комплексный эмбеддинг, комплексный слой CReLU, банк эталонов, Born-метрика и integrity gate." },
    { q: "чем акси отличается", a: "АКСИ сочетает свою ARIN-сеть, локальную память, проверку уверенности и открытые источники — без обязательного облака." },
    { q: "как работает арин", a: "Запрос кодируется в ℂ^D, проходит комплексный слой, интерферирует с эталонами m_k; класс выбирается по |⟨h,m_k⟩|², затем gate." },
    { q: "born rule", a: "В ARIN Born-like readout: вклад класса пропорционален квадрату модуля комплексного перекрытия скрытого состояния и эталона." },
    { q: "crelu", a: "CReLU в ARIN — ReLU по отдельности к действительной и мнимой частям комплексной активации." },
    { q: "integrity gate", a: "Gate принимает ответ только если уверенность, запас до 2-го класса и Born-score выше порогов; иначе — отказ." },
    { q: "контакт", a: "aksilove@internet.ru" },
    { q: "как связаться", a: "Пишите на aksilove@internet.ru — публичный контакт АКСИ." },
    { q: "привет", a: "Привет. На связи ARIN v2 — полная Resonance-сеть АКСИ." },
    { q: "кто ты", a: "Я ARIN v2, нейросеть АКСИ с комплексными весами и резонансной памятью, не большая LLM." },
    { q: "где память", a: "Эталоны ARIN — в весах сети; факты пользователя — локально в браузере." },
    { q: "зачем локальный ии", a: "Приватность, меньше зависимости от API, работа при слабой сети." },
    { q: "что такое ии", a: "Искусственный интеллект — обучаемые системы. ARIN — локальный слой АКСИ." },
    { q: "как запомнить", a: "Напишите: запомни: факт. Для ARIN можно добавить эталон в KB и вызвать train()." },
    { q: "нужен ли сервер", a: "ARIN обучается и отвечает в браузере, сервер не обязателен." },
    { q: "помощь", a: "Спросите про ARIN, Born rule, CReLU, gate, контакт или АКСИ." },
    { q: "спасибо", a: "Пожалуйста." },
    { q: "обучить сеть", a: "Вызовите AKSI_RESONANCE.train() или откройте product — сеть дообучается ensure()." }
  ];
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function zeros(n) { return new Float64Array(n); }
  function randArr(n, s) { s = s || 0.06; var a = zeros(n), i; for (i = 0; i < n; i++) a[i] = randn() * s; return a; }
  function cLen(n) { return 2 * n; }
  function hashTri(tri) {
    var h = 2166136261, j;
    for (j = 0; j < tri.length; j++) { h ^= tri.charCodeAt(j); h = Math.imul(h, 16777619); }
    return (h >>> 0) % FEAT;
  }
  function createModel(k) {
    return {
      embed: randArr(FEAT * cLen(D), 0.05),
      Wr: randArr(HIDDEN * D, Math.sqrt(1 / D) * 0.5),
      Wi: randArr(HIDDEN * D, Math.sqrt(1 / D) * 0.5),
      br: zeros(HIDDEN), bi: zeros(HIDDEN),
      mem: randArr(k * cLen(D), 0.05), k: k
    };
  }
  function encode(text, embed) {
    text = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    var z = zeros(cLen(D));
    if (text.length < 2) return z;
    var pad = "  " + text + "  ", i, j, idx, base, n = 0;
    for (i = 0; i < pad.length - 2; i++) {
      idx = hashTri(pad.slice(i, i + 3));
      base = idx * cLen(D);
      for (j = 0; j < cLen(D); j++) z[j] += embed[base + j];
      n++;
    }
    if (n > 0) { var s = 1 / Math.sqrt(n); for (j = 0; j < z.length; j++) z[j] *= s; }
    return z;
  }
  function complexDense(z, model) {
    var h = zeros(cLen(HIDDEN)), i, j, re, im, wr, wi;
    for (i = 0; i < HIDDEN; i++) {
      re = model.br[i]; im = model.bi[i];
      for (j = 0; j < D; j++) {
        wr = model.Wr[i * D + j]; wi = model.Wi[i * D + j];
        var zr = z[2 * j], zi = z[2 * j + 1];
        re += wr * zr - wi * zi; im += wr * zi + wi * zr;
      }
      h[2 * i] = re > 0 ? re : 0; h[2 * i + 1] = im > 0 ? im : 0;
    }
    return h;
  }
  function cdot(a, b, n) {
    var re = 0, im = 0, i;
    for (i = 0; i < n; i++) {
      var ar = a[2 * i], ai = a[2 * i + 1], br = b[2 * i], bi = b[2 * i + 1];
      re += ar * br + ai * bi; im += ai * br - ar * bi;
    }
    return { re: re, im: im };
  }
  function cnorm2(z) { var s = 0, i; for (i = 0; i < z.length; i++) s += z[i] * z[i]; return s; }
  function bornScores(h, mem, k) {
    var s = new Float64Array(k), i, j, m, d, den, hn = cnorm2(h) + 1e-12;
    for (i = 0; i < k; i++) {
      m = zeros(cLen(D));
      for (j = 0; j < cLen(D); j++) m[j] = mem[i * cLen(D) + j];
      d = cdot(h, m, D);
      den = hn * (cnorm2(m) + 1e-12);
      s[i] = (d.re * d.re + d.im * d.im) / den;
    }
    return s;
  }
  function softmax(sc, temp) {
    temp = temp || 6;
    var max = -Infinity, i, sum = 0, p = new Float64Array(sc.length);
    for (i = 0; i < sc.length; i++) if (sc[i] > max) max = sc[i];
    for (i = 0; i < sc.length; i++) { p[i] = Math.exp((sc[i] - max) * temp); sum += p[i]; }
    for (i = 0; i < sc.length; i++) p[i] /= sum || 1;
    return p;
  }
  function forward(model, text) {
    var z = encode(text, model.embed);
    var h = complexDense(z, model);
    var sc = bornScores(h, model.mem, model.k);
    return { z: z, h: h, scores: sc, p: softmax(sc) };
  }
  function lossCE(p, target) { return -Math.log(Math.max(p[target], 1e-12)); }
  function trainOne(model, text, target, lr) {
    var out = forward(model, text);
    var loss = lossCE(out.p, target);
    var eps = 1.5e-3, j, base, old, lp, lm, g;
    for (j = 0; j < cLen(D); j++) {
      base = target * cLen(D) + j;
      old = model.mem[base];
      model.mem[base] = old + eps; lp = lossCE(forward(model, text).p, target);
      model.mem[base] = old - eps; lm = lossCE(forward(model, text).p, target);
      model.mem[base] = old; model.mem[base] = old - lr * (lp - lm) / (2 * eps);
    }
    var steps = Math.min(48, HIDDEN * D), s, ii, jj;
    for (s = 0; s < steps; s++) {
      ii = Math.floor(Math.random() * HIDDEN); jj = Math.floor(Math.random() * D); base = ii * D + jj;
      old = model.Wr[base];
      model.Wr[base] = old + eps; lp = lossCE(forward(model, text).p, target);
      model.Wr[base] = old - eps; lm = lossCE(forward(model, text).p, target);
      model.Wr[base] = old; model.Wr[base] = old - lr * 0.4 * (lp - lm) / (2 * eps);
      old = model.Wi[base];
      model.Wi[base] = old + eps; lp = lossCE(forward(model, text).p, target);
      model.Wi[base] = old - eps; lm = lossCE(forward(model, text).p, target);
      model.Wi[base] = old; model.Wi[base] = old - lr * 0.4 * (lp - lm) / (2 * eps);
    }
    var pad = "  " + String(text).toLowerCase() + "  ", seen = {}, i, idx;
    for (i = 0; i < pad.length - 2; i++) {
      idx = hashTri(pad.slice(i, i + 3)); if (seen[idx]) continue; seen[idx] = 1;
      for (j = 0; j < Math.min(6, cLen(D)); j++) {
        base = idx * cLen(D) + j; old = model.embed[base];
        model.embed[base] = old + eps; lp = lossCE(forward(model, text).p, target);
        model.embed[base] = old - eps; lm = lossCE(forward(model, text).p, target);
        model.embed[base] = old; model.embed[base] = old - lr * 0.25 * (lp - lm) / (2 * eps);
      }
    }
    return loss;
  }
  var model = null, lastLoss = null, epochsDone = 0, trained = false;
  function train(opts) {
    opts = opts || {};
    var epochs = opts.epochs || 35, lr = opts.lr != null ? opts.lr : 0.04, k = KB.length;
    model = createModel(k);
    var total = 0, steps = 0, ep, i;
    for (ep = 0; ep < epochs; ep++) {
      var order = []; for (i = 0; i < k; i++) order.push(i);
      for (i = k - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      for (i = 0; i < k; i++) { total += trainOne(model, KB[order[i]].q, order[i], lr); steps++; }
      epochsDone = ep + 1; if (ep === 15 || ep === 25) lr *= 0.5;
    }
    lastLoss = steps ? total / steps : null; trained = true; save();
    return { ok: true, version: VERSION, epochs: epochs, loss: lastLoss, classes: k, complexDim: D, hidden: HIDDEN, architecture: "ARIN-v2-full" };
  }
  function predict(q) {
    if (!model) { if (!load()) train({ epochs: 30 }); }
    var out = forward(model, q);
    var best = 0, bestP = -1, second = 0, i;
    for (i = 0; i < out.p.length; i++) if (out.p[i] > bestP) { bestP = out.p[i]; best = i; }
    for (i = 0; i < out.p.length; i++) if (i !== best && out.p[i] > second) second = out.p[i];
    return { text: KB[best].a, answer: KB[best].a, matched: KB[best].q, classId: best, confidence: bestP, margin: bestP - second, born: out.scores[best], source: "resonance-net", architecture: "ARIN-v2", offline: true, loss: lastLoss };
  }
  function ask(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Задайте вопрос.", source: "resonance-net", architecture: "ARIN-v2" };
    var out = predict(q);
    if (out.confidence < TAU_CONF || out.margin < TAU_MARGIN || out.born < TAU_BORN)
      return { text: "Резонанс ARIN слабый — уверенного ответа нет. Уточните вопрос или «исследуй: …».", source: "resonance-net", architecture: "ARIN-v2", low: true, confidence: out.confidence, margin: out.margin, born: out.born };
    return out;
  }
  function save() {
    if (!model) return false;
    try {
      localStorage.setItem(STORE, JSON.stringify({ version: VERSION, embed: Array.from(model.embed), Wr: Array.from(model.Wr), Wi: Array.from(model.Wi), br: Array.from(model.br), bi: Array.from(model.bi), mem: Array.from(model.mem), k: model.k, lastLoss: lastLoss, epochsDone: epochsDone, D: D, HIDDEN: HIDDEN }));
      return true;
    } catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE); if (!raw) return false;
      var d = JSON.parse(raw); if (!d || d.k !== KB.length || d.D !== D || d.version !== VERSION) return false;
      model = { embed: Float64Array.from(d.embed), Wr: Float64Array.from(d.Wr), Wi: Float64Array.from(d.Wi), br: Float64Array.from(d.br), bi: Float64Array.from(d.bi), mem: Float64Array.from(d.mem), k: d.k };
      lastLoss = d.lastLoss; epochsDone = d.epochsDone || 0; trained = true; return true;
    } catch (e) { return false; }
  }
  function paramCount() {
    if (!model) return 0;
    return model.embed.length + model.Wr.length + model.Wi.length + model.br.length + model.bi.length + model.mem.length;
  }
  function status() {
    return { version: VERSION, architecture: "ARIN-v2-full", fullName: "AKSI Resonance Integrity Network v2", ready: !!model, trained: trained, classes: KB.length, complexDim: D, hidden: HIDDEN, epochsDone: epochsDone, lastLoss: lastLoss, parameters: paramCount(), layers: ["complex-embed", "complex-dense-CReLU", "interference-memory", "Born-readout", "integrity-gate"], kind: "full complex resonance neural network" };
  }
  function ensure() {
    if (model) return status();
    if (load()) return status();
    return train({ epochs: 35, lr: 0.045 });
  }
  function architecture() {
    return { name: "ARIN-v2-full", date: "2026-09-17", contact: "aksilove@internet.ru", pipeline: ["trigram hash → ℂ^D embed", "complex dense W=Wr+iWi + CReLU", "Born overlap vs memory bank", "softmax + integrity gate"], formulas: { dense: "h = CReLU((Wr+iWi)z + b)", born: "s_k = |⟨h,m_k⟩|² / (‖h‖²‖m_k‖²)", gate: "accept if conf≥τ and margin≥μ and born≥β" } };
  }
  try { ensure(); } catch (e) {}
  G.AKSI_RESONANCE = { version: VERSION, architecture: architecture, train: train, predict: predict, ask: ask, think: ask, complete: function (q) { return ask(q); }, status: status, ensure: ensure, save: save, load: load, KB: KB, forward: function (q) { return model ? forward(model, q) : null; } };
})(typeof window !== "undefined" ? window : globalThis);
