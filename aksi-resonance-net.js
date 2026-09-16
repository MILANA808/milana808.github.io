/**
 * ARIN v2.1 — Seal-Coupled Resonance Network (AKSI contribution)
 * L = CE + λ(1 - Born(h_query, seal(answer)))
 * Not claiming first complex NN in science.
 * © AKSI · aksilove@internet.ru · 2026-09-17
 */
(function (G) {
  "use strict";
  var VERSION = "2.1.0-seal-coupled";
  var STORE = "aksi_arin_v21";
  var D = 24, FEAT = 96, HIDDEN = 24;
  var TAU_CONF = 0.28, TAU_MARGIN = 0.04, TAU_BORN = 0.008, LAMBDA_SEAL = 0.35;
  var KB = [
    { q: "что такое акси", a: "АКСИ — локальный контур: Seal-Coupled Resonance (ARIN), память на устройстве, интернет и опциональная LLM." },
    { q: "что такое arin", a: "ARIN v2.1 — Seal-Coupled Resonance Network: комплексная сеть АКСИ, где обучение связывает класс ответа с seal-согласованностью." },
    { q: "что такое seal-coupled", a: "Seal-Coupled: в loss входит не только CE по классу, но и Born-близость скрытого состояния запроса к seal-вектору ответа." },
    { q: "чем акси отличается", a: "Вклад АКСИ: complex resonance + seal-coupled training + integrity gate в одном браузерном runtime." },
    { q: "как работает арин", a: "Запрос → ℂ-embed → CReLU-слой → интерференция с m_k → Born-отбор → проверка seal → gate." },
    { q: "born rule", a: "Born-like: s ∝ |⟨h, m⟩|². В seal-coupled то же перекрытие связывает запрос с печатью ответа." },
    { q: "crelu", a: "CReLU — ReLU отдельно к real и imag частям комплексной активации." },
    { q: "integrity gate", a: "Ответ выдаётся только при достаточных confidence, margin и born; иначе отказ." },
    { q: "вклад акси", a: "Не «первый complex NN в науке». Вклад: seal-coupled loss + gate + полный offline runtime АКСИ." },
    { q: "контакт", a: "aksilove@internet.ru" },
    { q: "как связаться", a: "Пишите на aksilove@internet.ru." },
    { q: "привет", a: "Привет. ARIN v2.1 Seal-Coupled на связи." },
    { q: "кто ты", a: "Я Seal-Coupled Resonance Network АКСИ — локальная комплексная сеть с seal-loss." },
    { q: "где память", a: "Эталоны и seal-векторы — в весах; факты пользователя — локально в браузере." },
    { q: "зачем локальный ии", a: "Приватность и работа без обязательного API." },
    { q: "что такое ии", a: "Обучаемые системы. ARIN — локальный слой АКСИ." },
    { q: "как запомнить", a: "запомни: факт — в локальную память; эталоны ARIN через train()." },
    { q: "нужен ли сервер", a: "Нет, ARIN обучается и отвечает в браузере." },
    { q: "помощь", a: "Спросите: seal-coupled, вклад акси, born rule, контакт." },
    { q: "спасибо", a: "Пожалуйста." }
  ];
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function zeros(n) { return new Float64Array(n); }
  function randArr(n, s) { s = s || 0.06; var a = zeros(n), i; for (i = 0; i < n; i++) a[i] = randn() * s; return a; }
  function cLen(n) { return 2 * n; }
  function hashTri(tri) { var h = 2166136261, j; for (j = 0; j < tri.length; j++) { h ^= tri.charCodeAt(j); h = Math.imul(h, 16777619); } return (h >>> 0) % FEAT; }
  function createModel(k) {
    return { embed: randArr(FEAT * cLen(D), 0.05), Wr: randArr(HIDDEN * D, Math.sqrt(1 / D) * 0.5), Wi: randArr(HIDDEN * D, Math.sqrt(1 / D) * 0.5), br: zeros(HIDDEN), bi: zeros(HIDDEN), mem: randArr(k * cLen(D), 0.05), seal: randArr(k * cLen(D), 0.05), k: k };
  }
  function encode(text, embed) {
    text = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    var z = zeros(cLen(D)); if (text.length < 2) return z;
    var pad = "  " + text + "  ", i, j, idx, base, n = 0;
    for (i = 0; i < pad.length - 2; i++) { idx = hashTri(pad.slice(i, i + 3)); base = idx * cLen(D); for (j = 0; j < cLen(D); j++) z[j] += embed[base + j]; n++; }
    if (n > 0) { var s = 1 / Math.sqrt(n); for (j = 0; j < z.length; j++) z[j] *= s; }
    return z;
  }
  function complexDense(z, model) {
    var h = zeros(cLen(HIDDEN)), i, j, re, im, wr, wi, zr, zi;
    for (i = 0; i < HIDDEN; i++) {
      re = model.br[i]; im = model.bi[i];
      for (j = 0; j < D; j++) { wr = model.Wr[i * D + j]; wi = model.Wi[i * D + j]; zr = z[2 * j]; zi = z[2 * j + 1]; re += wr * zr - wi * zi; im += wr * zi + wi * zr; }
      h[2 * i] = re > 0 ? re : 0; h[2 * i + 1] = im > 0 ? im : 0;
    }
    return h;
  }
  function cdot(a, b, n) { var re = 0, im = 0, i; for (i = 0; i < n; i++) { var ar = a[2 * i], ai = a[2 * i + 1], br = b[2 * i], bi = b[2 * i + 1]; re += ar * br + ai * bi; im += ai * br - ar * bi; } return { re: re, im: im }; }
  function cnorm2(z) { var s = 0, i; for (i = 0; i < z.length; i++) s += z[i] * z[i]; return s; }
  function bornPair(h, vec) { var d = cdot(h, vec, D); var den = (cnorm2(h) + 1e-12) * (cnorm2(vec) + 1e-12); return (d.re * d.re + d.im * d.im) / den; }
  function bornScores(h, mem, k) { var s = new Float64Array(k), i, j, m; for (i = 0; i < k; i++) { m = zeros(cLen(D)); for (j = 0; j < cLen(D); j++) m[j] = mem[i * cLen(D) + j]; s[i] = bornPair(h, m); } return s; }
  function getSeal(model, idx) { var m = zeros(cLen(D)), j; for (j = 0; j < cLen(D); j++) m[j] = model.seal[idx * cLen(D) + j]; return m; }
  function softmax(sc, temp) { temp = temp || 6; var max = -Infinity, i, sum = 0, p = new Float64Array(sc.length); for (i = 0; i < sc.length; i++) if (sc[i] > max) max = sc[i]; for (i = 0; i < sc.length; i++) { p[i] = Math.exp((sc[i] - max) * temp); sum += p[i]; } for (i = 0; i < sc.length; i++) p[i] /= sum || 1; return p; }
  function forward(model, text) { var z = encode(text, model.embed); var h = complexDense(z, model); var sc = bornScores(h, model.mem, model.k); return { z: z, h: h, scores: sc, p: softmax(sc) }; }
  function totalLoss(model, text, target) {
    var out = forward(model, text);
    var ce = -Math.log(Math.max(out.p[target], 1e-12));
    var sealVec = getSeal(model, target);
    var ansEmb = encode(KB[target].a, model.embed);
    var sealBorn = bornPair(out.h, sealVec);
    var ansBorn = bornPair(out.h, ansEmb);
    return { loss: ce + LAMBDA_SEAL * ((1 - sealBorn) + 0.25 * (1 - ansBorn)), ce: ce, seal: sealBorn, out: out };
  }
  function trainOne(model, text, target, lr) {
    var loss = totalLoss(model, text, target).loss;
    var eps = 1.5e-3, j, base, old, lp, lm;
    function L() { return totalLoss(model, text, target).loss; }
    for (j = 0; j < cLen(D); j++) { base = target * cLen(D) + j; old = model.mem[base]; model.mem[base] = old + eps; lp = L(); model.mem[base] = old - eps; lm = L(); model.mem[base] = old - lr * (lp - lm) / (2 * eps); }
    for (j = 0; j < cLen(D); j++) { base = target * cLen(D) + j; old = model.seal[base]; model.seal[base] = old + eps; lp = L(); model.seal[base] = old - eps; lm = L(); model.seal[base] = old - lr * (lp - lm) / (2 * eps); }
    var steps = Math.min(40, HIDDEN * D), s, ii, jj;
    for (s = 0; s < steps; s++) {
      ii = Math.floor(Math.random() * HIDDEN); jj = Math.floor(Math.random() * D); base = ii * D + jj;
      old = model.Wr[base]; model.Wr[base] = old + eps; lp = L(); model.Wr[base] = old - eps; lm = L(); model.Wr[base] = old - lr * 0.35 * (lp - lm) / (2 * eps);
      old = model.Wi[base]; model.Wi[base] = old + eps; lp = L(); model.Wi[base] = old - eps; lm = L(); model.Wi[base] = old - lr * 0.35 * (lp - lm) / (2 * eps);
    }
    var pad = "  " + String(text).toLowerCase() + "  ", seen = {}, i, idx;
    for (i = 0; i < pad.length - 2; i++) {
      idx = hashTri(pad.slice(i, i + 3)); if (seen[idx]) continue; seen[idx] = 1;
      for (j = 0; j < Math.min(4, cLen(D)); j++) {
        base = idx * cLen(D) + j; old = model.embed[base]; model.embed[base] = old + eps; lp = L(); model.embed[base] = old - eps; lm = L(); model.embed[base] = old - lr * 0.2 * (lp - lm) / (2 * eps);
      }
    }
    return loss;
  }
  var model = null, lastLoss = null, lastSeal = null, epochsDone = 0, trained = false;
  function train(opts) {
    opts = opts || {}; var epochs = opts.epochs || 36, lr = opts.lr != null ? opts.lr : 0.04, k = KB.length;
    model = createModel(k); var total = 0, sealSum = 0, steps = 0, ep, i;
    for (ep = 0; ep < epochs; ep++) {
      var order = []; for (i = 0; i < k; i++) order.push(i);
      for (i = k - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      for (i = 0; i < k; i++) { var id = order[i]; total += trainOne(model, KB[id].q, id, lr); sealSum += totalLoss(model, KB[id].q, id).seal; steps++; }
      epochsDone = ep + 1; if (ep === 14 || ep === 26) lr *= 0.5;
    }
    lastLoss = steps ? total / steps : null; lastSeal = steps ? sealSum / steps : null; trained = true; save();
    return { ok: true, version: VERSION, epochs: epochs, loss: lastLoss, meanSealBorn: lastSeal, classes: k, complexDim: D, architecture: "ARIN-v2.1-seal-coupled", contribution: "seal-coupled loss + integrity gate" };
  }
  function predict(q) {
    if (!model) { if (!load()) train({ epochs: 30 }); }
    var out = forward(model, q); var best = 0, bestP = -1, second = 0, i;
    for (i = 0; i < out.p.length; i++) if (out.p[i] > bestP) { bestP = out.p[i]; best = i; }
    for (i = 0; i < out.p.length; i++) if (i !== best && out.p[i] > second) second = out.p[i];
    return { text: KB[best].a, answer: KB[best].a, matched: KB[best].q, classId: best, confidence: bestP, margin: bestP - second, born: out.scores[best], sealBorn: bornPair(out.h, getSeal(model, best)), source: "resonance-net", architecture: "ARIN-v2.1", offline: true, loss: lastLoss };
  }
  function ask(q) {
    q = String(q || "").trim(); if (!q) return { text: "Задайте вопрос.", architecture: "ARIN-v2.1" };
    var out = predict(q);
    if (out.confidence < TAU_CONF || out.margin < TAU_MARGIN || out.born < TAU_BORN)
      return { text: "Резонанс слабый — ARIN не выдаёт ответ. Уточните вопрос или «исследуй: …».", low: true, confidence: out.confidence, born: out.born, sealBorn: out.sealBorn, architecture: "ARIN-v2.1", source: "resonance-net" };
    return out;
  }
  function save() {
    if (!model) return false;
    try { localStorage.setItem(STORE, JSON.stringify({ version: VERSION, embed: Array.from(model.embed), Wr: Array.from(model.Wr), Wi: Array.from(model.Wi), br: Array.from(model.br), bi: Array.from(model.bi), mem: Array.from(model.mem), seal: Array.from(model.seal), k: model.k, lastLoss: lastLoss, lastSeal: lastSeal, epochsDone: epochsDone, D: D, HIDDEN: HIDDEN })); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE); if (!raw) return false; var d = JSON.parse(raw);
      if (!d || d.k !== KB.length || d.D !== D || d.version !== VERSION) return false;
      model = { embed: Float64Array.from(d.embed), Wr: Float64Array.from(d.Wr), Wi: Float64Array.from(d.Wi), br: Float64Array.from(d.br), bi: Float64Array.from(d.bi), mem: Float64Array.from(d.mem), seal: Float64Array.from(d.seal), k: d.k };
      lastLoss = d.lastLoss; lastSeal = d.lastSeal; epochsDone = d.epochsDone || 0; trained = true; return true;
    } catch (e) { return false; }
  }
  function status() {
    var params = model ? model.embed.length + model.Wr.length + model.Wi.length + model.br.length + model.bi.length + model.mem.length + model.seal.length : 0;
    return { version: VERSION, architecture: "ARIN-v2.1-seal-coupled", fullName: "AKSI Seal-Coupled Resonance Network", ready: !!model, trained: trained, classes: KB.length, complexDim: D, hidden: HIDDEN, epochsDone: epochsDone, lastLoss: lastLoss, meanSealBorn: lastSeal, parameters: params, layers: ["complex-embed", "complex-dense-CReLU", "interference-memory", "Born-readout", "seal-check", "integrity-gate"], contribution: "seal-coupled training objective + product gate", kind: "seal-coupled complex resonance network" };
  }
  function ensure() { if (model) return status(); if (load()) return status(); return train({ epochs: 36, lr: 0.045 }); }
  function claim() {
    return { date: "2026-09-17", contact: "aksilove@internet.ru", notClaiming: "first complex neural network in the history of science", claiming: "AKSI product contribution: Seal-Coupled Resonance — joint CE + Born(query, answer-seal) training in complex space with integrity gate, full offline browser runtime", priorArt: "CVNN, complex backprop, holographic/interference memory exist; AKSI couples seal consistency into the same train loop for this product stack" };
  }
  try { ensure(); } catch (e) {}
  G.AKSI_RESONANCE = { version: VERSION, train: train, predict: predict, ask: ask, think: ask, status: status, ensure: ensure, save: save, load: load, claim: claim, KB: KB, architecture: function () { return { name: VERSION, date: "2026-09-17", contact: "aksilove@internet.ru", loss: "L = CE + λ(1 - Born(h, seal(answer)))", pipeline: status().layers, claim: claim() }; } };
})(typeof window !== "undefined" ? window : globalThis);
