/**
 * AKSI Resonance Net (ARIN) v1.0
 * complex features → interference memory → Born-like readout → integrity gate
 * © AKSI · aksilove@internet.ru · 2026-09-17
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0-arin";
  var STORE = "aksi_resonance_net_v1";
  var D = 32;
  var FEAT_HASH = 128;
  var KB = [
    { q: "что такое акси", a: "АКСИ — локальный помощник с Resonance Net: ответы через интерференцию памяти и проверку уверенности." },
    { q: "что такое resonance net", a: "AKSI Resonance Net (ARIN) — сеть с комплекснозначными признаками, интерференционным сопоставлением и Born-like отбором." },
    { q: "чем акси отличается", a: "У АКСИ свой контур: Resonance Net + личная база + интернет + опциональная LLM. Ответ — только при достаточном резонансе." },
    { q: "как работает арин", a: "Текст → комплексные эмбеддинги триграмм → скалярное произведение с эталонами → квадрат модуля → класс и gate." },
    { q: "контакт", a: "aksilove@internet.ru" },
    { q: "как связаться", a: "Пишите на aksilove@internet.ru." },
    { q: "привет", a: "Привет. Я Resonance Net АКСИ — спрашивайте про архитектуру, память или продукт." },
    { q: "кто ты", a: "Я ARIN — Resonance Integrity Network внутри АКСИ, не большая LLM." },
    { q: "где память", a: "Эталоны — в паттернах сети; пользовательские факты — локально в браузере." },
    { q: "зачем локальный ии", a: "Приватность и работа без обязательного облака. ARIN крутится у вас в браузере." },
    { q: "что такое ии", a: "ИИ — системы, обучаемые на данных. ARIN — локальный слой АКСИ." },
    { q: "как запомнить", a: "Команда: запомни: факт. Эталон ARIN можно добавить в базу и переобучить." },
    { q: "нужен ли сервер", a: "Для ARIN сервер не нужен: обучение и вывод в браузере." },
    { q: "born rule", a: "В ARIN Born-like: уверенность класса пропорциональна квадрату модуля комплексного перекрытия." },
    { q: "помощь", a: "Спросите: что такое resonance net, чем акси отличается, born rule, контакт." },
    { q: "спасибо", a: "Пожалуйста." }
  ];
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function zeros(n) { return new Float64Array(n); }
  function czeros() { return zeros(2 * D); }
  function cdot(a, b) {
    var re = 0, im = 0, i;
    for (i = 0; i < D; i++) {
      var ar = a[2 * i], ai = a[2 * i + 1], br = b[2 * i], bi = b[2 * i + 1];
      re += ar * br + ai * bi; im += ai * br - ar * bi;
    }
    return { re: re, im: im };
  }
  function cnorm2(z) { var s = 0, i; for (i = 0; i < z.length; i++) s += z[i] * z[i]; return s; }
  function bornOverlap(z, m) {
    var d = cdot(z, m);
    return (d.re * d.re + d.im * d.im) / (cnorm2(z) * cnorm2(m) + 1e-12);
  }
  function hashTri(tri) {
    var h = 2166136261, j;
    for (j = 0; j < tri.length; j++) { h ^= tri.charCodeAt(j); h = Math.imul(h, 16777619); }
    return (h >>> 0) % FEAT_HASH;
  }
  function createEmbed() {
    var e = zeros(FEAT_HASH * 2 * D), i;
    for (i = 0; i < e.length; i++) e[i] = randn() * 0.08;
    return e;
  }
  function createMemories(k) {
    var M = zeros(k * 2 * D), i;
    for (i = 0; i < M.length; i++) M[i] = randn() * 0.08;
    return M;
  }
  function encode(text, embed) {
    text = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    var z = czeros();
    if (text.length < 2) return z;
    var pad = "  " + text + "  ", i, idx, base, j, count = 0;
    for (i = 0; i < pad.length - 2; i++) {
      idx = hashTri(pad.slice(i, i + 3));
      base = idx * 2 * D;
      for (j = 0; j < 2 * D; j++) z[j] += embed[base + j];
      count++;
    }
    if (count > 0) { var s = 1 / Math.sqrt(count); for (j = 0; j < z.length; j++) z[j] *= s; }
    return z;
  }
  function scores(z, memories, k) {
    var s = new Float64Array(k), i, m, j;
    for (i = 0; i < k; i++) {
      m = zeros(2 * D);
      for (j = 0; j < 2 * D; j++) m[j] = memories[i * 2 * D + j];
      s[i] = bornOverlap(z, m);
    }
    return s;
  }
  function softmax(arr) {
    var max = -Infinity, i, sum = 0, out = new Float64Array(arr.length);
    for (i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
    for (i = 0; i < arr.length; i++) { out[i] = Math.exp((arr[i] - max) * 8); sum += out[i]; }
    for (i = 0; i < arr.length; i++) out[i] /= sum || 1;
    return out;
  }
  function trainStep(embed, memories, text, target, lr, k) {
    var z = encode(text, embed);
    var sc = scores(z, memories, k);
    var p = softmax(sc);
    var loss = -Math.log(Math.max(p[target], 1e-12));
    var eps = 1e-3, j, base, old, g, lossP, lossM;
    for (j = 0; j < 2 * D; j++) {
      base = target * 2 * D + j;
      old = memories[base];
      memories[base] = old + eps;
      lossP = -Math.log(Math.max(softmax(scores(encode(text, embed), memories, k))[target], 1e-12));
      memories[base] = old - eps;
      lossM = -Math.log(Math.max(softmax(scores(encode(text, embed), memories, k))[target], 1e-12));
      memories[base] = old;
      g = (lossP - lossM) / (2 * eps);
      memories[base] = old - lr * g;
    }
    var pad = "  " + String(text).toLowerCase() + "  ", seen = {}, i, idx;
    for (i = 0; i < pad.length - 2; i++) {
      idx = hashTri(pad.slice(i, i + 3));
      if (seen[idx]) continue;
      seen[idx] = 1;
      for (j = 0; j < Math.min(8, 2 * D); j++) {
        base = idx * 2 * D + j;
        old = embed[base];
        embed[base] = old + eps;
        lossP = -Math.log(Math.max(softmax(scores(encode(text, embed), memories, k))[target], 1e-12));
        embed[base] = old - eps;
        lossM = -Math.log(Math.max(softmax(scores(encode(text, embed), memories, k))[target], 1e-12));
        embed[base] = old;
        g = (lossP - lossM) / (2 * eps);
        embed[base] = old - lr * 0.3 * g;
      }
    }
    return loss;
  }
  var embed = null, memories = null, lastLoss = null, epochsDone = 0, trained = false;
  function train(opts) {
    opts = opts || {};
    var epochs = opts.epochs || 40, lr = opts.lr != null ? opts.lr : 0.05, k = KB.length;
    embed = createEmbed(); memories = createMemories(k);
    var total = 0, steps = 0, ep, i;
    for (ep = 0; ep < epochs; ep++) {
      var order = []; for (i = 0; i < k; i++) order.push(i);
      for (i = k - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      for (i = 0; i < k; i++) { total += trainStep(embed, memories, KB[order[i]].q, order[i], lr, k); steps++; }
      epochsDone = ep + 1; if (ep === 20) lr *= 0.5;
    }
    lastLoss = steps ? total / steps : null; trained = true; save();
    return { ok: true, epochs: epochs, loss: lastLoss, classes: k, dim: D, type: "ARIN complex resonance" };
  }
  function predict(q) {
    if (!embed || !memories) { if (!load()) train({ epochs: 40 }); }
    var z = encode(q, embed), sc = scores(z, memories, KB.length), p = softmax(sc);
    var best = 0, bestP = -1, second = 0, i;
    for (i = 0; i < p.length; i++) if (p[i] > bestP) { bestP = p[i]; best = i; }
    for (i = 0; i < p.length; i++) if (i !== best && p[i] > second) second = p[i];
    return { text: KB[best].a, answer: KB[best].a, matched: KB[best].q, classId: best, confidence: bestP, margin: bestP - second, born: sc[best], source: "resonance-net", architecture: "ARIN", offline: true };
  }
  function ask(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Задайте вопрос.", source: "resonance-net" };
    var out = predict(q);
    if (out.confidence < 0.30 || out.margin < 0.05 || out.born < 0.01)
      return { text: "Резонанс слабый — ответа из ARIN нет. Уточните вопрос или «исследуй: …».", source: "resonance-net", low: true, confidence: out.confidence, born: out.born, architecture: "ARIN" };
    return out;
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ version: VERSION, embed: Array.from(embed), memories: Array.from(memories), lastLoss: lastLoss, epochsDone: epochsDone, k: KB.length, D: D }));
      return true;
    } catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE); if (!raw) return false;
      var d = JSON.parse(raw); if (!d || d.k !== KB.length || d.D !== D) return false;
      embed = Float64Array.from(d.embed); memories = Float64Array.from(d.memories);
      lastLoss = d.lastLoss; epochsDone = d.epochsDone || 0; trained = true; return true;
    } catch (e) { return false; }
  }
  function status() {
    return { version: VERSION, architecture: "ARIN", fullName: "AKSI Resonance Integrity Network", ready: !!(embed && memories), trained: trained, classes: KB.length, complexDim: D, epochsDone: epochsDone, lastLoss: lastLoss, kind: "complex interference + Born-like readout" };
  }
  function ensure() {
    if (embed && memories) return status();
    if (load()) return status();
    return train({ epochs: 45, lr: 0.06 });
  }
  try { ensure(); } catch (e) {}
  G.AKSI_RESONANCE = { version: VERSION, architecture: "ARIN", train: train, predict: predict, ask: ask, think: ask, status: status, ensure: ensure, KB: KB };
})(typeof window !== "undefined" ? window : globalThis);
