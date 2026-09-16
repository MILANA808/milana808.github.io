/**
 * AKSI Net v2.0 — embedding + MLP next-char neural network
 * Trainable embeddings, ReLU hidden, softmax, full backprop, SGD
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "2.0.0";
  var STORE = "aksi_net_v2";
  function randn() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function zeros(n) { return new Float64Array(n); }
  function randMat(r, c, scale) {
    var m = new Float64Array(r * c);
    for (var i = 0; i < m.length; i++) m[i] = randn() * scale;
    return m;
  }
  function buildVocab(text) {
    var set = {}, i;
    for (i = 0; i < text.length; i++) set[text[i]] = 1;
    var chars = Object.keys(set).sort();
    if (chars.length < 4) {
      chars = " абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯabcdefghijklmnopqrstuvwxyz0123456789.,—-\n".split("");
    }
    var stoi = {}, itos = {};
    for (i = 0; i < chars.length; i++) { stoi[chars[i]] = i; itos[i] = chars[i]; }
    return { chars: chars, stoi: stoi, itos: itos, size: chars.length };
  }
  function createModel(V, opts) {
    opts = opts || {};
    var E = opts.E || 24, H = opts.H || 64, CTX = opts.CTX || 8;
    return {
      V: V, E: E, H: H, CTX: CTX,
      embed: randMat(V, E, 0.08),
      W1: randMat(H, CTX * E, Math.sqrt(2 / (CTX * E))),
      b1: zeros(H),
      W2: randMat(V, H, Math.sqrt(2 / H)),
      b2: zeros(V)
    };
  }
  function embedCtx(model, ids) {
    var CTX = model.CTX, E = model.E, x = zeros(CTX * E);
    for (var t = 0; t < CTX; t++) {
      var id = ids[t] || 0, off = t * E;
      for (var j = 0; j < E; j++) x[off + j] = model.embed[id * E + j];
    }
    return x;
  }
  function forward(model, ids) {
    var x = embedCtx(model, ids), H = model.H, V = model.V, CE = model.CTX * model.E;
    var h = zeros(H), i, j, s;
    for (i = 0; i < H; i++) {
      s = model.b1[i];
      for (j = 0; j < CE; j++) s += model.W1[i * CE + j] * x[j];
      h[i] = s > 0 ? s : 0;
    }
    var y = zeros(V);
    for (i = 0; i < V; i++) {
      s = model.b2[i];
      for (j = 0; j < H; j++) s += model.W2[i * H + j] * h[j];
      y[i] = s;
    }
    var max = -Infinity;
    for (i = 0; i < V; i++) if (y[i] > max) max = y[i];
    var p = zeros(V), sum = 0;
    for (i = 0; i < V; i++) { p[i] = Math.exp(y[i] - max); sum += p[i]; }
    for (i = 0; i < V; i++) p[i] /= sum || 1;
    return { x: x, h: h, y: y, p: p };
  }
  function trainStep(model, ids, target, lr) {
    var out = forward(model, ids);
    var H = model.H, V = model.V, E = model.E, CTX = model.CTX, CE = CTX * E;
    var loss = -Math.log(Math.max(out.p[target], 1e-12));
    var dy = new Float64Array(out.p); dy[target] -= 1;
    var dW2 = zeros(V * H), db2 = zeros(V), dh = zeros(H), i, j;
    for (i = 0; i < V; i++) {
      db2[i] = dy[i];
      for (j = 0; j < H; j++) {
        dW2[i * H + j] = dy[i] * out.h[j];
        dh[j] += dy[i] * model.W2[i * H + j];
      }
    }
    for (j = 0; j < H; j++) if (out.h[j] <= 0) dh[j] = 0;
    var dW1 = zeros(H * CE), db1 = zeros(H), dx = zeros(CE);
    for (i = 0; i < H; i++) {
      db1[i] = dh[i];
      for (j = 0; j < CE; j++) {
        dW1[i * CE + j] = dh[i] * out.x[j];
        dx[j] += dh[i] * model.W1[i * CE + j];
      }
    }
    for (var t = 0; t < CTX; t++) {
      var id = ids[t] || 0, off = t * E;
      for (j = 0; j < E; j++) model.embed[id * E + j] -= lr * dx[off + j];
    }
    for (i = 0; i < model.W1.length; i++) model.W1[i] -= lr * dW1[i];
    for (i = 0; i < H; i++) model.b1[i] -= lr * db1[i];
    for (i = 0; i < model.W2.length; i++) model.W2[i] -= lr * dW2[i];
    for (i = 0; i < V; i++) model.b2[i] -= lr * db2[i];
    return loss;
  }
  function sampleNext(model, ids, temp) {
    temp = temp || 0.7;
    var out = forward(model, ids), V = model.V, max = -Infinity, i, sum = 0;
    var logits = new Float64Array(V);
    for (i = 0; i < V; i++) { logits[i] = out.y[i] / temp; if (logits[i] > max) max = logits[i]; }
    var p = new Float64Array(V);
    for (i = 0; i < V; i++) { p[i] = Math.exp(logits[i] - max); sum += p[i]; }
    var r = Math.random() * sum, acc = 0, ix = V - 1;
    for (i = 0; i < V; i++) { acc += p[i]; if (r <= acc) { ix = i; break; } }
    return ix;
  }
  var vocab = null, model = null, trainedChars = 0, lastLoss = null, epochsDone = 0;
  function serialize() {
    if (!model || !vocab) return null;
    return {
      version: VERSION, vocab: { chars: vocab.chars },
      model: {
        V: model.V, E: model.E, H: model.H, CTX: model.CTX,
        embed: Array.from(model.embed), W1: Array.from(model.W1), b1: Array.from(model.b1),
        W2: Array.from(model.W2), b2: Array.from(model.b2)
      },
      trainedChars: trainedChars, lastLoss: lastLoss, epochsDone: epochsDone
    };
  }
  function deserialize(data) {
    if (!data || !data.model || !data.vocab) return false;
    vocab = { chars: data.vocab.chars.slice(), stoi: {}, itos: {}, size: data.vocab.chars.length };
    for (var i = 0; i < vocab.chars.length; i++) {
      vocab.stoi[vocab.chars[i]] = i; vocab.itos[i] = vocab.chars[i];
    }
    var m = data.model;
    model = {
      V: m.V, E: m.E, H: m.H, CTX: m.CTX,
      embed: Float64Array.from(m.embed), W1: Float64Array.from(m.W1), b1: Float64Array.from(m.b1),
      W2: Float64Array.from(m.W2), b2: Float64Array.from(m.b2)
    };
    trainedChars = data.trainedChars || 0; lastLoss = data.lastLoss; epochsDone = data.epochsDone || 0;
    return true;
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(serialize())); return true; } catch (e) { return false; }
  }
  function load() {
    try { var raw = localStorage.getItem(STORE); return raw ? deserialize(JSON.parse(raw)) : false; }
    catch (e) { return false; }
  }
  function seedCorpus() {
    return [
      "АКСИ это локальный помощник в браузере.",
      "Нейронная сеть учится на тексте и генерирует продолжение.",
      "Память хранится на устройстве пользователя.",
      "Искусственный интеллект помогает отвечать на вопросы.",
      "Обучение сети идёт градиентным спуском.",
      "Скрытый слой хранит контекст последовательности.",
      "Генерация текста выбирает следующий символ.",
      "АКСИ объединяет память поиск и генерацию.",
      "Веса нейросети обновляются при обучении.",
      "Пользователь может обучить свою модель."
    ].join("\n");
  }
  function collectCorpus() {
    var parts = [seedCorpus()];
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_bot_mem_v1") || "[]");
      if (Array.isArray(mem)) for (var i = 0; i < mem.length; i++) if (mem[i] && mem[i].text) parts.push(String(mem[i].text));
    } catch (e) {}
    return parts.join("\n");
  }
  function init(opts) {
    opts = opts || {};
    var text = opts.text || collectCorpus();
    vocab = buildVocab(text);
    model = createModel(vocab.size, { E: opts.E || 24, H: opts.H || 64, CTX: opts.CTX || 8 });
    trainedChars = 0; lastLoss = null; epochsDone = 0;
    return status();
  }
  function train(opts) {
    opts = opts || {};
    var text = opts.text || collectCorpus();
    if (text.length < 30) text = seedCorpus().repeat(5);
    if (!model || !vocab) init({ text: text, H: opts.H || 64 });
    for (var i = 0; i < text.length; i++) {
      if (vocab.stoi[text[i]] == null) {
        init({ text: text + vocab.chars.join(""), H: model.H, E: model.E, CTX: model.CTX });
        break;
      }
    }
    var CTX = model.CTX, lr = opts.lr != null ? opts.lr : 0.05, epochs = opts.epochs || 15;
    var total = 0, steps = 0;
    for (var ep = 0; ep < epochs; ep++) {
      for (var pos = CTX; pos < text.length; pos++) {
        var ids = [];
        for (var t = 0; t < CTX; t++) ids.push(vocab.stoi[text[pos - CTX + t]] || 0);
        var target = vocab.stoi[text[pos]];
        if (target == null) continue;
        total += trainStep(model, ids, target, lr);
        steps++; trainedChars++;
      }
      epochsDone++;
    }
    lastLoss = steps ? total / steps : null;
    save();
    return { ok: true, epochs: epochs, steps: steps, loss: lastLoss, vocab: vocab.size, hidden: model.H, trainedChars: trainedChars };
  }
  function generate(prompt, opts) {
    opts = opts || {};
    if (!model || !vocab) {
      if (!load()) { init({}); train({ epochs: 20, lr: 0.06 }); }
    }
    var p = String(prompt || "АКСИ "), CTX = model.CTX, ids = [], i;
    for (i = 0; i < p.length; i++) {
      var c = vocab.stoi[p[i]]; if (c != null) ids.push(c);
    }
    while (ids.length < CTX) ids.unshift(0);
    if (ids.length > CTX) ids = ids.slice(-CTX);
    var n = opts.n || 120, temp = opts.temperature || 0.6, out = p;
    for (i = 0; i < n; i++) {
      var nx = sampleNext(model, ids, temp);
      out += vocab.itos[nx] || "";
      ids.push(nx); if (ids.length > CTX) ids.shift();
    }
    return { text: out, source: "aksi-net", generated: true, offline: true, loss: lastLoss, vocab: vocab.size, hidden: model.H };
  }
  function status() {
    return {
      version: VERSION, ready: !!(model && vocab),
      vocab: vocab ? vocab.size : 0, hidden: model ? model.H : 0,
      embed: model ? model.E : 0, ctx: model ? model.CTX : 0,
      trainedChars: trainedChars, epochsDone: epochsDone, lastLoss: lastLoss,
      type: "embed+MLP next-char",
      weights: model ? model.embed.length + model.W1.length + model.W2.length + model.b1.length + model.b2.length : 0
    };
  }
  function autoPretrain() {
    if (load() && epochsDone > 5) return status();
    init({});
    return train({ epochs: 25, lr: 0.06, text: seedCorpus().repeat(8) });
  }
  function loadPretrained(url) {
    url = url || "/aksi-net-weights.json";
    return fetch(url, { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && deserialize(data)) { save(); return status(); }
        return autoPretrain();
      })
      .catch(function () { return autoPretrain(); });
  }
  try { load(); } catch (e) {}
  G.AKSI_NET = {
    version: VERSION, init: init, train: train, generate: generate,
    complete: function (q, opts) { return generate(String(q || "") + " ", opts || {}); },
    status: status, save: save, load: load,
    autoPretrain: autoPretrain, loadPretrained: loadPretrained,
    collectCorpus: collectCorpus, serialize: serialize, deserialize: deserialize
  };
})(typeof window !== "undefined" ? window : globalThis);
