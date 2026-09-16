/**
 * AKSI Net v1.0 — real neural network in the browser
 * Char-level Elman RNN: forward, BPTT, SGD, generate, localStorage weights
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0";
  var STORE = "aksi_net_v1";

  function randn() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function zeros(n) { return new Float64Array(n); }
  function randMat(rows, cols, scale) {
    scale = scale || 0.1;
    var m = new Float64Array(rows * cols);
    for (var i = 0; i < m.length; i++) m[i] = randn() * scale;
    return { r: rows, c: cols, d: m };
  }
  function zeroMat(rows, cols) { return { r: rows, c: cols, d: new Float64Array(rows * cols) }; }
  function get(m, i, j) { return m.d[i * m.c + j]; }
  function add(m, i, j, v) { m.d[i * m.c + j] += v; }
  function tanh(x) {
    if (x > 20) return 1; if (x < -20) return -1;
    var e = Math.exp(2 * x); return (e - 1) / (e + 1);
  }
  function dtanh(y) { return 1 - y * y; }
  function softmax(arr) {
    var max = -Infinity, i, sum = 0, out = new Float64Array(arr.length);
    for (i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
    for (i = 0; i < arr.length; i++) { out[i] = Math.exp(arr[i] - max); sum += out[i]; }
    for (i = 0; i < arr.length; i++) out[i] /= sum || 1;
    return out;
  }

  function buildVocab(text) {
    var set = {}, i, chars, stoi = {}, itos = {};
    for (i = 0; i < text.length; i++) set[text[i]] = 1;
    chars = Object.keys(set).sort();
    if (chars.length < 2)
      chars = " абвгдеёжзийклмнопрстуфхцчшщъыьэюяabcdefghijklmnopqrstuvwxyz0123456789.,!?\n".split("");
    for (i = 0; i < chars.length; i++) { stoi[chars[i]] = i; itos[i] = chars[i]; }
    return { chars: chars, stoi: stoi, itos: itos, size: chars.length };
  }

  function createModel(vocabSize, hidden) {
    hidden = hidden || 64;
    var s = 0.08;
    return {
      vocabSize: vocabSize, hidden: hidden,
      Wxh: randMat(hidden, vocabSize, s), Whh: randMat(hidden, hidden, s),
      Why: randMat(vocabSize, hidden, s), bh: zeros(hidden), by: zeros(vocabSize)
    };
  }
  function oneHot(V, ix) {
    var x = zeros(V); if (ix >= 0 && ix < V) x[ix] = 1; return x;
  }
  function forwardStep(model, x, hPrev) {
    var H = model.hidden, V = model.vocabSize, h = zeros(H), y = zeros(V), i, j, s;
    for (i = 0; i < H; i++) {
      s = model.bh[i];
      for (j = 0; j < V; j++) s += get(model.Wxh, i, j) * x[j];
      for (j = 0; j < H; j++) s += get(model.Whh, i, j) * hPrev[j];
      h[i] = tanh(s);
    }
    for (i = 0; i < V; i++) {
      s = model.by[i];
      for (j = 0; j < H; j++) s += get(model.Why, i, j) * h[j];
      y[i] = s;
    }
    return { h: h, y: y, p: softmax(y) };
  }

  function trainSequence(model, inputs, targets, lr, h0) {
    var H = model.hidden, V = model.vocabSize, n = inputs.length;
    var xs = [], hs = [], ps = [], hPrev = h0 || zeros(H), t, i, j, loss = 0;
    hs.push(hPrev);
    for (t = 0; t < n; t++) {
      var x = oneHot(V, inputs[t]); xs.push(x);
      var step = forwardStep(model, x, hPrev);
      hs.push(step.h); ps.push(step.p); hPrev = step.h;
      loss += -Math.log(step.p[targets[t]] || 1e-12);
    }
    var dWxh = zeroMat(H, V), dWhh = zeroMat(H, H), dWhy = zeroMat(V, H);
    var dbh = zeros(H), dby = zeros(V), dhNext = zeros(H);
    for (t = n - 1; t >= 0; t--) {
      var dy = new Float64Array(ps[t]); dy[targets[t]] -= 1;
      for (i = 0; i < V; i++) {
        dby[i] += dy[i];
        for (j = 0; j < H; j++) add(dWhy, i, j, dy[i] * hs[t + 1][j]);
      }
      var dh = zeros(H);
      for (j = 0; j < H; j++) {
        var s = dhNext[j];
        for (i = 0; i < V; i++) s += get(model.Why, i, j) * dy[i];
        dh[j] = s;
      }
      var dhRaw = zeros(H);
      for (j = 0; j < H; j++) dhRaw[j] = dtanh(hs[t + 1][j]) * dh[j];
      for (j = 0; j < H; j++) {
        dbh[j] += dhRaw[j];
        for (i = 0; i < V; i++) add(dWxh, j, i, dhRaw[j] * xs[t][i]);
        for (i = 0; i < H; i++) add(dWhh, j, i, dhRaw[j] * hs[t][i]);
      }
      dhNext = zeros(H);
      for (i = 0; i < H; i++) {
        var s2 = 0;
        for (j = 0; j < H; j++) s2 += get(model.Whh, j, i) * dhRaw[j];
        dhNext[i] = s2;
      }
    }
    function clip(m) { for (var k = 0; k < m.d.length; k++) { if (m.d[k] > 5) m.d[k] = 5; if (m.d[k] < -5) m.d[k] = -5; } }
    clip(dWxh); clip(dWhh); clip(dWhy);
    function am(w, dw) { for (var k = 0; k < w.d.length; k++) w.d[k] -= lr * dw.d[k]; }
    function av(w, dw) { for (var k = 0; k < w.length; k++) w[k] -= lr * dw[k]; }
    am(model.Wxh, dWxh); am(model.Whh, dWhh); am(model.Why, dWhy); av(model.bh, dbh); av(model.by, dby);
    return { loss: loss / n, h: hPrev };
  }

  function sample(model, seedIx, n, temperature, h0) {
    temperature = temperature || 0.8;
    var H = model.hidden, V = model.vocabSize, h = h0 || zeros(H), ix = seedIx, out = [ix], t, i;
    for (t = 0; t < n; t++) {
      var step = forwardStep(model, oneHot(V, ix), h);
      h = step.h;
      var logits = step.y, max = -Infinity, sum = 0, p = new Float64Array(V);
      for (i = 0; i < V; i++) { logits[i] /= temperature; if (logits[i] > max) max = logits[i]; }
      for (i = 0; i < V; i++) { p[i] = Math.exp(logits[i] - max); sum += p[i]; }
      var r = Math.random() * sum, acc = 0; ix = V - 1;
      for (i = 0; i < V; i++) { acc += p[i]; if (r <= acc) { ix = i; break; } }
      out.push(ix);
    }
    return out;
  }

  var vocab = null, model = null, trainedChars = 0, lastLoss = null, epochsDone = 0;

  function serialize() {
    if (!model || !vocab) return null;
    function matToArr(m) { return { r: m.r, c: m.c, d: Array.from(m.d) }; }
    return {
      version: VERSION, vocab: { chars: vocab.chars },
      model: {
        vocabSize: model.vocabSize, hidden: model.hidden,
        Wxh: matToArr(model.Wxh), Whh: matToArr(model.Whh), Why: matToArr(model.Why),
        bh: Array.from(model.bh), by: Array.from(model.by)
      },
      trainedChars: trainedChars, lastLoss: lastLoss, epochsDone: epochsDone
    };
  }
  function deserialize(data) {
    if (!data || !data.model || !data.vocab) return false;
    vocab = { chars: data.vocab.chars.slice(), stoi: {}, itos: {}, size: data.vocab.chars.length };
    for (var i = 0; i < vocab.chars.length; i++) { vocab.stoi[vocab.chars[i]] = i; vocab.itos[i] = vocab.chars[i]; }
    function arrToMat(o) { return { r: o.r, c: o.c, d: Float64Array.from(o.d) }; }
    var m = data.model;
    model = {
      vocabSize: m.vocabSize, hidden: m.hidden,
      Wxh: arrToMat(m.Wxh), Whh: arrToMat(m.Whh), Why: arrToMat(m.Why),
      bh: Float64Array.from(m.bh), by: Float64Array.from(m.by)
    };
    trainedChars = data.trainedChars || 0; lastLoss = data.lastLoss; epochsDone = data.epochsDone || 0;
    return true;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(serialize())); return true; } catch (e) { return false; } }
  function load() { try { var raw = localStorage.getItem(STORE); return raw ? deserialize(JSON.parse(raw)) : false; } catch (e) { return false; } }

  function collectCorpus() {
    var parts = [];
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_bot_mem_v1") || "[]");
      if (Array.isArray(mem)) for (var i = 0; i < mem.length; i++) if (mem[i] && mem[i].text) parts.push(String(mem[i].text));
    } catch (e) {}
    try {
      var clm = JSON.parse(localStorage.getItem("aksi_clm_v1") || "{}");
      if (clm.items) for (var i = 0; i < clm.items.length; i++) if (clm.items[i].fact) parts.push(String(clm.items[i].fact));
    } catch (e) {}
    parts.push(
      "АКСИ это локальный помощник в браузере.",
      "Нейронная сеть учится на тексте и генерирует продолжение.",
      "Память хранится на устройстве пользователя.",
      "Искусственный интеллект помогает отвечать на вопросы."
    );
    return parts.join("\n");
  }

  function init(opts) {
    opts = opts || {};
    var text = opts.text || collectCorpus();
    vocab = buildVocab(text);
    model = createModel(vocab.size, opts.hidden || 64);
    trainedChars = 0; lastLoss = null; epochsDone = 0;
    return status();
  }

  function train(opts) {
    opts = opts || {};
    var text = opts.text || collectCorpus();
    if (!text || text.length < 10) text = collectCorpus();
    if (!model || !vocab) init({ text: text, hidden: opts.hidden || 64 });
    var needRebuild = false, i;
    for (i = 0; i < text.length; i++) if (vocab.stoi[text[i]] == null) { needRebuild = true; break; }
    if (needRebuild) init({ text: text + vocab.chars.join(""), hidden: model.hidden });
    var seqLen = opts.seqLen || 24, lr = opts.lr || 0.08, epochs = opts.epochs || 8;
    var h = zeros(model.hidden), totalLoss = 0, steps = 0, ep, pos, t;
    for (ep = 0; ep < epochs; ep++) {
      for (pos = 0; pos + seqLen + 1 < text.length; pos += seqLen) {
        var inputs = [], targets = [];
        for (t = 0; t < seqLen; t++) {
          inputs.push(vocab.stoi[text[pos + t]] != null ? vocab.stoi[text[pos + t]] : 0);
          targets.push(vocab.stoi[text[pos + t + 1]] != null ? vocab.stoi[text[pos + t + 1]] : 0);
        }
        var r = trainSequence(model, inputs, targets, lr, h);
        h = r.h; totalLoss += r.loss; steps++; trainedChars += seqLen;
      }
      epochsDone++;
    }
    lastLoss = steps ? totalLoss / steps : null;
    save();
    return { ok: true, epochs: epochs, steps: steps, loss: lastLoss, vocab: vocab.size, hidden: model.hidden, trainedChars: trainedChars };
  }

  function generate(prompt, opts) {
    opts = opts || {};
    if (!model || !vocab) { if (!load()) init({}); }
    if (!model) return { text: "", error: "no model" };
    var n = opts.n || 120, temperature = opts.temperature || 0.85;
    var p = String(prompt || ""), h = zeros(model.hidden), ix = 0, i;
    for (i = 0; i < p.length; i++) {
      var cix = vocab.stoi[p[i]]; if (cix == null) continue;
      var step = forwardStep(model, oneHot(model.vocabSize, cix), h);
      h = step.h; ix = cix;
    }
    if (!p.length) ix = vocab.stoi["А"] != null ? vocab.stoi["А"] : 0;
    var ids = sample(model, ix, n, temperature, h), out = p;
    for (i = 1; i < ids.length; i++) out += vocab.itos[ids[i]] || "";
    return { text: out, source: "aksi-net", generated: true, offline: true, loss: lastLoss, vocab: vocab.size, hidden: model.hidden };
  }

  function status() {
    return {
      version: VERSION, ready: !!(model && vocab),
      vocab: vocab ? vocab.size : 0, hidden: model ? model.hidden : 0,
      trainedChars: trainedChars, epochsDone: epochsDone, lastLoss: lastLoss,
      type: "char-RNN (Elman)",
      weights: model ? model.Wxh.d.length + model.Whh.d.length + model.Why.d.length + model.bh.length + model.by.length : 0
    };
  }

  try { load(); } catch (e) {}

  G.AKSI_NET = {
    version: VERSION, init: init, train: train, generate: generate,
    complete: function (q, opts) { return generate(String(q || "") + " ", opts || {}); },
    status: status, save: save, load: load, collectCorpus: collectCorpus
  };
})(typeof window !== "undefined" ? window : globalThis);
