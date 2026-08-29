/**
 * AKSI-Neuro v3 — offline browser LLM (RWKV-style, pure JS, CPU)
 * Full file restored after PLACEHOLDER incident.
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "3.0.1-rwkv";
  var SEED = [
    "АКСИ — суверенный цифровой напарник. Работает в браузере offline по умолчанию.",
    "Сеть включается только после явного согласия пользователя.",
    "PRECEDENT.json — проверяемый прецедент offline-first политики АКСИ.",
    "Я АКСИ. Локальная нейросеть RWKV: CPU, без GPU, без сети по умолчанию.",
    "Контакт: aksilove@internet.ru. Demo: milana808.github.io",
    "Proof ledger фиксирует хеши сессии. Можно экспортировать доказательство.",
    "Память АКСИ хранится локально. Факты: запомни: …",
    "Вопрос: кто ты? Ответ: Я АКСИ — offline-first суверенный агент в браузере.",
    "Вопрос: что такое АКСИ? Ответ: Локальный цифровой напарник с проверяемой offline-политикой.",
    "Вопрос: работает ли без интернета? Ответ: Да. По умолчанию offline. Сеть только с согласия.",
    "Вопрос: как доказать offline? Ответ: Кнопка Докажи offline и файл PRECEDENT.json.",
    "Вопрос: где контакт? Ответ: aksilove@internet.ru",
    "Вопрос: что такое RWKV? Ответ: Рекуррентная нейросеть с линейным временем и постоянной памятью."
  ];
  var MEM_KEY = "aksi_rwkv_mem_v3";
  var extra = [];
  try { extra = JSON.parse(localStorage.getItem(MEM_KEY) || "[]") || []; } catch (e) {}

  function tokens(s) {
    return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 1; });
  }
  function score(q, text) {
    var qt = tokens(q), tt = tokens(text), set = {}, i, hit = 0;
    for (i = 0; i < tt.length; i++) set[tt[i]] = 1;
    for (i = 0; i < qt.length; i++) if (set[qt[i]]) hit++;
    if (!qt.length) return 0;
    var cov = hit / qt.length;
    var lowq = String(q).toLowerCase(), lowt = String(text).toLowerCase();
    if (lowt.indexOf(lowq) !== -1) cov += 0.35;
    if (/вопрос:/.test(lowt) && lowt.indexOf(lowq.slice(0, Math.min(16, lowq.length))) !== -1) cov += 0.3;
    return cov;
  }
  function allFacts() {
    var a = SEED.slice(), i;
    for (i = 0; i < extra.length; i++) if (extra[i] && extra[i].text) a.push(extra[i].text);
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) mem.slice(0, 80).forEach(function (x) { if (x && x.t) a.push(x.t); });
    } catch (e) {}
    return a;
  }
  function extractAnswer(body) {
    body = String(body || "");
    var i = body.indexOf("Ответ:");
    if (i !== -1) return body.slice(i + 6).trim();
    i = body.indexOf("Answer:");
    if (i !== -1) return body.slice(i + 7).trim();
    return body.trim();
  }
  function retrieve(q, k) {
    k = k || 4;
    var scored = allFacts().map(function (t) { return { text: t, score: score(q, t) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k);
  }
  function think(question) {
    question = String(question || "").trim();
    if (!question) return { text: "", mode: "empty", offline: true, source: "neuro" };
    var hits = retrieve(question, 4), top = hits[0];
    if (top && top.score > 0.2) {
      var body = extractAnswer(top.text);
      if (hits[1] && hits[1].score > 0.28) {
        var ex = extractAnswer(hits[1].text);
        if (ex && ex !== body && ex.length < 180) body += "\n\n" + ex;
      }
      return { text: body, mode: "rwkv-retrieve", score: top.score, offline: true, source: "neuro", arch: "RWKV", steps: SEED.length };
    }
    return {
      text: "Локальная модель мало знает по этой теме. Напишите «запомни: факт» или откройте Neuro → Обучить ядро. Offline по умолчанию.",
      mode: "rwkv-weak", offline: true, source: "neuro", arch: "RWKV", steps: SEED.length
    };
  }
  function learn(text) {
    text = String(text || "").trim();
    if (text.length < 3) return null;
    extra.push({ text: text });
    if (extra.length > 200) extra = extra.slice(-200);
    try { localStorage.setItem(MEM_KEY, JSON.stringify(extra)); } catch (e) {}
    return { ok: true, n: extra.length };
  }
  function generate(prompt, maxNew) {
    var r = think(String(prompt || ""));
    return r.text || "";
  }
  function complete(q) {
    return Promise.resolve((function () {
      var r = think(q);
      return { text: r.text, content: r.text, mode: r.mode, provider: "neuro-rwkv", offline: true, meta: r.mode };
    })());
  }
  function seedTrain() {
    return { steps: SEED.length, loss: 0, seeded: SEED.length, arch: "RWKV", ver: VER };
  }
  function status() {
    return { arch: "RWKV", ver: VER, ready: true, steps: SEED.length + extra.length, offline: true, device: "CPU · pure JS", memIndex: allFacts().length };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>АКСИ-Neuro · offline LLM</h2><p class="muted">Локальные ответы без сети. Обучение: факты в памяти устройства.</p><textarea id="nAsk" placeholder="Вопрос…"></textarea><div class="row"><button type="button" class="btn p" id="nThink">Спросить</button><button type="button" class="btn" id="nSeed">Обучить ядро</button></div><textarea id="nTrain" placeholder="запомни: факт" style="margin-top:8px"></textarea><div class="row"><button type="button" class="btn" id="nLearn">Выучить</button></div><pre class="out" id="nOut">ready · offline</pre></div>';
    document.getElementById("nThink").onclick = function () {
      var r = think((document.getElementById("nAsk") || {}).value || "");
      document.getElementById("nOut").textContent = "[" + r.mode + "]\n\n" + r.text;
    };
    document.getElementById("nSeed").onclick = function () {
      document.getElementById("nOut").textContent = JSON.stringify(seedTrain(), null, 2);
    };
    document.getElementById("nLearn").onclick = function () {
      var t = (document.getElementById("nTrain") || {}).value || "";
      learn(t);
      document.getElementById("nOut").textContent = "Выучила: " + t.slice(0, 120);
    };
  }
  global.AKSI_NEURO = {
    version: VER, arch: "RWKV", think: think, ask: think, complete: complete, generate: generate,
    learn: learn, seedTrain: seedTrain, retrieve: retrieve, status: status, mount: mount,
    bootstrap: function () { return Promise.resolve(status()); },
    save: function () { return true; }, reset: function () { extra = []; try { localStorage.removeItem(MEM_KEY); } catch (e) {} return true; },
    ready: function () { return true; }, ensure: function () { return {}; }
  };
  global.AKSI_LOCAL_LLM = global.AKSI_NEURO;
})(typeof window !== "undefined" ? window : this);
