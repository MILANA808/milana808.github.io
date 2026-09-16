/**
 * AKSI Personal Net v1.0 — bag-of-char trigrams → MLP → answer
 * Real backprop. Auto-trains on load. Offline.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0-personal";
  var STORE = "aksi_personal_net_v1";
  var FEAT = 256;
  var KB = [
    { q: "что такое акси", a: "АКСИ — локальный помощник в браузере. Offline-first: память на вашем устройстве, без обязательных облачных API-ключей." },
    { q: "кто создал акси", a: "АКСИ развивает автор проекта. Публичный контакт: aksilove@internet.ru." },
    { q: "как связаться", a: "Пишите на aksilove@internet.ru — единственный публичный контакт АКСИ." },
    { q: "контакт", a: "Контакт автора АКСИ: aksilove@internet.ru" },
    { q: "что умеет акси", a: "Запоминать факты, искать с источниками, проверять память (CLM), отвечать личной сетью и большой LLM (WebLLM) в браузере." },
    { q: "как запомнить", a: "Напишите: запомни: ваш факт. Данные сохранятся локально." },
    { q: "как искать", a: "Напишите: исследуй: тема. АКСИ покажет выдержки со ссылками." },
    { q: "где хранится память", a: "Память хранится локально в браузере (localStorage и Cortex)." },
    { q: "что такое clm", a: "CLM — Closed-Loop Memory: после записи система сама проверяет воспроизведение (sealed / provisional / weak)." },
    { q: "что такое webllm", a: "WebLLM — языковая модель в браузере (WebGPU). Путь ответов как у большой нейросети без своего сервера." },
    { q: "нужен ли сервер", a: "Для базы АКСИ сервер не обязателен. Сначала локальные модули." },
    { q: "что такое акси net", a: "Личная нейросеть АКСИ: обучаемые веса выбирают ответ из вашей базы знаний." },
    { q: "что такое искусственный интеллект", a: "ИИ — системы, которые по данным помогают с текстом, поиском и решениями. Они ошибаются — важное проверяйте." },
    { q: "что такое ии", a: "ИИ — искусственный интеллект: модели, обученные на данных, помогают человеку." },
    { q: "как не выгорать", a: "Границы, сон, паузы, одна главная задача, маленькие шаги." },
    { q: "как начать день", a: "Сон, вода, одна главная задача, час без лишних уведомлений." },
    { q: "зачем локальный ии", a: "Приватность, меньше зависимости от API, работа при слабом интернете." },
    { q: "offline first", a: "Сначала польза без сети. Сеть усиливает, но не блокирует." },
    { q: "можно ли доверять ии", a: "Полностью — нет. ИИ ошибается. Проверяйте важное. АКСИ показывает происхождение ответа, когда может." },
    { q: "главный принцип акси", a: "Польза человеку, приватность, честность о возможностях." },
    { q: "модель не грузится", a: "Нужны Chrome или Edge, лучше WebGPU. Повторите загрузку и подождите." },
    { q: "как учиться", a: "Короткие сессии, сразу практика, повтор на следующий день, сон." },
    { q: "привет", a: "Привет! Я личная нейросеть АКСИ. Спросите про АКСИ, память, локальный ИИ." },
    { q: "кто ты", a: "Я Personal Net АКСИ — обученная сеть по базе знаний проекта. Для свободных длинных ответов включите WebLLM." },
    { q: "помощь", a: "Спросите про АКСИ; или запомни: …; исследуй: …; на product — «Включить нейросеть» для большой LLM." },
    { q: "спасибо", a: "Пожалуйста. Можете задать следующий вопрос." }
  ];
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function zeros(n) { return new Float64Array(n); }
  function features(text) {
    text = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    var f = zeros(FEAT); if (text.length < 2) return f;
    var pad = "  " + text + "  ";
    for (var i = 0; i < pad.length - 2; i++) {
      var tri = pad.slice(i, i + 3), h = 2166136261;
      for (var j = 0; j < tri.length; j++) { h ^= tri.charCodeAt(j); h = Math.imul(h, 16777619); }
      f[(h >>> 0) % FEAT] += 1;
    }
    var s = 0; for (var k = 0; k < FEAT; k++) s += f[k] * f[k]; s = Math.sqrt(s) || 1;
    for (k = 0; k < FEAT; k++) f[k] /= s; return f;
  }
  function createModel(nClass, H) {
    H = H || 48; var W1 = new Float64Array(H * FEAT), W2 = new Float64Array(nClass * H), i;
    for (i = 0; i < W1.length; i++) W1[i] = randn() * 0.05;
    for (i = 0; i < W2.length; i++) W2[i] = randn() * 0.05;
    return { H: H, nClass: nClass, W1: W1, b1: zeros(H), W2: W2, b2: zeros(nClass) };
  }
  function forward(model, x) {
    var H = model.H, C = model.nClass, h = zeros(H), y = zeros(C), i, j, s;
    for (i = 0; i < H; i++) { s = model.b1[i]; for (j = 0; j < FEAT; j++) s += model.W1[i * FEAT + j] * x[j]; h[i] = s > 0 ? s : 0; }
    for (i = 0; i < C; i++) { s = model.b2[i]; for (j = 0; j < H; j++) s += model.W2[i * H + j] * h[j]; y[i] = s; }
    var max = -Infinity; for (i = 0; i < C; i++) if (y[i] > max) max = y[i];
    var p = zeros(C), sum = 0; for (i = 0; i < C; i++) { p[i] = Math.exp(y[i] - max); sum += p[i]; }
    for (i = 0; i < C; i++) p[i] /= sum || 1; return { h: h, y: y, p: p };
  }
  function trainStep(model, x, target, lr) {
    var out = forward(model, x), H = model.H, C = model.nClass;
    var loss = -Math.log(Math.max(out.p[target], 1e-12));
    var dy = new Float64Array(out.p); dy[target] -= 1;
    var dh = zeros(H), i, j;
    for (i = 0; i < C; i++) for (j = 0; j < H; j++) dh[j] += model.W2[i * H + j] * dy[i];
    for (j = 0; j < H; j++) if (out.h[j] <= 0) dh[j] = 0;
    for (i = 0; i < C; i++) { model.b2[i] -= lr * dy[i]; for (j = 0; j < H; j++) model.W2[i * H + j] -= lr * dy[i] * out.h[j]; }
    for (i = 0; i < H; i++) { model.b1[i] -= lr * dh[i]; for (j = 0; j < FEAT; j++) model.W1[i * FEAT + j] -= lr * dh[i] * x[j]; }
    return loss;
  }
  var model = null, lastLoss = null, epochsDone = 0, trained = false;
  function train(opts) {
    opts = opts || {}; var epochs = opts.epochs || 100, lr = opts.lr != null ? opts.lr : 0.15;
    model = createModel(KB.length, opts.H || 48); var total = 0, steps = 0;
    for (var ep = 0; ep < epochs; ep++) {
      var order = [], i; for (i = 0; i < KB.length; i++) order.push(i);
      for (i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      for (i = 0; i < order.length; i++) {
        var id = order[i]; total += trainStep(model, features(KB[id].q), id, lr); steps++;
        if (KB[id].q.length > 6) { total += trainStep(model, features(KB[id].q.split(" ").reverse().join(" ")), id, lr * 0.5); steps++; }
      }
      epochsDone = ep + 1; if (ep === 40 || ep === 70) lr *= 0.5;
    }
    lastLoss = steps ? total / steps : null; trained = true; save();
    return { ok: true, epochs: epochs, loss: lastLoss, classes: KB.length, weights: model.W1.length + model.W2.length };
  }
  function predict(question) {
    if (!model) { if (!load()) train({ epochs: 100 }); }
    var out = forward(model, features(question)), best = 0, bestP = -1, second = 0, i;
    for (i = 0; i < out.p.length; i++) if (out.p[i] > bestP) { bestP = out.p[i]; best = i; }
    for (i = 0; i < out.p.length; i++) if (i !== best && out.p[i] > second) second = out.p[i];
    return { text: KB[best].a, answer: KB[best].a, matched: KB[best].q, classId: best, confidence: bestP, margin: bestP - second, source: "personal-net", generated: true, offline: true, loss: lastLoss };
  }
  function ask(q) {
    q = String(q || "").trim(); if (!q) return { text: "Задайте вопрос.", source: "personal-net" };
    var out = predict(q);
    if (out.confidence < 0.12 && out.margin < 0.03)
      return { text: "Не уверена. Спросите про АКСИ, память, WebLLM, контакт aksilove@internet.ru или включите большую LLM.", source: "personal-net", low: true, confidence: out.confidence };
    return out;
  }
  function save() {
    if (!model) return false;
    try { localStorage.setItem(STORE, JSON.stringify({ version: VERSION, W1: Array.from(model.W1), b1: Array.from(model.b1), W2: Array.from(model.W2), b2: Array.from(model.b2), H: model.H, nClass: model.nClass, lastLoss: lastLoss, epochsDone: epochsDone })); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE); if (!raw) return false; var d = JSON.parse(raw); if (!d || d.nClass !== KB.length) return false;
      model = { H: d.H, nClass: d.nClass, W1: Float64Array.from(d.W1), b1: Float64Array.from(d.b1), W2: Float64Array.from(d.W2), b2: Float64Array.from(d.b2) };
      lastLoss = d.lastLoss; epochsDone = d.epochsDone || 0; trained = true; return true;
    } catch (e) { return false; }
  }
  function status() {
    return { version: VERSION, type: "personal MLP", ready: !!model, trained: trained, classes: KB.length, epochsDone: epochsDone, lastLoss: lastLoss, weights: model ? model.W1.length + model.W2.length + model.b1.length + model.b2.length : 0, knowledge: KB.length };
  }
  function ensure() { if (model) return status(); if (load()) return status(); return train({ epochs: 100, lr: 0.18 }); }
  try { ensure(); } catch (e) {}
  G.AKSI_PERSONAL = { version: VERSION, KB: KB, train: train, predict: predict, ask: ask, think: ask, complete: function (q) { return ask(q); }, status: status, ensure: ensure, save: save, load: load };
})(typeof window !== "undefined" ? window : globalThis);
