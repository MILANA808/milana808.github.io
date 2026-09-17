/**
 * AKSI Soma Net v1.2 — trained on open knowledge + AKSI
 * Wikipedia-derived short facts + product knowledge
 * © AKSI · aksilove@internet.ru · 2026-09-17
 */
(function (G) {
  "use strict";
  var VERSION = "1.2.0-soma-open";
  var STORE = "aksi_soma_v12";
  var N_HIDDEN = 48, STEPS = 10, LEAK = 0.2, DT = 0.4, FEAT = 56;
  var ANSWERS = [
    { id: "aksi", text: "АКСИ — локальный интеллектуальный контур: нейроны Soma, память на устройстве, при необходимости WebLLM в браузере." },
    { id: "soma", text: "Soma Net — сеть из нейронов с потенциалом и синапсами. Ответ выбирает наиболее активный выходной нейрон." },
    { id: "ai", text: "Искусственный интеллект — область, которая изучает и создаёт системы, способные решать задачи, обычно требующие интеллекта." },
    { id: "nn", text: "Нейронная сеть — модель из связанных нейроноподобных элементов; обучение меняет веса связей." },
    { id: "neuron", text: "Нейрон — возбудимая клетка: потенциал, активация, передача сигнала другим клеткам через синапсы." },
    { id: "synapse", text: "Синапс — место контакта, через которое сигнал переходит от одного нейрона к другому или к клетке-мишени." },
    { id: "brain", text: "Мозг — центральный отдел нервной системы, скопление нейронов и синапсов, обрабатывающее информацию." },
    { id: "ml", text: "Машинное обучение — методы ИИ, где система учится на примерах, а не только по жёстким правилам." },
    { id: "dl", text: "Глубокое обучение — методы машинного обучения на многослойных представлениях (глубоких сетях)." },
    { id: "wiki", text: "Википедия — открытая многоязычная энциклопедия, которую пишут добровольцы." },
    { id: "contact", text: "Контакт автора АКСИ: aksilove@internet.ru" },
    { id: "hello", text: "Привет. Я Soma Net, обученная в том числе на открытых знаниях. Спросите про ИИ, нейроны или АКСИ." },
    { id: "memory", text: "Память АКСИ хранится локально в браузере на вашем устройстве." },
    { id: "learn", text: "Обучение Soma: ошибка на выходе меняет веса синапсов (delta-rule) по открытым и продуктовым примерам." },
    { id: "how", text: "Вопрос кодируется во вход → скрытые нейроны → выходы. Победитель даёт текст ответа." },
    { id: "private", text: "Локальный режим нужен для приватности: часть интеллекта работает без обязательного облака." },
    { id: "thanks", text: "Пожалуйста." },
    { id: "open", text: "Открытые данные для обучения взяты из кратких открытых энциклопедических описаний (Википедия) плюс знания АКСИ." },
    { id: "webllm", text: "Свободная длинная генерация текста — через WebLLM на странице Neural; Soma отвечает нейронной динамикой." },
    { id: "js", text: "Эта сеть работает целиком в JavaScript в браузере, без сервера для вывода ответа." }
  ];
  var CUES = [
    ["что такое акси", 0], ["акси", 0], ["про акси", 0],
    ["soma", 1], ["сома", 1], ["что такое soma", 1],
    ["искусственный интеллект", 2], ["что такое ии", 2], ["что такое ai", 2], ["ии", 2],
    ["что такое искусственный интеллект", 2], ["про ии", 2], ["ai это", 2],
    ["нейронная сеть", 3], ["нейросеть", 3], ["что такое нейросеть", 3],
    ["нейрон", 4], ["нейроны", 4], ["нервная клетка", 4],
    ["синапс", 5], ["синапсы", 5], ["связь нейронов", 5],
    ["мозг", 6], ["головной мозг", 6],
    ["машинное обучение", 7], ["machine learning", 7], ["ml", 7],
    ["глубокое обучение", 8], ["deep learning", 8], ["глубокие сети", 8],
    ["что такое глубокое обучение", 8], ["дип лернинг", 8],
    ["википедия", 9], ["wikipedia", 9], ["открытая энциклопедия", 9],
    ["контакт", 10], ["как связаться", 10], ["email", 10],
    ["привет", 11], ["здравствуй", 11], ["hello", 11],
    ["память", 12], ["где хранится", 12], ["локальная память", 12],
    ["обучение", 13], ["как учится", 13], ["на чём обучена", 13],
    ["как работает", 14], ["как отвечает", 14],
    ["приватность", 15], ["локальный", 15], ["без облака", 15],
    ["спасибо", 16],
    ["открытые данные", 17], ["open data", 17], ["откуда знания", 17],
    ["на чем обучена", 17], ["на открытых", 17], ["wiki данные", 17],
    ["webllm", 18], ["большая модель", 18],
    ["javascript", 19], ["в браузере", 19], ["без сервера", 19]
  ];
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function sig(x) { if (x < -12) return 0; if (x > 12) return 1; return 1 / (1 + Math.exp(-x)); }
  function features(text) {
    text = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    var f = new Float64Array(FEAT), i, j, h; if (!text) return f;
    var pad = "  " + text + "  ";
    for (i = 0; i < pad.length - 2; i++) { h = 2166136261; for (j = 0; j < 3; j++) { h ^= pad.charCodeAt(i + j); h = Math.imul(h, 16777619); } f[(h >>> 0) % FEAT] += 1; }
    for (i = 0; i < text.length; i++) { h = (text.charCodeAt(i) * 2654435761) >>> 0; f[h % FEAT] += 0.4; }
    var words = text.split(" ");
    for (i = 0; i < words.length; i++) { h = 2166136261; for (j = 0; j < words[i].length; j++) { h ^= words[i].charCodeAt(j); h = Math.imul(h, 16777619); } f[(h >>> 0) % FEAT] += 1.2; }
    var n = 0; for (i = 0; i < FEAT; i++) n += f[i] * f[i]; n = Math.sqrt(n) || 1;
    for (i = 0; i < FEAT; i++) f[i] /= n; return f;
  }
  function createNet() {
    var N_IN = FEAT, N_OUT = ANSWERS.length, N = N_IN + N_HIDDEN + N_OUT;
    var bias = new Float64Array(N), Wih = new Float64Array(N_HIDDEN * N_IN), Who = new Float64Array(N_OUT * N_HIDDEN), i;
    for (i = 0; i < Wih.length; i++) Wih[i] = randn() * 0.12;
    for (i = 0; i < Who.length; i++) Who[i] = randn() * 0.12;
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
        s += 0.04 * aHid[i]; vHid[i] = vHid[i] * (1 - LEAK) + DT * s; aHid[i] = sig(vHid[i]);
      }
      for (i = 0; i < model.N_OUT; i++) {
        s = model.bias[model.N_IN + model.N_HIDDEN + i];
        for (j = 0; j < model.N_HIDDEN; j++) s += model.Who[i * model.N_HIDDEN + j] * aHid[j];
        vOut[i] = vOut[i] * (1 - LEAK) + DT * s; aOut[i] = sig(vOut[i]);
      }
      var mean = 0; for (i = 0; i < model.N_OUT; i++) mean += aOut[i]; mean /= model.N_OUT;
      for (i = 0; i < model.N_OUT; i++) aOut[i] = sig(vOut[i] - 0.7 * (mean - aOut[i] * 0.1));
    }
    return { aIn: aIn, aHid: aHid, aOut: aOut };
  }
  function trainStep(model, feat, target, lr) {
    var out = forward(model, feat), i, j, err, loss = 0;
    for (i = 0; i < model.N_OUT; i++) {
      var tgt = i === target ? 0.95 : 0.04; err = out.aOut[i] - tgt; loss += err * err;
      var delta = err * out.aOut[i] * (1 - out.aOut[i]);
      model.bias[model.N_IN + model.N_HIDDEN + i] -= lr * delta;
      for (j = 0; j < model.N_HIDDEN; j++) model.Who[i * model.N_HIDDEN + j] -= lr * delta * out.aHid[j];
    }
    var dHid = new Float64Array(model.N_HIDDEN);
    for (i = 0; i < model.N_OUT; i++) {
      var tgt2 = i === target ? 0.95 : 0.04; err = out.aOut[i] - tgt2;
      var delta2 = err * out.aOut[i] * (1 - out.aOut[i]);
      for (j = 0; j < model.N_HIDDEN; j++) dHid[j] += model.Who[i * model.N_HIDDEN + j] * delta2;
    }
    for (j = 0; j < model.N_HIDDEN; j++) {
      var dh = dHid[j] * out.aHid[j] * (1 - out.aHid[j]);
      model.bias[model.N_IN + j] -= lr * 0.45 * dh;
      for (i = 0; i < model.N_IN; i++) model.Wih[j * model.N_IN + i] -= lr * 0.45 * dh * out.aIn[i];
    }
    return loss / model.N_OUT;
  }
  var model = null, lastLoss = null, epochsDone = 0, trained = false;
  function train(opts) {
    opts = opts || {}; var epochs = opts.epochs || 140, lr = opts.lr != null ? opts.lr : 0.32;
    model = createNet(); var total = 0, steps = 0, ep, i;
    for (ep = 0; ep < epochs; ep++) {
      var order = CUES.map(function (_, idx) { return idx; });
      for (i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
      for (i = 0; i < order.length; i++) { var c = CUES[order[i]]; total += trainStep(model, features(c[0]), c[1], lr); steps++; }
      epochsDone = ep + 1; if (ep === 50 || ep === 100) lr *= 0.5;
    }
    lastLoss = steps ? total / steps : null; trained = true; save();
    return { ok: true, version: VERSION, epochs: epochs, loss: lastLoss, neurons: model.N, synapses: model.Wih.length + model.Who.length, answers: ANSWERS.length, cues: CUES.length, data: "open Wikipedia summaries + AKSI product facts" };
  }
  function predict(q) {
    if (!model) { if (!load()) train({ epochs: 120 }); }
    var out = forward(model, features(q));
    var best = 0, bestA = -1, second = 0, i;
    for (i = 0; i < model.N_OUT; i++) if (out.aOut[i] > bestA) { bestA = out.aOut[i]; best = i; }
    for (i = 0; i < model.N_OUT; i++) if (i !== best && out.aOut[i] > second) second = out.aOut[i];
    var hidMean = 0; for (i = 0; i < model.N_HIDDEN; i++) hidMean += out.aHid[i]; hidMean /= model.N_HIDDEN;
    return { text: ANSWERS[best].text, answerId: ANSWERS[best].id, confidence: bestA, activation: bestA, margin: bestA - second, hiddenActivity: hidMean, scores: Array.from(out.aOut), source: "soma-open", architecture: "Soma-v1.2-open", offline: true, neurons: model.N };
  }
  function hasLexicalCue(q) {
    q = String(q || "").toLowerCase();
    var keys = ["акси", "soma", "сома", "ии", "интеллект", "ai", "нейро", "синап", "мозг", "машин", "глубок", "deep", "wiki", "вики", "контакт", "связ", "привет", "здрав", "памят", "обуч", "работа", "ответ", "приват", "локаль", "спасиб", "open", "открыт", "webllm", "javascript", "браузер", "сервер", "email", "hello", "ml", "сеть"];
    for (var i = 0; i < keys.length; i++) if (q.indexOf(keys[i]) >= 0) return true;
    return false;
  }
  function ask(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Нет стимула для нейронов.", source: "soma-open" };
    var out = predict(q);
    var cue = hasLexicalCue(q);
    var weak = cue ? (out.activation < 0.22 || out.margin < 0.03) : true;
    if (weak) return { text: "Нейроны не выбрали сильный выход. Спросите: ИИ, нейрон, синапс, мозг, АКСИ, открытые данные, контакт.", low: true, activation: out.activation, source: "soma-open", architecture: "Soma-v1.2-open" };
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
    return { version: VERSION, architecture: "Soma Net open-data trained", ready: !!model, trained: trained, neurons: model ? model.N : FEAT + N_HIDDEN + ANSWERS.length, hidden: N_HIDDEN, outputs: ANSWERS.length, cues: CUES.length, loss: lastLoss, epochsDone: epochsDone, data: "Wikipedia open summaries + AKSI", honest: "open-data rate network — not a human brain or frontier LLM" };
  }
  function ensure() { if (model) return status(); if (load()) return status(); return train({ epochs: 140, lr: 0.32 }); }
  G.AKSI_SOMA = { version: VERSION, train: train, ask: ask, think: ask, predict: predict, status: status, ensure: ensure, save: save, load: load, ANSWERS: ANSWERS, CUES: CUES };
})(typeof window !== "undefined" ? window : globalThis);
