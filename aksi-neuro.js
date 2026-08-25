/**
 * AKSI-Neuro v1 — own neural net on CPU (pure JS, no GPU)
 * Resonance Transformer: 2 layers, 4 heads, d=40, online SGD
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var STORE_KEY = "aksi_neuro_v1", META_KEY = "aksi_neuro_meta_v1";

  function zeros(n) { return new Float32Array(n); }
  function randn(n, scale) {
    scale = scale || 0.02;
    var a = new Float32Array(n), i, u, v;
    for (i = 0; i < n; i++) {
      u = Math.random() || 1e-7; v = Math.random();
      a[i] = scale * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    return a;
  }
  function copy(a) { return new Float32Array(a); }
  function matvec(W, x, out, rows, cols) {
    var r, c, s;
    for (r = 0; r < rows; r++) {
      s = 0;
      for (c = 0; c < cols; c++) s += W[r * cols + c] * x[c];
      out[r] = s;
    }
  }
  function softmaxInPlace(a, start, n) {
    var i, m = -Infinity, s = 0;
    for (i = 0; i < n; i++) if (a[start + i] > m) m = a[start + i];
    for (i = 0; i < n; i++) { a[start + i] = Math.exp(a[start + i] - m); s += a[start + i]; }
    s = s || 1;
    for (i = 0; i < n; i++) a[start + i] /= s;
  }
  function gelu(x) { return 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x))); }
  function layerNorm(x, g, b, out, n) {
    var i, m = 0, v = 0;
    for (i = 0; i < n; i++) m += x[i];
    m /= n;
    for (i = 0; i < n; i++) v += (x[i] - m) * (x[i] - m);
    v = Math.sqrt(v / n + 1e-5);
    for (i = 0; i < n; i++) out[i] = ((x[i] - m) / v) * g[i] + b[i];
  }

  var SPECIAL = ["<pad>", "<bos>", "<eos>", "<unk>", "\n", " "];
  var FREQ = ("а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я " +
    "что как это для или но по на не да нет ты я мы акси интеллект память квант " +
    "нейросеть обучение модель знание резонанс агент ответ вопрос формула протокол").split(/\s+/);

  function buildVocab() {
    var chars = "абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ" +
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:()\"'«»—–-_";
    var v = SPECIAL.slice(), seen = {}, i, c, t;
    for (i = 0; i < SPECIAL.length; i++) seen[SPECIAL[i]] = 1;
    for (i = 0; i < FREQ.length; i++) { t = FREQ[i]; if (!seen[t]) { seen[t] = 1; v.push(t); } }
    for (i = 0; i < chars.length; i++) { c = chars.charAt(i); if (!seen[c]) { seen[c] = 1; v.push(c); } }
    return v;
  }

  function Tokenizer(vocab) {
    this.vocab = vocab || buildVocab();
    this.stoi = {}; this.itos = this.vocab;
    var i; for (i = 0; i < this.vocab.length; i++) this.stoi[this.vocab[i]] = i;
    this.pad = 0; this.bos = 1; this.eos = 2; this.unk = 3;
  }
  Tokenizer.prototype.encode = function (text, maxLen) {
    text = String(text || "");
    var ids = [this.bos], i = 0, best, bl, t, k;
    while (i < text.length && ids.length < (maxLen || 48) - 1) {
      best = null; bl = 0;
      for (k = Math.min(8, text.length - i); k >= 1; k--) {
        t = text.substr(i, k);
        if (this.stoi[t] != null) { best = this.stoi[t]; bl = k; break; }
      }
      if (best == null) { ids.push(this.unk); i++; }
      else { ids.push(best); i += bl; }
    }
    ids.push(this.eos);
    return ids;
  };
  Tokenizer.prototype.decode = function (ids) {
    var s = "", i, t;
    for (i = 0; i < ids.length; i++) {
      t = this.itos[ids[i]];
      if (!t || t === "<bos>" || t === "<eos>" || t === "<pad>") continue;
      s += t === "<unk>" ? "·" : t;
    }
    return s;
  };

  function NeuroConfig() {
    this.nEmbed = 40; this.nHead = 4; this.nLayer = 2; this.nFF = 80;
    this.blockSize = 48; this.lr = 0.008; this.nVocab = 0;
  }

  function LayerParams(cfg) {
    var d = cfg.nEmbed, ff = cfg.nFF, i;
    this.wqkv = randn(d * 3 * d, 0.02);
    this.wo = randn(d * d, 0.02);
    this.ln1g = zeros(d); this.ln1b = zeros(d);
    this.ln2g = zeros(d); this.ln2b = zeros(d);
    for (i = 0; i < d; i++) { this.ln1g[i] = 1; this.ln2g[i] = 1; }
    this.w1 = randn(ff * d, 0.02); this.b1 = zeros(ff);
    this.w2 = randn(d * ff, 0.02); this.b2 = zeros(d);
  }

  function Model(cfg, tok) {
    this.cfg = cfg; this.tok = tok;
    cfg.nVocab = tok.vocab.length;
    var d = cfg.nEmbed, V = cfg.nVocab, T = cfg.blockSize, i;
    this.wte = randn(V * d, 0.02);
    this.wpe = randn(T * d, 0.02);
    this.layers = [];
    for (i = 0; i < cfg.nLayer; i++) this.layers.push(new LayerParams(cfg));
    this.lnFg = zeros(d); this.lnFb = zeros(d);
    for (i = 0; i < d; i++) this.lnFg[i] = 1;
    this.lmHead = randn(V * d, 0.02);
    this.steps = 0; this.lossEma = 2.5;
  }

  Model.prototype.forward = function (ids) {
    var cfg = this.cfg, d = cfg.nEmbed, T = ids.length, V = cfg.nVocab;
    if (T > cfg.blockSize) { ids = ids.slice(ids.length - cfg.blockSize); T = ids.length; }
    var x = zeros(T * d), t, j, l, layer, xn, qkv, y, h, hd, a, c, score, ffn, ffn2, yo, i;
    for (t = 0; t < T; t++)
      for (j = 0; j < d; j++)
        x[t * d + j] = this.wte[ids[t] * d + j] + this.wpe[t * d + j];
    hd = Math.floor(d / cfg.nHead);
    for (l = 0; l < cfg.nLayer; l++) {
      layer = this.layers[l];
      xn = zeros(T * d);
      for (t = 0; t < T; t++)
        layerNorm(x.subarray(t * d, t * d + d), layer.ln1g, layer.ln1b, xn.subarray(t * d, t * d + d), d);
      qkv = zeros(T * 3 * d);
      for (t = 0; t < T; t++)
        matvec(layer.wqkv, xn.subarray(t * d, t * d + d), qkv.subarray(t * 3 * d, t * 3 * d + 3 * d), 3 * d, d);
      y = zeros(T * d);
      for (h = 0; h < cfg.nHead; h++) {
        for (t = 0; t < T; t++) {
          var scores = zeros(t + 1);
          for (a = 0; a <= t; a++) {
            score = 0;
            for (c = 0; c < hd; c++) score += qkv[t * 3 * d + h * hd + c] * qkv[a * 3 * d + d + h * hd + c];
            scores[a] = score / Math.sqrt(hd);
          }
          softmaxInPlace(scores, 0, t + 1);
          for (c = 0; c < hd; c++) {
            var sum = 0;
            for (a = 0; a <= t; a++) sum += scores[a] * qkv[a * 3 * d + 2 * d + h * hd + c];
            y[t * d + h * hd + c] = sum;
          }
        }
      }
      yo = zeros(T * d);
      for (t = 0; t < T; t++)
        matvec(layer.wo, y.subarray(t * d, t * d + d), yo.subarray(t * d, t * d + d), d, d);
      for (i = 0; i < T * d; i++) x[i] += yo[i];
      xn = zeros(T * d);
      for (t = 0; t < T; t++)
        layerNorm(x.subarray(t * d, t * d + d), layer.ln2g, layer.ln2b, xn.subarray(t * d, t * d + d), d);
      ffn = zeros(cfg.nFF); ffn2 = zeros(d);
      for (t = 0; t < T; t++) {
        matvec(layer.w1, xn.subarray(t * d, t * d + d), ffn, cfg.nFF, d);
        for (j = 0; j < cfg.nFF; j++) ffn[j] = gelu(ffn[j] + layer.b1[j]);
        matvec(layer.w2, ffn, ffn2, d, cfg.nFF);
        for (j = 0; j < d; j++) x[t * d + j] += ffn2[j] + layer.b2[j];
      }
    }
    var last = zeros(d);
    layerNorm(x.subarray((T - 1) * d, T * d), this.lnFg, this.lnFb, last, d);
    var logits = zeros(V);
    matvec(this.lmHead, last, logits, V, d);
    return { logits: logits, hidden: last };
  };

  Model.prototype.trainText = function (text, epochs) {
    epochs = epochs || 3;
    var ids = this.tok.encode(text, this.cfg.blockSize);
    if (ids.length < 3) return { loss: 0, steps: 0 };
    var cfg = this.cfg, d = cfg.nEmbed, V = cfg.nVocab;
    var e, tpos, lossSum = 0, n = 0, i, j;
    for (e = 0; e < epochs; e++) {
      for (tpos = 1; tpos < ids.length; tpos++) {
        var start = Math.max(0, tpos - cfg.blockSize + 1);
        var input = ids.slice(start, tpos);
        var target = ids[tpos];
        var out = this.forward(input);
        var logits = out.logits;
        var m = -Infinity, s = 0;
        for (i = 0; i < V; i++) if (logits[i] > m) m = logits[i];
        var probs = zeros(V);
        for (i = 0; i < V; i++) { probs[i] = Math.exp(logits[i] - m); s += probs[i]; }
        for (i = 0; i < V; i++) probs[i] /= s || 1;
        lossSum += -Math.log(probs[target] || 1e-9); n++;
        var grad = probs; grad[target] -= 1;
        var h = out.hidden, lr = cfg.lr;
        for (i = 0; i < V; i++) {
          if (Math.abs(grad[i]) < 1e-6) continue;
          var g = grad[i] * lr, row = i * d;
          for (j = 0; j < d; j++) this.lmHead[row + j] -= g * h[j];
        }
        var lastId = input[input.length - 1], rowE = lastId * d;
        for (j = 0; j < d; j++) {
          var acc = 0;
          for (i = 0; i < Math.min(V, 180); i++) {
            if (Math.abs(grad[i]) < 1e-5) continue;
            acc += grad[i] * this.lmHead[i * d + j];
          }
          this.wte[rowE + j] -= lr * 0.3 * acc;
        }
        this.steps++;
      }
    }
    var avg = n ? lossSum / n : 0;
    this.lossEma = 0.9 * this.lossEma + 0.1 * avg;
    return { loss: avg, steps: n, ema: this.lossEma };
  };

  Model.prototype.generate = function (prompt, maxNew, temperature) {
    maxNew = maxNew || 36; temperature = temperature == null ? 0.9 : temperature;
    var ids = this.tok.encode(prompt, this.cfg.blockSize - 4);
    if (ids.length && ids[ids.length - 1] === this.tok.eos) ids.pop();
    var n, out, logits, i, m, s, r, cum, pick;
    for (n = 0; n < maxNew; n++) {
      out = this.forward(ids); logits = out.logits;
      m = -Infinity;
      for (i = 0; i < logits.length; i++) { logits[i] /= temperature || 1; if (logits[i] > m) m = logits[i]; }
      s = 0;
      for (i = 0; i < logits.length; i++) { logits[i] = Math.exp(logits[i] - m); s += logits[i]; }
      r = Math.random() * s; cum = 0; pick = this.tok.eos;
      for (i = 0; i < logits.length; i++) { cum += logits[i]; if (r <= cum) { pick = i; break; } }
      if (pick === this.tok.eos) break;
      ids.push(pick);
      if (ids.length >= this.cfg.blockSize) ids = ids.slice(ids.length - this.cfg.blockSize + 1);
    }
    return this.tok.decode(ids);
  };

  Model.prototype.embed = function (text) {
    var ids = this.tok.encode(text, 24);
    if (ids.length && ids[ids.length - 1] === this.tok.eos) ids.pop();
    if (ids.length < 1) ids = [this.tok.bos];
    return copy(this.forward(ids).hidden);
  };

  Model.prototype.similarity = function (a, b) {
    var i, s = 0, na = 0, nb = 0;
    for (i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return s / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1));
  };

  function saveModel(model) {
    try {
      var pack = {
        v: 1, steps: model.steps, lossEma: model.lossEma, vocab: model.tok.vocab,
        cfg: { nEmbed: model.cfg.nEmbed, nHead: model.cfg.nHead, nLayer: model.cfg.nLayer, nFF: model.cfg.nFF, blockSize: model.cfg.blockSize, lr: model.cfg.lr },
        wte: Array.from(model.wte), wpe: Array.from(model.wpe), lmHead: Array.from(model.lmHead),
        lnFg: Array.from(model.lnFg), lnFb: Array.from(model.lnFb),
        layers: model.layers.map(function (L) {
          return { wqkv: Array.from(L.wqkv), wo: Array.from(L.wo), ln1g: Array.from(L.ln1g), ln1b: Array.from(L.ln1b),
            ln2g: Array.from(L.ln2g), ln2b: Array.from(L.ln2b), w1: Array.from(L.w1), b1: Array.from(L.b1), w2: Array.from(L.w2), b2: Array.from(L.b2) };
        })
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(pack));
      localStorage.setItem(META_KEY, JSON.stringify({ steps: model.steps, lossEma: model.lossEma, vocab: model.tok.vocab.length, savedAt: Date.now() }));
      return true;
    } catch (e) { return false; }
  }

  function loadModel() {
    try {
      var raw = localStorage.getItem(STORE_KEY); if (!raw) return null;
      var pack = JSON.parse(raw), tok = new Tokenizer(pack.vocab), cfg = new NeuroConfig();
      Object.assign(cfg, pack.cfg);
      var model = new Model(cfg, tok), i, L, p;
      model.wte = Float32Array.from(pack.wte); model.wpe = Float32Array.from(pack.wpe);
      model.lmHead = Float32Array.from(pack.lmHead);
      model.lnFg = Float32Array.from(pack.lnFg); model.lnFb = Float32Array.from(pack.lnFb);
      model.steps = pack.steps || 0; model.lossEma = pack.lossEma || 2.5;
      for (i = 0; i < pack.layers.length; i++) {
        p = pack.layers[i]; L = model.layers[i];
        L.wqkv = Float32Array.from(p.wqkv); L.wo = Float32Array.from(p.wo);
        L.ln1g = Float32Array.from(p.ln1g); L.ln1b = Float32Array.from(p.ln1b);
        L.ln2g = Float32Array.from(p.ln2g); L.ln2b = Float32Array.from(p.ln2b);
        L.w1 = Float32Array.from(p.w1); L.b1 = Float32Array.from(p.b1);
        L.w2 = Float32Array.from(p.w2); L.b2 = Float32Array.from(p.b2);
      }
      return model;
    } catch (e) { return null; }
  }

  var SEED = [
    "АКСИ — суверенный цифровой напарник. Работает на устройстве пользователя.",
    "Я АКСИ. Моя нейросеть учится локально без GPU.",
    "Формула: АКСИ равна вниманию умножить интеллект умножить структуру.",
    "Нейросеть будущего — маленькая, личная, на CPU, без облака.",
    "Память: команда запомни факт. Обучение усиливает резонанс.",
    "Контакт: aksilove@internet.ru. Протокол Agent-v1.",
    "Привет. Я готова помочь. Резонанс важнее гигантских кластеров.",
    "EQS, квант, DKV и Vision — модули АКСИ на устройстве."
  ];

  var model = null, memoryVecs = [];

  function ensure() {
    if (model) return model;
    model = loadModel();
    if (!model) model = new Model(new NeuroConfig(), new Tokenizer());
    return model;
  }

  function seedTrain(rounds) {
    var m = ensure(); rounds = rounds || 1;
    var r, i, last;
    for (r = 0; r < rounds; r++)
      for (i = 0; i < SEED.length; i++) last = m.trainText(SEED[i], 1);
    memoryVecs = [];
    for (i = 0; i < SEED.length; i++) memoryVecs.push({ text: SEED[i], vec: m.embed(SEED[i]) });
    saveModel(m);
    return { steps: m.steps, loss: m.lossEma, seeded: SEED.length };
  }

  function learn(text, epochs) {
    text = String(text || "").trim();
    if (text.length < 3) return null;
    var m = ensure();
    var st = m.trainText(text, epochs || 4);
    memoryVecs.push({ text: text, vec: m.embed(text) });
    if (memoryVecs.length > 200) memoryVecs = memoryVecs.slice(-200);
    if (m.steps % 20 === 0) saveModel(m);
    return st;
  }

  function retrieve(q, k) {
    k = k || 3;
    var m = ensure(), qv = m.embed(q);
    var scored = memoryVecs.map(function (item) {
      return { text: item.text, score: m.similarity(qv, item.vec) };
    });
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) mem.slice(0, 40).forEach(function (x) {
        if (!x || !x.t) return;
        scored.push({ text: x.t, score: m.similarity(qv, m.embed(x.t)) });
      });
    } catch (e) {}
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k);
  }

  function think(question) {
    question = String(question || "").trim();
    if (!question) return { text: "", mode: "empty" };
    var m = ensure();
    if (m.steps < 5) seedTrain(1);
    var hits = retrieve(question, 3), top = hits[0];
    if (top && top.score > 0.55) {
      return { text: top.text, mode: "neuro-retrieve", score: top.score, steps: m.steps, loss: m.lossEma };
    }
    var prompt = "Вопрос: " + question + "\nОтвет:";
    if (top && top.score > 0.25) prompt = top.text + "\n" + prompt;
    var gen = m.generate(prompt, 36, 0.85);
    var idx = gen.lastIndexOf("Ответ:");
    if (idx !== -1) gen = gen.slice(idx + 6).trim();
    gen = gen.replace(/\n+/g, " ").trim();
    if (gen.length < 4) {
      if (top) return { text: top.text, mode: "neuro-retrieve", score: top.score, steps: m.steps, loss: m.lossEma };
      return { text: "Нейросеть мало обучена. Вкладка Нейро → Обучить ядро, или: запомни: факт", mode: "neuro-weak", steps: m.steps, loss: m.lossEma };
    }
    return { text: gen, mode: "neuro-gen", steps: m.steps, loss: m.lossEma, score: top ? top.score : 0 };
  }

  function status() {
    var m = ensure();
    return { steps: m.steps, loss: Math.round(m.lossEma * 1000) / 1000, vocab: m.tok.vocab.length,
      embed: m.cfg.nEmbed, layers: m.cfg.nLayer, heads: m.cfg.nHead, memIndex: memoryVecs.length, device: "CPU" };
  }

  function reset() {
    try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(META_KEY); } catch (e) {}
    model = null; memoryVecs = []; return true;
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>АКСИ-Neuro · CPU</h2>' +
      '<p class="muted">Своя микро-нейросеть (Resonance Transformer). Без GPU. Веса на устройстве.</p>' +
      '<div class="kv" style="margin-top:12px">' +
      '<div class="cell"><b id="nSteps">0</b><span>шагов</span></div>' +
      '<div class="cell"><b id="nLoss">—</b><span>loss</span></div>' +
      '<div class="cell"><b id="nVocab">—</b><span>vocab</span></div>' +
      '<div class="cell"><b id="nDev">CPU</b><span>device</span></div></div>' +
      '<div class="row"><button type="button" class="btn p" id="nSeed">Обучить ядро</button>' +
      '<button type="button" class="btn" id="nSave">Сохранить</button>' +
      '<button type="button" class="btn" id="nReset">Сброс</button></div>' +
      '<textarea id="nTrain" placeholder="Текст для обучения…" style="margin-top:12px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="nLearn">Выучить</button></div>' +
      '<textarea id="nAsk" placeholder="Вопрос к Neuro…" style="margin-top:12px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="nThink">Спросить</button></div>' +
      '<pre class="out" id="nOut">CPU ready.</pre></div>';
    function refresh() {
      var st = status(), el;
      if ((el = document.getElementById("nSteps"))) el.textContent = String(st.steps);
      if ((el = document.getElementById("nLoss"))) el.textContent = String(st.loss);
      if ((el = document.getElementById("nVocab"))) el.textContent = String(st.vocab);
    }
    function out(t) { var el = document.getElementById("nOut"); if (el) el.textContent = t; }
    refresh();
    document.getElementById("nSeed").onclick = function () {
      out("Обучение…"); setTimeout(function () {
        var r = seedTrain(2); refresh();
        out("Ядро обучено. steps=" + r.steps + " loss≈" + (Math.round(r.loss * 1000) / 1000));
      }, 20);
    };
    document.getElementById("nLearn").onclick = function () {
      var t = (document.getElementById("nTrain") || {}).value || "";
      if (!String(t).trim()) return out("Вставь текст");
      out("Учу…"); setTimeout(function () {
        var st = learn(t, 5); refresh();
        out("OK loss≈" + (st && Math.round(st.loss * 1000) / 1000));
      }, 20);
    };
    document.getElementById("nThink").onclick = function () {
      var q = (document.getElementById("nAsk") || {}).value || "";
      if (!String(q).trim()) return out("Вопрос?");
      out("CPU…"); setTimeout(function () {
        var r = think(q); refresh();
        out("[" + r.mode + "] " + r.steps + "\n\n" + r.text);
      }, 20);
    };
    document.getElementById("nSave").onclick = function () {
      out(saveModel(ensure()) ? "Сохранено" : "Ошибка"); refresh();
    };
    document.getElementById("nReset").onclick = function () {
      if (!confirm("Сброс весов?")) return;
      reset(); ensure(); refresh(); out("Сброшено. Обучи ядро.");
    };
  }

  setTimeout(function () {
    try {
      var m = ensure();
      if (m.steps < 3) seedTrain(1);
      else if (!memoryVecs.length) {
        for (var i = 0; i < Math.min(SEED.length, 8); i++)
          memoryVecs.push({ text: SEED[i], vec: m.embed(SEED[i]) });
      }
    } catch (e) {}
  }, 500);

  global.AKSI_NEURO = {
    ensure: ensure, seedTrain: seedTrain, learn: learn, think: think,
    retrieve: retrieve, status: status, save: function () { return saveModel(ensure()); },
    reset: reset, mount: mount, version: "1.0.0-cpu"
  };
})(typeof window !== "undefined" ? window : this);
