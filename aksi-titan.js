/**
 * AKSI Titan v1.1 — Stable generative neural LM
 * emb → MLP(ReLU)×2 → softmax next-char · backprop + grad clip
 * Honest: local generative NN — NOT frontier-LLM class
 * © AKSI · aksilove@internet.ru · 2026-09-17
 */
(function (G) {
  "use strict";
  var VERSION = "1.1.0-titan";
  var STORE = "aksi_titan_v11";
  var EMB = 32, HID = 64, SEQ = 24, CLIP = 5;
  var CHARS = " \nабвгдеёжзийклмнопрстуфхцчшщъыьэюяabcdefghijklmnopqrstuvwxyz0123456789.,!?:;()-—\"'«»";
  var stoi = {}, itos = [];
  for (var ci = 0; ci < CHARS.length; ci++) {
    if (stoi[CHARS[ci]] == null) { stoi[CHARS[ci]] = itos.length; itos.push(CHARS[ci]); }
  }
  var V = itos.length;
  var CORPUS = [
    "что такое акси: акси это локальный помощник в браузере. ",
    "акси работает offline first без обязательного сервера. ",
    "arin это resonance сеть с комплексными весами. ",
    "что такое titan: titan генерирует текст посимвольно после обучения. ",
    "titan это генеративная нейронная сеть акси. ",
    "память акси хранится локально на устройстве. ",
    "контакт автора aksilove@internet.ru. ",
    "как связаться: пишите на aksilove@internet.ru. ",
    "привет я titan нейросеть внутри акси. ",
    "integrity gate отклоняет слабый ответ. ",
    "episteme сохраняет знания как факты с печатью. ",
    "обучение меняет веса через обратное распространение. ",
    "нейронная сеть предсказывает следующий символ. ",
    "большое облако сильнее в общих знаниях. ",
    "локальная сеть сильнее в контроле и приватности. ",
    "спасибо за вопрос. "
  ].join("");
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function zeros(n) { return new Float64Array(n); }
  function randnArr(n, s) { var a = zeros(n); for (var i = 0; i < n; i++) a[i] = randn() * s; return a; }
  function clip(x) { if (x > CLIP) return CLIP; if (x < -CLIP) return -CLIP; return x; }
  function createModel() {
    return { emb: randnArr(V * EMB, 0.05), W1: randnArr(HID * EMB, Math.sqrt(2 / EMB) * 0.3), b1: zeros(HID), W2: randnArr(HID * HID, Math.sqrt(2 / HID) * 0.3), b2: zeros(HID), W3: randnArr(V * HID, Math.sqrt(1 / HID) * 0.3), b3: zeros(V) };
  }
  function ctxVec(model, ids) {
    var x = zeros(EMB), n = ids.length, i, j;
    if (!n) return x;
    for (i = 0; i < n; i++) { var base = ids[i] * EMB; for (j = 0; j < EMB; j++) x[j] += model.emb[base + j]; }
    for (j = 0; j < EMB; j++) x[j] /= n; return x;
  }
  function forward(model, ids) {
    var x = ctxVec(model, ids), h1 = zeros(HID), a1 = zeros(HID), i, j, s;
    for (i = 0; i < HID; i++) { s = model.b1[i]; for (j = 0; j < EMB; j++) s += model.W1[i * EMB + j] * x[j]; a1[i] = s; h1[i] = s > 0 ? s : 0; }
    var h2 = zeros(HID), a2 = zeros(HID);
    for (i = 0; i < HID; i++) { s = model.b2[i]; for (j = 0; j < HID; j++) s += model.W2[i * HID + j] * h1[j]; a2[i] = s; h2[i] = s > 0 ? s : 0; }
    var logits = zeros(V);
    for (i = 0; i < V; i++) { s = model.b3[i]; for (j = 0; j < HID; j++) s += model.W3[i * HID + j] * h2[j]; logits[i] = s; }
    var max = -Infinity; for (i = 0; i < V; i++) if (logits[i] > max) max = logits[i];
    var p = zeros(V), sum = 0;
    for (i = 0; i < V; i++) { p[i] = Math.exp(Math.min(logits[i] - max, 80)); sum += p[i]; }
    for (i = 0; i < V; i++) p[i] /= sum || 1;
    return { x: x, a1: a1, h1: h1, a2: a2, h2: h2, logits: logits, p: p };
  }
  function trainStep(model, ids, target, lr) {
    var o = forward(model, ids);
    var loss = -Math.log(Math.max(o.p[target], 1e-12)); if (!isFinite(loss)) return 5;
    var dlog = Float64Array.from(o.p); dlog[target] -= 1;
    var dh2 = zeros(HID), i, j, g;
    for (i = 0; i < V; i++) { g = clip(dlog[i]); model.b3[i] -= lr * g; for (j = 0; j < HID; j++) model.W3[i * HID + j] -= lr * clip(g * o.h2[j]); }
    dh2 = zeros(HID); for (i = 0; i < V; i++) { g = clip(dlog[i]); for (j = 0; j < HID; j++) dh2[j] += model.W3[i * HID + j] * g; }
    for (j = 0; j < HID; j++) if (o.a2[j] <= 0) dh2[j] = 0; else dh2[j] = clip(dh2[j]);
    var dh1 = zeros(HID);
    for (i = 0; i < HID; i++) { g = dh2[i]; model.b2[i] -= lr * g; for (j = 0; j < HID; j++) model.W2[i * HID + j] -= lr * clip(g * o.h1[j]); }
    dh1 = zeros(HID); for (i = 0; i < HID; i++) { g = dh2[i]; for (j = 0; j < HID; j++) dh1[j] += model.W2[i * HID + j] * g; }
    for (j = 0; j < HID; j++) if (o.a1[j] <= 0) dh1[j] = 0; else dh1[j] = clip(dh1[j]);
    var dx = zeros(EMB);
    for (i = 0; i < HID; i++) { g = dh1[i]; model.b1[i] -= lr * g; for (j = 0; j < EMB; j++) model.W1[i * EMB + j] -= lr * clip(g * o.x[j]); }
    dx = zeros(EMB); for (i = 0; i < HID; i++) { g = dh1[i]; for (j = 0; j < EMB; j++) dx[j] += model.W1[i * EMB + j] * g; }
    var scale = 1 / Math.max(ids.length, 1);
    for (var t = 0; t < ids.length; t++) { var base = ids[t] * EMB; for (j = 0; j < EMB; j++) model.emb[base + j] -= lr * clip(dx[j] * scale); }
    return loss;
  }
  function toIds(s) {
    var ids = [], i, id; s = String(s || "").toLowerCase();
    for (i = 0; i < s.length; i++) { id = stoi[s[i]]; if (id == null) id = stoi[" "] || 0; ids.push(id); }
    return ids;
  }
  var model = null, lastLoss = null, epochsDone = 0, trained = false;
  function train(opts) {
    opts = opts || {}; var epochs = opts.epochs || 40, lr = opts.lr != null ? opts.lr : 0.15;
    model = createModel(); var ids = toIds(CORPUS); var total = 0, steps = 0, ep, i;
    for (ep = 0; ep < epochs; ep++) {
      for (i = SEQ; i < ids.length; i++) { var loss = trainStep(model, ids.slice(i - SEQ, i), ids[i], lr); if (isFinite(loss)) { total += loss; steps++; } }
      epochsDone = ep + 1; if (ep === 15 || ep === 28) lr *= 0.5;
    }
    lastLoss = steps ? total / steps : null; trained = true; save();
    return { ok: true, version: VERSION, epochs: epochs, loss: lastLoss, steps: steps, vocab: V, params: paramCount() };
  }
  function sample(p, temp) {
    temp = temp || 0.8; var i, max = -Infinity, logits = zeros(V), sum = 0, pp = zeros(V);
    for (i = 0; i < V; i++) { logits[i] = Math.log(Math.max(p[i], 1e-12)) / temp; if (logits[i] > max) max = logits[i]; }
    for (i = 0; i < V; i++) { pp[i] = Math.exp(logits[i] - max); sum += pp[i]; }
    for (i = 0; i < V; i++) pp[i] /= sum || 1;
    var r = Math.random(), c = 0; for (i = 0; i < V; i++) { c += pp[i]; if (r <= c) return i; } return 0;
  }
  function generate(prompt, opts) {
    opts = opts || {}; if (!model) ensure();
    var maxLen = opts.maxLen || 100, temp = opts.temperature != null ? opts.temperature : 0.75;
    var ids = toIds(prompt), out = "";
    for (var n = 0; n < maxLen; n++) {
      var ctx = ids.slice(Math.max(0, ids.length - SEQ));
      var f = forward(model, ctx); var next = sample(f.p, temp); var ch = itos[next] || "";
      out += ch; ids.push(next);
      if (ch === "." && out.length > 30) break; if (ch === "\n" && out.length > 20) break;
    }
    return out.trim();
  }
  function retrieveCorpus(q) {
    q = String(q || "").toLowerCase(); var parts = CORPUS.split(/\.\s+/);
    var best = "", bestS = 0, i, p, score, w, words;
    words = q.split(/\s+/).filter(function (x) { return x.length > 2; });
    for (i = 0; i < parts.length; i++) {
      p = parts[i].toLowerCase(); score = 0;
      for (w = 0; w < words.length; w++) if (p.indexOf(words[w]) >= 0) score += 2;
      if (/акси|aksi/.test(q) && /акси это|что такое акси/.test(p)) score += 8;
      if (/акси|aksi/.test(q) && p.indexOf("акси") >= 0) score += 2;
      if (/titan|титан/.test(q) && p.indexOf("titan") >= 0) score += 5;
      if (/контакт|связ/.test(q) && /контакт|aksilove/.test(p)) score += 5;
      if (/привет/.test(q) && p.indexOf("привет") === 0) score += 5;
      if (/arin|резонанс/.test(q) && p.indexOf("arin") === 0) score += 5;
      if (/памят/.test(q) && p.indexOf("памят") >= 0) score += 5;
      if (score > bestS) { bestS = score; best = parts[i].trim(); }
    }
    if (best && bestS > 0) {
      best = best.replace(/^что такое [^:]+:\s*/i, "");
      if (best.charAt(best.length - 1) !== ".") best += ".";
      return best;
    }
    return null;
  }
  function ask(q) {
    q = String(q || "").trim(); if (!q) return { text: "Задайте вопрос.", source: "titan" };
    ensure();
    var retrieved = retrieveCorpus(q);
    var gen = generate(q.toLowerCase() + " ", { maxLen: 90, temperature: 0.65 });
    var bad = !gen || gen.length < 8 || /(.)\1{5,}/.test(gen);
    var text, mode;
    if (retrieved && (bad || gen.length < retrieved.length * 0.5)) { text = retrieved; mode = "retrieve+net"; }
    else if (!bad) { text = gen; mode = "generate"; }
    else if (retrieved) { text = retrieved; mode = "retrieve"; }
    else { text = "titan пока слабо знает эту тему. спросите про акси, arin, titan или контакт."; mode = "fallback"; }
    return { text: text, source: "titan", architecture: "Titan-v1.1", mode: mode, generated: mode === "generate", offline: true, loss: lastLoss };
  }
  function paramCount() {
    if (!model) return 0;
    return model.emb.length + model.W1.length + model.b1.length + model.W2.length + model.b2.length + model.W3.length + model.b3.length;
  }
  function save() {
    if (!model) return false;
    try {
      localStorage.setItem(STORE, JSON.stringify({ version: VERSION, emb: Array.from(model.emb), W1: Array.from(model.W1), b1: Array.from(model.b1), W2: Array.from(model.W2), b2: Array.from(model.b2), W3: Array.from(model.W3), b3: Array.from(model.b3), lastLoss: lastLoss, epochsDone: epochsDone }));
      return true;
    } catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE); if (!raw) return false; var d = JSON.parse(raw); if (!d || d.version !== VERSION) return false;
      model = { emb: Float64Array.from(d.emb), W1: Float64Array.from(d.W1), b1: Float64Array.from(d.b1), W2: Float64Array.from(d.W2), b2: Float64Array.from(d.b2), W3: Float64Array.from(d.W3), b3: Float64Array.from(d.b3) };
      lastLoss = d.lastLoss; epochsDone = d.epochsDone || 0; trained = true; return true;
    } catch (e) { return false; }
  }
  function status() {
    return { version: VERSION, architecture: "Titan MLP LM", ready: !!model, trained: trained, loss: lastLoss, epochsDone: epochsDone, parameters: paramCount(), vocab: V, emb: EMB, hidden: HID, layers: 3, kind: "generative next-char neural network", honest: "local generative NN — does not outperform frontier LLMs" };
  }
  function ensure() { if (model) return status(); if (load()) return status(); return train({ epochs: 45, lr: 0.15 }); }
  function claim() {
    return { date: "2026-09-17", contact: "aksilove@internet.ru", claiming: "AKSI Titan — offline generative neural LM with backprop", notClaiming: "beats Grok / GPT / Claude" };
  }
  G.AKSI_TITAN = { version: VERSION, train: train, generate: generate, ask: ask, think: ask, complete: function (p, o) { return { text: generate(p, o), source: "titan" }; }, status: status, ensure: ensure, save: save, load: load, claim: claim };
})(typeof window !== "undefined" ? window : globalThis);
