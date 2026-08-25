/**
 * AKSI-Neuro v2 — RWKV architecture (full CPU, pure JS, no GPU)
 * RWKV-7 lineage: recurrent, linear time, constant memory, no KV-cache
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var STORE_KEY = "aksi_rwkv_v2", META_KEY = "aksi_rwkv_meta_v2";
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
  function sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x)))); }
  function relu2(x) { return x > 0 ? x * x : 0; }
  function layerNorm(x, w, b, out, n) {
    var i, m = 0, v = 0;
    for (i = 0; i < n; i++) m += x[i]; m /= n;
    for (i = 0; i < n; i++) v += (x[i] - m) * (x[i] - m);
    v = Math.sqrt(v / n + 1e-5);
    for (i = 0; i < n; i++) out[i] = ((x[i] - m) / v) * w[i] + b[i];
  }
  function matvec(W, x, out, rows, cols) {
    var r, c, s;
    for (r = 0; r < rows; r++) {
      s = 0; for (c = 0; c < cols; c++) s += W[r * cols + c] * x[c];
      out[r] = s;
    }
  }
  var SPECIAL = ["<pad>", "<bos>", "<eos>", "<unk>", "\n", " "];
  var FREQ = ("а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я " +
    "что как это для или но по на не да нет ты я мы акси интеллект память квант " +
    "нейросеть обучение модель знание резонанс rwkv агент ответ вопрос формула протокол").split(/\s+/);
  function buildVocab() {
    var chars = "абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:()\"'«»—–-_";
    var v = SPECIAL.slice(), seen = {}, i, c, t;
    for (i = 0; i < SPECIAL.length; i++) seen[SPECIAL[i]] = 1;
    for (i = 0; i < FREQ.length; i++) { t = FREQ[i]; if (!seen[t]) { seen[t] = 1; v.push(t); } }
    for (i = 0; i < chars.length; i++) { c = chars.charAt(i); if (!seen[c]) { seen[c] = 1; v.push(c); } }
    return v;
  }
  function Tokenizer(vocab) {
    this.vocab = vocab || buildVocab(); this.stoi = {}; this.itos = this.vocab;
    var i; for (i = 0; i < this.vocab.length; i++) this.stoi[this.vocab[i]] = i;
    this.pad = 0; this.bos = 1; this.eos = 2; this.unk = 3;
  }
  Tokenizer.prototype.encode = function (text, maxLen) {
    text = String(text || "");
    var ids = [this.bos], i = 0, best, bl, t, k;
    while (i < text.length && ids.length < (maxLen || 96) - 1) {
      best = null; bl = 0;
      for (k = Math.min(10, text.length - i); k >= 1; k--) {
        t = text.substr(i, k);
        if (this.stoi[t] != null) { best = this.stoi[t]; bl = k; break; }
      }
      if (best == null) { ids.push(this.unk); i++; } else { ids.push(best); i += bl; }
    }
    ids.push(this.eos); return ids;
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
  function Config() { this.nEmbed = 64; this.nLayer = 4; this.nFF = 128; this.lr = 0.006; this.nVocab = 0; }
  function Block(cfg) {
    var d = cfg.nEmbed, ff = cfg.nFF, i;
    this.tm_mix_k = randn(d, 0.1); this.tm_mix_v = randn(d, 0.1); this.tm_mix_r = randn(d, 0.1);
    for (i = 0; i < d; i++) { this.tm_mix_k[i] = sigmoid(this.tm_mix_k[i]); this.tm_mix_v[i] = sigmoid(this.tm_mix_v[i]); this.tm_mix_r[i] = sigmoid(this.tm_mix_r[i]); }
    this.tm_decay = randn(d, 0.5); this.tm_bonus = randn(d, 0.1);
    this.Wk = randn(d * d, 0.02); this.Wv = randn(d * d, 0.02); this.Wr = randn(d * d, 0.02); this.Wout = randn(d * d, 0.02);
    this.ln1g = zeros(d); this.ln1b = zeros(d); this.ln2g = zeros(d); this.ln2b = zeros(d);
    for (i = 0; i < d; i++) { this.ln1g[i] = 1; this.ln2g[i] = 1; }
    this.cm_mix_k = randn(d, 0.1); this.cm_mix_r = randn(d, 0.1);
    for (i = 0; i < d; i++) { this.cm_mix_k[i] = sigmoid(this.cm_mix_k[i]); this.cm_mix_r[i] = sigmoid(this.cm_mix_r[i]); }
    this.cm_Wk = randn(ff * d, 0.02); this.cm_Wr = randn(d * d, 0.02); this.cm_Wv = randn(d * ff, 0.02);
  }
  function Model(cfg, tok) {
    this.cfg = cfg; this.tok = tok; cfg.nVocab = tok.vocab.length;
    var d = cfg.nEmbed, V = cfg.nVocab, i;
    this.emb = randn(V * d, 0.02);
    this.ln0g = zeros(d); this.ln0b = zeros(d); for (i = 0; i < d; i++) this.ln0g[i] = 1;
    this.blocks = []; for (i = 0; i < cfg.nLayer; i++) this.blocks.push(new Block(cfg));
    this.lnFg = zeros(d); this.lnFb = zeros(d); for (i = 0; i < d; i++) this.lnFg[i] = 1;
    this.head = randn(V * d, 0.02); this.steps = 0; this.lossEma = 2.8;
  }
  Model.prototype.initState = function () {
    var d = this.cfg.nEmbed, L = this.cfg.nLayer, st = [], i, j;
    for (i = 0; i < L; i++) {
      st.push({ x: zeros(d), aa: zeros(d), bb: zeros(d), pp: zeros(d), cx: zeros(d) });
      for (j = 0; j < d; j++) st[i].pp[j] = -1e30;
    }
    return st;
  };
  function timeMix(x, state, B) {
    var d = x.length, i, xx = state.x;
    var xk = zeros(d), xv = zeros(d), xr = zeros(d);
    for (i = 0; i < d; i++) {
      xk[i] = x[i] * B.tm_mix_k[i] + xx[i] * (1 - B.tm_mix_k[i]);
      xv[i] = x[i] * B.tm_mix_v[i] + xx[i] * (1 - B.tm_mix_v[i]);
      xr[i] = x[i] * B.tm_mix_r[i] + xx[i] * (1 - B.tm_mix_r[i]);
    }
    var k = zeros(d), v = zeros(d), r = zeros(d);
    matvec(B.Wk, xk, k, d, d); matvec(B.Wv, xv, v, d, d); matvec(B.Wr, xr, r, d, d);
    for (i = 0; i < d; i++) r[i] = sigmoid(r[i]);
    var wkv = zeros(d), aa = state.aa, bb = state.bb, pp = state.pp, qq, e1, e2;
    for (i = 0; i < d; i++) {
      var decay = -Math.exp(B.tm_decay[i]), bonus = B.tm_bonus[i];
      qq = Math.max(pp[i], k[i] + bonus);
      e1 = Math.exp(pp[i] - qq); e2 = Math.exp(k[i] + bonus - qq);
      wkv[i] = (e1 * aa[i] + e2 * v[i]) / (e1 * bb[i] + e2 + 1e-8);
      qq = Math.max(pp[i] + decay, k[i]);
      e1 = Math.exp(pp[i] + decay - qq); e2 = Math.exp(k[i] - qq);
      aa[i] = e1 * aa[i] + e2 * v[i]; bb[i] = e1 * bb[i] + e2; pp[i] = qq;
    }
    for (i = 0; i < d; i++) state.x[i] = x[i];
    var gated = zeros(d), out = zeros(d);
    for (i = 0; i < d; i++) gated[i] = r[i] * wkv[i];
    matvec(B.Wout, gated, out, d, d);
    return out;
  }
  function channelMix(x, state, B) {
    var d = x.length, ff = B.cm_Wk.length / d, i, xx = state.cx;
    var xk = zeros(d), xr = zeros(d);
    for (i = 0; i < d; i++) {
      xk[i] = x[i] * B.cm_mix_k[i] + xx[i] * (1 - B.cm_mix_k[i]);
      xr[i] = x[i] * B.cm_mix_r[i] + xx[i] * (1 - B.cm_mix_r[i]);
    }
    for (i = 0; i < d; i++) state.cx[i] = x[i];
    var k = zeros(ff), r = zeros(d);
    matvec(B.cm_Wk, xk, k, ff, d); matvec(B.cm_Wr, xr, r, d, d);
    for (i = 0; i < d; i++) r[i] = sigmoid(r[i]);
    for (i = 0; i < ff; i++) k[i] = relu2(k[i]);
    var vv = zeros(d); matvec(B.cm_Wv, k, vv, d, ff);
    for (i = 0; i < d; i++) vv[i] *= r[i];
    return vv;
  }
  Model.prototype.forwardToken = function (tokenId, state) {
    var cfg = this.cfg, d = cfg.nEmbed, i, j, x = zeros(d), xn = zeros(d);
    for (j = 0; j < d; j++) x[j] = this.emb[tokenId * d + j];
    layerNorm(x, this.ln0g, this.ln0b, xn, d);
    for (j = 0; j < d; j++) x[j] = xn[j];
    for (i = 0; i < cfg.nLayer; i++) {
      var B = this.blocks[i], st = state[i], dx;
      layerNorm(x, B.ln1g, B.ln1b, xn, d); dx = timeMix(xn, st, B);
      for (j = 0; j < d; j++) x[j] += dx[j];
      layerNorm(x, B.ln2g, B.ln2b, xn, d); dx = channelMix(xn, st, B);
      for (j = 0; j < d; j++) x[j] += dx[j];
    }
    layerNorm(x, this.lnFg, this.lnFb, xn, d);
    var logits = zeros(cfg.nVocab); matvec(this.head, xn, logits, cfg.nVocab, d);
    return { logits: logits, hidden: xn };
  };
  Model.prototype.forward = function (ids, state) {
    if (!state) state = this.initState();
    var t, out = null;
    for (t = 0; t < ids.length; t++) out = this.forwardToken(ids[t], state);
    return { logits: out.logits, hidden: out.hidden, state: state };
  };
  Model.prototype.trainText = function (text, epochs) {
    epochs = epochs || 2;
    var ids = this.tok.encode(text, 80);
    if (ids.length < 3) return { loss: 0, steps: 0 };
    var cfg = this.cfg, d = cfg.nEmbed, V = cfg.nVocab, e, t, lossSum = 0, n = 0, i, j;
    for (e = 0; e < epochs; e++) {
      var state = this.initState();
      for (t = 0; t < ids.length - 1; t++) {
        var out = this.forwardToken(ids[t], state), target = ids[t + 1], logits = out.logits;
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
          for (j = 0; j < d; j++) this.head[row + j] -= g * h[j];
        }
        var rowE = ids[t] * d;
        for (j = 0; j < d; j++) {
          var acc = 0;
          for (i = 0; i < Math.min(V, 160); i++) {
            if (Math.abs(grad[i]) < 1e-5) continue;
            acc += grad[i] * this.head[i * d + j];
          }
          this.emb[rowE + j] -= lr * 0.25 * acc;
        }
        this.steps++;
      }
    }
    var avg = n ? lossSum / n : 0;
    this.lossEma = 0.92 * this.lossEma + 0.08 * avg;
    return { loss: avg, steps: n, ema: this.lossEma };
  };
  Model.prototype.generate = function (prompt, maxNew, temperature) {
    maxNew = maxNew || 48; temperature = temperature == null ? 0.85 : temperature;
    var ids = this.tok.encode(prompt, 60);
    if (ids.length && ids[ids.length - 1] === this.tok.eos) ids.pop();
    var state = this.initState(), t, out, logits, i, m, s, r, cum, pick;
    for (t = 0; t < ids.length; t++) out = this.forwardToken(ids[t], state);
    for (t = 0; t < maxNew; t++) {
      logits = out.logits; m = -Infinity;
      for (i = 0; i < logits.length; i++) { logits[i] /= temperature || 1; if (logits[i] > m) m = logits[i]; }
      s = 0; for (i = 0; i < logits.length; i++) { logits[i] = Math.exp(logits[i] - m); s += logits[i]; }
      r = Math.random() * s; cum = 0; pick = this.tok.eos;
      for (i = 0; i < logits.length; i++) { cum += logits[i]; if (r <= cum) { pick = i; break; } }
      if (pick === this.tok.eos) break;
      ids.push(pick); out = this.forwardToken(pick, state);
    }
    return this.tok.decode(ids);
  };
  Model.prototype.embed = function (text) {
    var ids = this.tok.encode(text, 32);
    if (ids.length && ids[ids.length - 1] === this.tok.eos) ids.pop();
    if (!ids.length) ids = [this.tok.bos];
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
        v: 2, arch: "RWKV", steps: model.steps, lossEma: model.lossEma, vocab: model.tok.vocab,
        cfg: { nEmbed: model.cfg.nEmbed, nLayer: model.cfg.nLayer, nFF: model.cfg.nFF, lr: model.cfg.lr },
        emb: Array.from(model.emb), head: Array.from(model.head),
        ln0g: Array.from(model.ln0g), ln0b: Array.from(model.ln0b),
        lnFg: Array.from(model.lnFg), lnFb: Array.from(model.lnFb),
        blocks: model.blocks.map(function (B) {
          return {
            tm_mix_k: Array.from(B.tm_mix_k), tm_mix_v: Array.from(B.tm_mix_v), tm_mix_r: Array.from(B.tm_mix_r),
            tm_decay: Array.from(B.tm_decay), tm_bonus: Array.from(B.tm_bonus),
            Wk: Array.from(B.Wk), Wv: Array.from(B.Wv), Wr: Array.from(B.Wr), Wout: Array.from(B.Wout),
            ln1g: Array.from(B.ln1g), ln1b: Array.from(B.ln1b), ln2g: Array.from(B.ln2g), ln2b: Array.from(B.ln2b),
            cm_mix_k: Array.from(B.cm_mix_k), cm_mix_r: Array.from(B.cm_mix_r),
            cm_Wk: Array.from(B.cm_Wk), cm_Wr: Array.from(B.cm_Wr), cm_Wv: Array.from(B.cm_Wv)
          };
        })
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(pack));
      localStorage.setItem(META_KEY, JSON.stringify({ arch: "RWKV", steps: model.steps, lossEma: model.lossEma, vocab: model.tok.vocab.length, layers: model.cfg.nLayer, d: model.cfg.nEmbed, savedAt: Date.now() }));
      return true;
    } catch (e) { return false; }
  }
  function loadModel() {
    try {
      var raw = localStorage.getItem(STORE_KEY); if (!raw) return null;
      var pack = JSON.parse(raw); if (pack.v !== 2 || pack.arch !== "RWKV") return null;
      var tok = new Tokenizer(pack.vocab), cfg = new Config(); Object.assign(cfg, pack.cfg);
      var model = new Model(cfg, tok), i, B, p;
      model.emb = Float32Array.from(pack.emb); model.head = Float32Array.from(pack.head);
      model.ln0g = Float32Array.from(pack.ln0g); model.ln0b = Float32Array.from(pack.ln0b);
      model.lnFg = Float32Array.from(pack.lnFg); model.lnFb = Float32Array.from(pack.lnFb);
      model.steps = pack.steps || 0; model.lossEma = pack.lossEma || 2.8;
      for (i = 0; i < pack.blocks.length; i++) {
        p = pack.blocks[i]; B = model.blocks[i];
        B.tm_mix_k = Float32Array.from(p.tm_mix_k); B.tm_mix_v = Float32Array.from(p.tm_mix_v); B.tm_mix_r = Float32Array.from(p.tm_mix_r);
        B.tm_decay = Float32Array.from(p.tm_decay); B.tm_bonus = Float32Array.from(p.tm_bonus);
        B.Wk = Float32Array.from(p.Wk); B.Wv = Float32Array.from(p.Wv); B.Wr = Float32Array.from(p.Wr); B.Wout = Float32Array.from(p.Wout);
        B.ln1g = Float32Array.from(p.ln1g); B.ln1b = Float32Array.from(p.ln1b); B.ln2g = Float32Array.from(p.ln2g); B.ln2b = Float32Array.from(p.ln2b);
        B.cm_mix_k = Float32Array.from(p.cm_mix_k); B.cm_mix_r = Float32Array.from(p.cm_mix_r);
        B.cm_Wk = Float32Array.from(p.cm_Wk); B.cm_Wr = Float32Array.from(p.cm_Wr); B.cm_Wv = Float32Array.from(p.cm_Wv);
      }
      return model;
    } catch (e) { return null; }
  }
  var SEED = [
    "АКСИ — суверенный цифровой напарник. Нейросеть RWKV работает на CPU без GPU.",
    "Я АКСИ. Архитектура RWKV: рекуррентная, линейное время, постоянная память.",
    "RWKV сочетает силу трансформера и скорость RNN. Нет KV-cache.",
    "Формула АКСИ: внимание умножить интеллект умножить структуру.",
    "Обучение на устройстве. Каждый факт усиливает резонанс модели.",
    "Контакт: aksilove@internet.ru. Протокол Agent-v1.",
    "Привет. Нейросеть будущего — личная, локальная, без облака.",
    "Time-mixing и channel-mixing — два блока RWKV. Состояние O единицы памяти.",
    "Запомни факт — и веса обновятся. Данные не уходят с устройства.",
    "EQS, квант, DKV, Vision и Neuro — слой АКСИ."
  ];
  var model = null, memoryVecs = [];
  function ensure() {
    if (model) return model;
    model = loadModel();
    if (!model) model = new Model(new Config(), new Tokenizer());
    return model;
  }
  function seedTrain(rounds) {
    var m = ensure(); rounds = rounds || 2; var r, i;
    for (r = 0; r < rounds; r++) for (i = 0; i < SEED.length; i++) m.trainText(SEED[i], 1);
    memoryVecs = [];
    for (i = 0; i < SEED.length; i++) memoryVecs.push({ text: SEED[i], vec: m.embed(SEED[i]) });
    saveModel(m);
    return { steps: m.steps, loss: m.lossEma, seeded: SEED.length, arch: "RWKV" };
  }
  function learn(text, epochs) {
    text = String(text || "").trim();
    if (text.length < 3) return null;
    var m = ensure(), st = m.trainText(text, epochs || 3);
    memoryVecs.push({ text: text, vec: m.embed(text) });
    if (memoryVecs.length > 220) memoryVecs = memoryVecs.slice(-220);
    if (m.steps % 15 === 0) saveModel(m);
    return st;
  }
  function retrieve(q, k) {
    k = k || 3; var m = ensure(), qv = m.embed(q);
    var scored = memoryVecs.map(function (item) { return { text: item.text, score: m.similarity(qv, item.vec) }; });
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) mem.slice(0, 50).forEach(function (x) {
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
    if (m.steps < 8) seedTrain(1);
    var hits = retrieve(question, 3), top = hits[0];
    if (top && top.score > 0.52) {
      return { text: top.text, mode: "rwkv-retrieve", score: top.score, steps: m.steps, loss: m.lossEma, arch: "RWKV" };
    }
    var prompt = "Вопрос: " + question + "\nОтвет:";
    if (top && top.score > 0.22) prompt = top.text + "\n" + prompt;
    var gen = m.generate(prompt, 40, 0.8);
    var idx = gen.lastIndexOf("Ответ:");
    if (idx !== -1) gen = gen.slice(idx + 6).trim();
    gen = gen.replace(/\n+/g, " ").trim();
    if (gen.length < 4) {
      if (top) return { text: top.text, mode: "rwkv-retrieve", score: top.score, steps: m.steps, loss: m.lossEma, arch: "RWKV" };
      return { text: "RWKV ещё мало обучена. Вкладка Нейро → Обучить ядро", mode: "rwkv-weak", steps: m.steps, loss: m.lossEma, arch: "RWKV" };
    }
    return { text: gen, mode: "rwkv-gen", steps: m.steps, loss: m.lossEma, score: top ? top.score : 0, arch: "RWKV" };
  }
  function status() {
    var m = ensure();
    return { arch: "RWKV", steps: m.steps, loss: Math.round(m.lossEma * 1000) / 1000, vocab: m.tok.vocab.length,
      embed: m.cfg.nEmbed, layers: m.cfg.nLayer, ff: m.cfg.nFF, memIndex: memoryVecs.length,
      device: "CPU · pure JS · O(1) state", memory: "constant (no KV-cache)" };
  }
  function reset() {
    try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(META_KEY); } catch (e) {}
    model = null; memoryVecs = []; return true;
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>АКСИ-Neuro · RWKV · CPU</h2>' +
      '<p class="muted">Архитектура <b>RWKV</b> (2026 edge): рекуррентная, линейное время, постоянная память, без GPU и без KV-cache.</p>' +
      '<div class="kv" style="margin-top:12px">' +
      '<div class="cell"><b id="nArch">RWKV</b><span>архитектура</span></div>' +
      '<div class="cell"><b id="nSteps">0</b><span>шагов</span></div>' +
      '<div class="cell"><b id="nLoss">—</b><span>loss</span></div>' +
      '<div class="cell"><b id="nLay">4×64</b><span>L×d</span></div></div>' +
      '<div class="row"><button type="button" class="btn p" id="nSeed">Обучить ядро</button>' +
      '<button type="button" class="btn" id="nSave">Сохранить</button>' +
      '<button type="button" class="btn" id="nReset">Сброс</button></div>' +
      '<textarea id="nTrain" placeholder="Текст для обучения RWKV…" style="margin-top:12px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="nLearn">Выучить</button></div>' +
      '<textarea id="nAsk" placeholder="Вопрос к RWKV…" style="margin-top:12px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="nThink">Спросить</button></div>' +
      '<pre class="out" id="nOut">RWKV ready · CPU · constant memory</pre></div>';
    function refresh() {
      var st = status(), el;
      if ((el = document.getElementById("nSteps"))) el.textContent = String(st.steps);
      if ((el = document.getElementById("nLoss"))) el.textContent = String(st.loss);
      if ((el = document.getElementById("nLay"))) el.textContent = st.layers + "×" + st.embed;
    }
    function out(t) { var el = document.getElementById("nOut"); if (el) el.textContent = t; }
    refresh();
    document.getElementById("nSeed").onclick = function () {
      out("Обучение RWKV…"); setTimeout(function () {
        var r = seedTrain(2); refresh();
        out("Ядро RWKV обучено.\narch=" + r.arch + " steps=" + r.steps + "\nloss≈" + (Math.round(r.loss * 1000) / 1000) + "\nПамять O(1) · без KV-cache");
      }, 30);
    };
    document.getElementById("nLearn").onclick = function () {
      var t = (document.getElementById("nTrain") || {}).value || "";
      if (!String(t).trim()) return out("Вставь текст");
      out("Учу…"); setTimeout(function () {
        var st = learn(t, 4); refresh();
        out("OK loss≈" + (st && Math.round(st.loss * 1000) / 1000));
      }, 20);
    };
    document.getElementById("nThink").onclick = function () {
      var q = (document.getElementById("nAsk") || {}).value || "";
      if (!String(q).trim()) return out("Вопрос?");
      out("RWKV…"); setTimeout(function () {
        var r = think(q); refresh();
        out("[" + r.mode + "] " + r.arch + "\n\n" + r.text);
      }, 20);
    };
    document.getElementById("nSave").onclick = function () {
      out(saveModel(ensure()) ? "Сохранено" : "Ошибка"); refresh();
    };
    document.getElementById("nReset").onclick = function () {
      if (!confirm("Сброс RWKV?")) return;
      reset(); ensure(); refresh(); out("Сброшено. Обучи ядро.");
    };
  }
  setTimeout(function () {
    try {
      var m = ensure();
      if (m.steps < 5) seedTrain(1);
      else if (!memoryVecs.length) {
        for (var i = 0; i < Math.min(SEED.length, 8); i++)
          memoryVecs.push({ text: SEED[i], vec: m.embed(SEED[i]) });
      }
    } catch (e) {}
  }, 600);
  global.AKSI_NEURO = {
    ensure: ensure, seedTrain: seedTrain, learn: learn, think: think, retrieve: retrieve,
    status: status, save: function () { return saveModel(ensure()); }, reset: reset, mount: mount,
    version: "2.0.0-rwkv", arch: "RWKV"
  };
})(typeof window !== "undefined" ? window : this);
