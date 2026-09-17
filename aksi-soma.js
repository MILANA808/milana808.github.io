/**
 * AKSI Soma Net v1.1 — explicit rate neurons
 * v leaky integrator → a=σ(v) → synapses → output competition → answer
 * © AKSI · aksilove@internet.ru · 2026-09-17
 */
(function (G) {
  "use strict";
  var VERSION = "1.1.0-soma";
  var STORE = "aksi_soma_v11";
  var N_HIDDEN = 40, STEPS = 10, LEAK = 0.2, DT = 0.4, FEAT = 48;
  var ANSWERS = [
    { id: "aksi", text: "АКСИ — локальный интеллектуальный контур: нейроны Soma, память на устройстве, при необходимости большая модель в браузере." },
    { id: "soma", text: "Soma Net — сеть из отдельных нейронов. Вход возбуждает скрытый слой, скрытый — выходные нейроны ответов." },
    { id: "neuron", text: "Нейрон: потенциал v, активация a, порог и bias. Ток от синапсов меняет v, затем a = σ(v)." },
    { id: "contact", text: "Контакт автора АКСИ: aksilove@internet.ru" },
    { id: "hello", text: "Привет. Я Soma — нейронная сеть АКСИ из связанных клеток." },
    { id: "memory", text: "Память АКСИ локальна: в браузере на вашем устройстве." },
    { id: "learn", text: "Обучение: ошибка на выходных нейронах меняет веса синапсов (delta-rule)." },
    { id: "how", text: "Вопрос → входные нейроны → скрытые → выходные. Ответ = нейрон с наибольшей активацией." },
    { id: "private", text: "Локальные нейроны работают без обязательного облака — это про контроль и приватность." },
    { id: "thanks", text: "Пожалуйста." },
    { id: "brain", text: "Это rate-модель нейронов, упрощение биологии. Идея та же: клетки, связи, динамика." },
    { id: "gate", text: "Если активация выхода слабая, сеть честно говорит, что не уверена." }
  ];
  var CUES = [
    ["что такое акси", 0], ["акси", 0], ["про акси", 0],
    ["что такое soma", 1], ["soma", 1], ["сома", 1],
    ["нейрон", 2], ["нейроны", 2], ["клетка", 2],
    ["контакт", 3], ["как связаться", 3], ["email", 3],
    ["привет", 4], ["здравствуй", 4], ["hello", 4],
    ["память", 5], ["где хранится", 5], ["память акси", 5], ["локальная память", 5],
    ["обучение", 6], ["как учится", 6],
    ["как работает", 7], ["как отвечает", 7],
    ["приватность", 8], ["локальный", 8],
    ["спасибо", 9],
    ["мозг", 10], ["биология", 10],
    ["уверенность", 11], ["gate", 11]
  ];
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function sig(x) { if (x < -12) return 0; if (x > 12) return 1; return 1 / (1 + Math.exp(-x)); }
  function features(text) {
    text = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    var f = new Float64Array(FEAT), i, j, h;
    if (text.length < 1) return f;
    var pad = "  " + text + "  ";
    for (i = 0; i < pad.length - 2; i++) {
      h = 2166136261;
      for (j = 0; j < 3; j++) { h ^= pad.charCodeAt(i + j); h = Math.imul(h, 16777619); }
      f[(h >>> 0) % FEAT] += 1;
    }
    for (i = 0; i < text.length; i++) { h = (text.charCodeAt(i) * 2654435761) >>> 0; f[h % FEAT] += 0.5; }
    var n = 0; for (i = 0; i < FEAT; i++) n += f[i] * f[i]; n = Math.sqrt(n) || 1;
    for (i = 0; i < FEAT; i++) f[i] /= n; return f;
  }
  function createNet() {
    var N_IN = FEAT, N_OUT = ANSWERS.length, N = N_IN + N_HIDDEN + N_OUT;
    var bias = new Float64Array(N), Wih = new Float64Array(N_HIDDEN * N_IN), Who = new Float64Array(N_OUT * N_HIDDEN), i;
    for (i = 0; i < Wih.length; i++) Wih[i] = randn() * 0.15;
    for (i = 0; i < Who.length; i++) Who[i] = randn() * 0.15;
    for (i = 0; i < N; i++) bias[i] = randn() * 0.02;
    return { N_IN: N_IN, N_HIDDEN: N_HIDDEN, N_OUT: N_OUT, N: N, bias: bias, Wih: Wih, Who: Who };
  }
  function forward(model, feat) {
    var aIn = new Float64Array(model.N_IN), vHid = new Float64Array(model.N_HIDDEN), aHid = new Float64Array(model.N_HIDDEN);
    var vOut = new Float64Array(model.N_OUT), aOut = new Float64Array(model.N_OUT), i, j, s, t;
    for (i = 0; i < model.N_IN; i++) aIn[i] = feat[i];
    for (t = 0; t < STEPS; t++) {
      for (i = 0; i < model.N_HIDDEN; i++) {
        s = model.bias[model.N_IN + i];
        for (j = 0; j < model.N_IN; j++) s += model.Wih[i * model.N_IN + j] * aIn[j];
        s += 0.05 * aHid[i];
        vHid[i] = vHid[i] * (1 - LEAK) + DT * s;
        aHid[i] = sig(vHid[i]);
      }
      for (i = 0; i < model.N_OUT; i++) {
        s = model.bias[model.N_IN + model.N_HIDDEN + i];
        for (j = 0; j < model.N_HIDDEN; j++) s += model.Who[i * model.N_HIDDEN + j] * aHid[j];
        vOut[i] = vOut[i] * (1 - LEAK) + DT * s;
        aOut[i] = sig(vOut[i]);
      }
      var mean = 0; for (i = 0; i < model.N_OUT; i++) mean += aOut[i]; mean /= model.N_OUT;
      for (i = 0; i < model.N_OUT; i++) aOut[i] = sig(vOut[i] - 0.8 * (mean - aOut[i] * 0.1));
    }
    return { aIn: aIn, aHid: aHid, aOut: aOut, vHid: vHid, vOut: vOut };
  }
  function trainStep(model, feat, target, lr) {
    var out = forward(model, feat), i, j, err, loss = 0;
    for (i = 0; i < model.N_OUT; i++) {
      var tgt = i === target ? 0.95 : 0.05;
      err = out.aOut[i] - tgt; loss += err * err;
      var delta = err * out.aOut[i] * (1 - out.aOut[i]);
      model.bias[model.N_IN + model.N_HIDDEN + i] -= lr * delta;
      for (j = 0; j < model.N_HIDDEN; j++) model.Who[i * model.N_HIDDEN + j] -= lr * delta * out.aHid[j];
    }
    var dHid = new Float64Array(model.N_HIDDEN);
    for (i = 0; i < model.N_OUT; i++) {
      var tgt2 = i === target ? 0.95 : 0.05;
      err = out.aOut[i] - tgt2;
      var delta2 = err * out.aOut[i] * (1 - out.aOut[i]);
      for (j = 0; j < model.N_HIDDEN; j++) dHid[j] += model.Who[i * model.N_HIDDEN + j] * delta2;
    }
    for (j = 0; j < model.N_HIDDEN; j++) {
      var dh = dHid[j] * out.aHid[j] * (1 - out.aHid[j]);
      model.bias[model.N_IN + j] -= lr * 0.5 * dh;
      for (i = 0; i < model.N_IN; i++) model.Wih[j * model.N_IN + i] -= lr * 0.5 * dh * out.aIn[i];
    }
    return loss / model.N_OUT;
  }
  var model = null, lastLoss = null, epochsDone = 0, trained = false;
  function train(opts) {
    opts = opts || {}; var epochs = opts.epochs || 120, lr = opts.lr != null ? opts.lr : 0.35;
    model = createNet(); var total = 0, steps = 0, ep, i;
    for (ep = 0; ep < epochs; ep++) {
      var order = CUES.map(function (_, idx) { return idx; });
      for (i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
      for (i = 0; i < order.length; i++) { var c = CUES[order[i]]; total += trainStep(model, features(c[0]), c[1], lr); steps++; }
      epochsDone = ep + 1; if (ep === 40 || ep === 80) lr *= 0.5;
    }
    lastLoss = steps ? total / steps : null; trained = true; save();
    return { ok: true, version: VERSION, epochs: epochs, loss: lastLoss, neurons: model.N, synapses: model.Wih.length + model.Who.length, answers: ANSWERS.length };
  }
  function predict(q) {
    if (!model) { if (!load()) train({ epochs: 100 }); }
    var out = forward(model, features(q));
    var best = 0, bestA = -1, second = 0, i;
    for (i = 0; i < model.N_OUT; i++) if (out.aOut[i] > bestA) { bestA = out.aOut[i]; best = i; }
    for (i = 0; i < model.N_OUT; i++) if (i !== best && out.aOut[i] > second) second = out.aOut[i];
    var hidMean = 0; for (i = 0; i < model.N_HIDDEN; i++) hidMean += out.aHid[i]; hidMean /= model.N_HIDDEN;
    return { text: ANSWERS[best].text, answerId: ANSWERS[best].id, confidence: bestA, activation: bestA, margin: bestA - second, hiddenActivity: hidMean, scores: Array.from(out.aOut), source: "soma-net", architecture: "Soma-v1.1", offline: true, neurons: model.N };
  }
  function hasLexicalCue(q) {
    q = String(q || "").toLowerCase();
    var keys = ["акси", "soma", "сома", "нейрон", "контакт", "связ", "привет", "здрав", "памят", "обуч", "работа", "ответ", "приват", "локаль", "спасиб", "мозг", "gate", "email", "hello"];
    for (var i = 0; i < keys.length; i++) if (q.indexOf(keys[i]) >= 0) return true;
    return false;
  }
  function ask(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Вход пуст — нейроны без стимула.", source: "soma-net" };
    var out = predict(q);
    var cue = hasLexicalCue(q);
    var weak = cue ? (out.activation < 0.28 || out.margin < 0.04) : true;
    if (weak) return { text: "Нейроны не выбрали сильный выход. Спросите: АКСИ, Soma, нейрон, память, контакт, привет.", low: true, confidence: out.confidence, activation: out.activation, source: "soma-net", architecture: "Soma-v1.1" };
    return out;
  }
  function save() {
    if (!model) return false;
    try { localStorage.setItem(STORE, JSON.stringify({ version: VERSION, bias: Array.from(model.bias), Wih: Array.from(model.Wih), Who: Array.from(model.Who), lastLoss: lastLoss, epochsDone: epochsDone })); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE); if (!raw) return false; var d = JSON.parse(raw); if (!d || d.version !== VERSION) return false;
      model = createNet(); model.bias = Float64Array.from(d.bias); model.Wih = Float64Array.from(d.Wih); model.Who = Float64Array.from(d.Who);
      lastLoss = d.lastLoss; epochsDone = d.epochsDone || 0; trained = true; return true;
    } catch (e) { return false; }
  }
  function status() {
    return { version: VERSION, architecture: "Soma Net explicit rate neurons", ready: !!model, trained: trained, neurons: model ? model.N : FEAT + N_HIDDEN + ANSWERS.length, hidden: N_HIDDEN, outputs: ANSWERS.length, steps: STEPS, loss: lastLoss, epochsDone: epochsDone, kind: "leaky-integrator neurons + synapses + competition", honest: "neuron dynamics for answers — not a full human brain" };
  }
  function ensure() { if (model) return status(); if (load()) return status(); return train({ epochs: 120, lr: 0.35 }); }
  G.AKSI_SOMA = { version: VERSION, train: train, ask: ask, think: ask, predict: predict, status: status, ensure: ensure, save: save, load: load, ANSWERS: ANSWERS };
})(typeof window !== "undefined" ? window : globalThis);
