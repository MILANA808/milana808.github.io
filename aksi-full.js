/** AKSI Full System v8.2 · destination · aksilove@internet.ru */
(function () {
  "use strict";
  var VER = "8.2.0";
  var history = [];
  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function status(m) { var e = $("status"); if (e) e.textContent = m || ""; }
  function setPipe(n) {
    try {
      document.querySelectorAll("#pipe div").forEach(function (el) {
        el.classList.toggle("on", Number(el.getAttribute("data-s")) <= n);
      });
    } catch (e) {}
  }
  function fnv1a(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ("00000000" + h.toString(16)).slice(-8);
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
  }
  var SEED = [
    { k: ["кто ты", "что ты", "представься", "привет", "здравствуй"],
      a: "Я АКСИ — гибридный ИИ в браузере.\n\nКонтур ответа (как у LLM, но прозрачный):\n1) ищу факты — ядро, Knowledge, Neuro, веб;\n2) синтезирую связный ответ;\n3) сравниваю кандидаты;\n4) выбираю лучший;\n5) фиксирую seal.\n\nДля свободной генерации нажмите «Кора WebLLM».\nКонтакт: aksilove@internet.ru" },
    { k: ["вопрос нашего времени", "мировой вопрос", "главн проблем", "проблема ии"],
      a: "Вопрос нашего времени в ИИ: как получить пользу от сильных моделей и не отдать контроль, данные и проверяемость решений.\n\nОтвет АКСИ:\n• факты ищутся явно;\n• кандидаты видны;\n• выбор объясним;\n• seal фиксирует итог;\n• кора (WebLLM) — локально, по желанию.\n\nЭто не отказ от ИИ, а ИИ под контролем пользователя — то, к чему идут все, кто устал от чёрного ящика." },
    { k: ["искусственный интеллект", "что такое ии", "нейросет", "llm", "языков модель", "chatgpt", "gpt"],
      a: "Искусственный интеллект — системы восприятия, вывода, обучения и генерации.\n\nСовременные чат-LLM (GPT и аналоги) предсказывают следующий токен на огромных данных: сильны в языке, зависят от облака и не гарантируют истину.\n\nАКСИ — другой путь того же времени: явный контур решения + локальные факты + опциональная локальная кора, с аудитом (seal)." },
    { k: ["нейронн сеть", "нейронная сеть", "нейронные сети"],
      a: "Нейронная сеть — модель, вдохновлённая связями нейронов: слои узлов, веса, обучение на данных.\n\nГлубокие сети лежат в основе современных LLM и распознавания образов. Это статистические аппроксиматоры, а не «мозг»: они обобщают по данным и ошибаются вне распределения." },
    { k: ["квантовый компьютер", "квантовые компьютер", "кубит"],
      a: "Квантовый компьютер считает на кубитах. Кубит может быть в суперпозиции 0 и 1; используются интерференция и запутанность.\n\nТеоретический выигрыш — Шор, Гровер. Практика — прототипы; отказоустойчивые машины большой мощности ещё развиваются.\n\nВ АКСИ «коллапс» — выбор ответа среди кандидатов, не замена физическому QC." },
    { k: ["формул", "aksi =", "формула aksi"],
      a: "AKSI = (A × I × S) × (1 + 0.4√n)\nA — agency, I — integrity, S — structure / sovereignty, n — история seal." },
    { k: ["гравитац", "тяготен"],
      a: "Гравитация — притяжение масс.\nНьютон: сила ∝ массам / r².\nОТО Эйнштейна: искривление пространства-времени массой и энергией." },
    { k: ["фотосинтез"], a: "Фотосинтез: 6CO₂ + 6H₂O + свет → C₆H₁₂O₆ + 6O₂.\nХлоропласты, хлорофилл." },
    { k: ["днк", "ген ", "хромосом", "рнк"],
      a: "ДНК — двойная спираль (A,T,G,C). Ген — участок ДНК. РНК — считывание и синтез белков." },
    { k: ["блокчейн", "биткоин", "bitcoin", "криптовалют"],
      a: "Блокчейн — журнал блоков, связанных хешами. Биткоин (2009) — криптовалюта без банка." },
    { k: ["теория относительности", "эйнштейн", "e=mc"],
      a: "СТО (1905): c постоянна; E = mc². ОТО (1915): гравитация — кривизна пространства-времени." },
    { k: ["климат", "глобальн потепл", "парниковы"],
      a: "Рост парниковых газов усиливает удержание тепла. Современное потепление в значительной мере связано с деятельностью человека." },
    { k: ["космос", "вселенн", "черн дыр", "большой взрыв"],
      a: "Вселенная расширяется ~13,8 млрд лет. Чёрные дыры удерживают даже свет. Земля — в Солнечной системе, Млечный Путь — наша галактика." },
    { k: ["коллапс", "суперпозиц", "как работа"],
      a: "Контур АКСИ: найти → синтез → кандидаты → выбор → seal. Прозрачная модель решения." },
    { k: ["миссия", "зачем", "польза", "что умеешь"],
      a: "Миссия — полезный проверяемый ответ в браузере.\nФакты, синтез, веб, память, seal, локальная кора WebLLM.\naksilove@internet.ru" },
    { k: ["офлайн", "без интернет", "автоном", "sovereign"],
      a: "Offline-first: ядро, Neuro, Knowledge и память без сети. Веб и кора — усиления." }
  ];
  function seedMatch(q) {
    var nq = norm(q), best = null, score = 0;
    if (nq === "ии" || nq === "ai") {
      for (var i = 0; i < SEED.length; i++) {
        if (SEED[i].k.indexOf("что такое ии") !== -1 || SEED[i].k.indexOf("искусственный интеллект") !== -1)
          return { text: SEED[i].a, conf: 0.92, source: "ядро" };
      }
    }
    for (var i = 0; i < SEED.length; i++) {
      var s = 0;
      for (var j = 0; j < SEED[i].k.length; j++) {
        var k = norm(SEED[i].k[j]);
        if (k && nq.indexOf(k) !== -1) s += 10 + k.length;
      }
      if (s > score) { score = s; best = SEED[i]; }
    }
    if (score >= 6) return { text: best.a, conf: Math.min(0.97, 0.82 + score / 40), source: "ядро" };
    return null;
  }
  function memAll() { try { return JSON.parse(localStorage.getItem("aksi_full_mem") || "[]"); } catch (e) { return []; } }
  function memWrite(a) { try { localStorage.setItem("aksi_full_mem", JSON.stringify(a.slice(-400))); } catch (e) {} }
  function memAdd(t) { var a = memAll(); a.push({ t: Date.now(), text: String(t).slice(0, 500) }); memWrite(a); }
  function memSearch(q) {
    var words = norm(q).split(" ").filter(function (w) { return w.length > 3; });
    var hits = [], list = memAll();
    for (var i = list.length - 1; i >= 0 && hits.length < 3; i--) {
      var t = norm(list[i].text);
      for (var w = 0; w < words.length; w++) if (t.indexOf(words[w]) !== -1) { hits.push(list[i].text); break; }
    }
    return hits.length ? { text: "Из памяти:\n• " + hits.join("\n• "), conf: 0.74, source: "память" } : null;
  }
  function sealsAll() { try { return JSON.parse(localStorage.getItem("aksi_full_seals") || "[]"); } catch (e) { return []; } }
  function sealPush(q, a, src, p) {
    var h = fnv1a(q + "|" + a + "|" + src + "|" + p);
    var list = sealsAll();
    list.push({ t: Date.now(), q: String(q).slice(0, 100), h: h, src: src, p: p });
    try { localStorage.setItem("aksi_full_seals", JSON.stringify(list.slice(-50))); } catch (e) {}
    return h;
  }
  function withTimeout(p, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(null); } }, ms);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } })
       .catch(function () { if (!done) { done = true; clearTimeout(t); resolve(null); } });
    });
  }
  function stripTopic(q) {
    return String(q).replace(/^(что такое|кто такой|кто такая|what is|who is|расскажи про|расскажи о|объясни|почему|как работает)\s+/i, "").replace(/\?+$/g, "").trim() || q;
  }
  async function fetchWiki(q) {
    var topic = stripTopic(q);
    try {
      var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(topic.replace(/\s+/g, "_"));
      var r = await withTimeout(fetch(url, { mode: "cors" }).then(function (res) {
        if (!res.ok) throw new Error("x"); return res.json();
      }), 2800);
      if (r && r.extract && r.type !== "disambiguation")
        return { title: r.title, text: r.extract, url: (r.content_urls && r.content_urls.desktop && r.content_urls.desktop.page) || "", source: "wikipedia", conf: 0.9 };
    } catch (e) {}
    try {
      var sUrl = "https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(topic) + "&srlimit=1&format=json&origin=*";
      var s = await withTimeout(fetch(sUrl, { mode: "cors" }).then(function (res) { return res.json(); }), 2800);
      var hit = s && s.query && s.query.search && s.query.search[0];
      if (!hit) return null;
      var url2 = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(hit.title.replace(/ /g, "_"));
      var r2 = await withTimeout(fetch(url2, { mode: "cors" }).then(function (res) {
        if (!res.ok) throw new Error("x"); return res.json();
      }), 2800);
      if (r2 && r2.extract)
        return { title: r2.title, text: r2.extract, url: (r2.content_urls && r2.content_urls.desktop && r2.content_urls.desktop.page) || "", source: "wikipedia", conf: 0.88 };
    } catch (e) {}
    return null;
  }
  async function fetchDDG(q) {
    try {
      var url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_redirect=1&no_html=1";
      var r = await withTimeout(fetch(url, { mode: "cors" }).then(function (res) { return res.json(); }), 2200);
      if (!r) return null;
      var text = r.AbstractText || r.Answer || "";
      if (!text && r.RelatedTopics && r.RelatedTopics[0]) text = r.RelatedTopics[0].Text || "";
      if (!text || text.length < 40) return null;
      return { title: r.Heading || "DuckDuckGo", text: text, url: r.AbstractURL || "", source: "web", conf: 0.78 };
    } catch (e) { return null; }
  }
  function knowledgeHit(q) {
    try {
      var K = window.AKSIKnowledge || window.AKSI_KNOWLEDGE;
      if (!K || !K.search) return null;
      var r = K.search(q);
      if (r && r.body) return { text: r.body, conf: 0.85, source: "knowledge", title: r.title };
    } catch (e) {}
    return null;
  }
  function neuroHit(q) {
    try {
      if (!window.AKSI_NEURO || !AKSI_NEURO.think) return null;
      var r = AKSI_NEURO.think(q);
      if (r && r.text && r.text.length > 40 && !/Спросите:|offline Neuro/i.test(r.text))
        return { text: r.text, conf: Math.min(0.9, 0.55 + (r.score || 0.2)), source: "neuro" };
    } catch (e) {}
    return null;
  }
  function synthesize(q, facts) {
    if (!facts || !facts.length) return null;
    var ranked = facts.slice().sort(function (a, b) {
      function p(s) {
        s = String(s || "");
        if (s.indexOf("wiki") === 0) return 3;
        if (s === "knowledge" || s === "web") return 2;
        return 1;
      }
      return p(b.source) - p(a.source);
    });
    var primary = ranked[0];
    var body = String(primary.text || "").trim();
    if (body.length < 20) return null;
    var sentences = body.replace(/\s+/g, " ").split(/(?<=[.!?…])\s+/).filter(function (s) { return s && s.length > 15; });
    if (!sentences.length) sentences = [body.slice(0, 400)];
    var lead = sentences[0];
    if (lead.length > 240) lead = lead.slice(0, 237) + "…";
    var points = sentences.slice(1, 4).map(function (s) {
      if (s.length > 180) s = s.slice(0, 177) + "…";
      return "• " + s;
    });
    var out = lead;
    if (points.length) out += "\n\n" + points.join("\n");
    if (primary.url) out += "\n\n→ " + primary.url;
    out += "\n\nИсточник: " + (primary.source || "факт") + (primary.title ? " · " + primary.title : "");
    if (ranked[1] && ranked[1].text && ranked[1].source !== primary.source) {
      var extra = String(ranked[1].text).replace(/\s+/g, " ").slice(0, 150);
      if (extra.length > 40) out += "\nЕщё (" + ranked[1].source + "): " + extra + (extra.length >= 150 ? "…" : "");
    }
    return { text: out, conf: Math.min(0.94, (primary.conf || 0.8) + 0.08), source: "синтез" };
  }
  function cortexReady() {
    try { return !!(window.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status().ready); } catch (e) { return false; }
  }
  async function cortexSynth(q, facts) {
    if (!cortexReady()) return null;
    var ctx = (facts || []).slice(0, 5).map(function (f, i) {
      return (i + 1) + ") [" + (f.source || "?") + "] " + String(f.text || "").slice(0, 380);
    }).join("\n");
    var hist = history.slice(-4).map(function (t) {
      return "Q: " + t.q + "\nA: " + String(t.a).slice(0, 180);
    }).join("\n");
    try {
      var r = await AKSI_WEBLLM.complete(
        (hist ? "Диалог:\n" + hist + "\n\n" : "") +
        "Вопрос: " + q + "\n\nФакты:\n" + (ctx || "(мало — честно отметь пробелы)") +
        "\n\nДай лучший ответ.",
        {
          system: "Ты кора АКСИ — русскоязычный ассистент. Только русский. Сначала прямой ответ (1–2 фразы), затем пояснение 4–8 предложений. Опирайся на факты. Без воды.",
          temperature: 0.42,
          max_tokens: 640
        }
      );
      var t = String((r && (r.text || r.answer)) || "").trim();
      if (t.length < 50 || !/[а-яёА-ЯЁ]/.test(t)) return null;
      return { text: t, conf: 0.96, source: "кора" };
    } catch (e) { return null; }
  }
  function normalize(ws) {
    var s = 0; for (var i = 0; i < ws.length; i++) s += Math.max(0.001, ws[i]);
    return ws.map(function (w) { return Math.max(0.001, w) / s; });
  }
  function collapse(amps) {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < amps.length; i++) { acc += amps[i]; if (r <= acc) return i; }
    return amps.length - 1;
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }
  var modulesPromise = null;
  function ensureModules() {
    if (modulesPromise) return modulesPromise;
    modulesPromise = Promise.all([
      (window.AKSIKnowledge || window.AKSI_KNOWLEDGE) ? Promise.resolve() : loadScript("/aksi-knowledge.js?v=8").catch(function () {}),
      window.AKSI_NEURO ? Promise.resolve() : loadScript("/aksi-neuro.js?v=8").catch(function () {})
    ]);
    return modulesPromise;
  }
  async function fullThink(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "" };
    if (/^запомни\s*[:：]/i.test(query)) {
      var fact = query.replace(/^запомни\s*[:：]\s*/i, "").trim();
      memAdd(fact); renderMem();
      return { ok: true, answer: "Запомнила: «" + fact.slice(0, 220) + "».", source: "память", probability: 1, superposition: [], seal: sealPush(query, fact, "память", 1), version: VER };
    }
    await ensureModules();
    setPipe(1); status("1 · Ищу…");
    var facts = [], cands = [];
    function push(c) {
      if (!c || !c.text || c.text.length < 8) return;
      for (var i = 0; i < cands.length; i++) if (cands[i].text.slice(0, 55) === c.text.slice(0, 55)) return;
      cands.push(c);
    }
    var seed = seedMatch(query); if (seed) { facts.push(seed); push(seed); }
    var kh = knowledgeHit(query); if (kh) { facts.push(kh); push(kh); }
    var nh = neuroHit(query); if (nh) push(nh);
    var mem = memSearch(query); if (mem) push(mem);
    if (opts.web !== false) {
      var pair = await Promise.all([fetchWiki(query), fetchDDG(query)]);
      if (pair[0]) facts.push(pair[0]);
      if (pair[1]) facts.push(pair[1]);
    }
    setPipe(2); status("2 · Синтез…");
    var external = facts.filter(function (f) {
      var s = String(f.source || "");
      return s.indexOf("wiki") === 0 || s === "web" || s === "knowledge";
    });
    var synth = synthesize(query, external);
    if (synth) push(synth);
    setPipe(3);
    if (opts.cortex !== false && cortexReady()) {
      status("3 · Кора…");
      var neural = await cortexSynth(query, facts);
      if (neural) push(neural);
    }
    if (!cands.length) {
      push({
        text: "По «" + query + "» нет надёжного факта.\n\n• «что такое X»\n• Веб включён\n• «Кора WebLLM»\n• «запомни: …»\n\naksilove@internet.ru",
        conf: 0.2, source: "пробел"
      });
    }
    var weights = cands.map(function (c) {
      var w = c.conf || 0.5;
      if (c.source === "кора") w += 0.4;
      if (c.source === "синтез") w += 0.32;
      if (c.source === "ядро") w += 0.26;
      if (c.source === "knowledge") w += 0.14;
      if (c.source === "neuro") w += 0.12;
      if (String(c.source).indexOf("wiki") === 0 || c.source === "web") w += 0.1;
      if (c.source === "пробел") w *= 0.3;
      return w;
    });
    var amps = normalize(weights);
    setPipe(4); status("4 · Выбор…");
    var maxI = 0;
    for (var i = 1; i < amps.length; i++) if (amps[i] > amps[maxI]) maxI = i;
    var idx = amps[maxI] >= 0.28 ? maxI : collapse(amps);
    var chosen = cands[idx];
    setPipe(5); status("");
    var h = sealPush(query, chosen.text, chosen.source, amps[idx]);
    history.push({ q: query, a: chosen.text });
    if (history.length > 12) history = history.slice(-12);
    return {
      ok: true,
      answer: chosen.text,
      source: chosen.source,
      probability: +amps[idx].toFixed(4),
      superposition: cands.map(function (c, i) {
        return { source: c.source, probability: +amps[i].toFixed(4), preview: c.text.slice(0, 140), selected: i === idx };
      }),
      seal: h,
      cortex: cortexReady(),
      version: VER
    };
  }
  var lastSup = [];
  function renderSup() {
    var el = $("supList"); if (!el) return;
    if (!lastSup.length) { el.innerHTML = '<li class="meta">Нет данных</li>'; return; }
    el.innerHTML = lastSup.map(function (s) {
      return '<li class="' + (s.selected ? "sel" : "") + '"><span class="p">' + (s.probability * 100).toFixed(0) +
        "%</span> · <b>" + s.source + "</b>" + (s.selected ? " ← выбран" : "") + "<br>" +
        String(s.preview).replace(/</g, "<") + "</li>";
    }).join("");
  }
  function renderMem() {
    var list = memAll().slice().reverse(), el = $("memList"); if (!el) return;
    if (!list.length) { el.innerHTML = '<li class="meta">Пусто</li>'; return; }
    el.innerHTML = list.slice(0, 40).map(function (m) {
      return "<li>" + String(m.text).replace(/</g, "<") + '<div class="meta">' + new Date(m.t).toLocaleString() + "</div></li>";
    }).join("");
  }
  function renderSeals() {
    var list = sealsAll().slice().reverse(), el = $("sealList"); if (!el) return;
    if (!list.length) { el.innerHTML = '<li class="meta">Пусто</li>'; return; }
    el.innerHTML = list.slice(0, 25).map(function (s) {
      return '<li><span class="trail">' + s.h + "</span> · " + (s.src || "") + " · P=" + ((s.p || 0) * 100).toFixed(0) +
        "%<br>" + String(s.q || "").replace(/</g, "<") + '<div class="meta">' + new Date(s.t).toLocaleString() + "</div></li>";
    }).join("");
  }
  function renderSys() {
    var el = $("sysOut"); if (!el) return;
    el.textContent =
      "Версия: " + VER +
      "\nЯдро: ON" +
      "\nKnowledge: " + (window.AKSIKnowledge || window.AKSI_KNOWLEDGE ? "ON" : "…") +
      "\nNeuro: " + (window.AKSI_NEURO ? "ON" : "…") +
      "\nКора WebLLM: " + (cortexReady() ? "ON" : "OFF") +
      "\nПамять: " + memAll().length +
      "\nSeal: " + sealsAll().length +
      "\nСессия: " + history.length +
      "\naksilove@internet.ru";
  }
  async function ask(raw) {
    var q = String(raw != null ? raw : ($("q") && $("q").value) || "").trim();
    if (!q) return;
    if ($("q")) $("q").value = q;
    if ($("go")) $("go").disabled = true;
    if ($("out")) $("out").textContent = "…";
    if ($("meta")) $("meta").textContent = "";
    try {
      var r = await fullThink(q, { web: !!($("useWeb") && $("useWeb").checked), cortex: true });
      if ($("out")) $("out").textContent = r.answer || "—";
      if ($("meta"))
        $("meta").textContent = (r.source || "") + " · P=" + ((r.probability || 0) * 100).toFixed(0) + "% · seal " + (r.seal || "") + " · " + (r.cortex ? "кораON" : "кораOFF") + " · " + VER;
      lastSup = r.superposition || [];
      renderSup(); renderSeals();
    } catch (e) {
      if ($("out")) $("out").textContent = "Ошибка: " + (e.message || e);
    } finally {
      if ($("go")) $("go").disabled = false;
      status("");
    }
  }
  function showTab(name) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("on", p.id === "p-" + name); });
    document.querySelectorAll(".tab[data-tab], .bnav button[data-tab]").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-tab") === name);
    });
    if (name === "sup") renderSup();
    if (name === "mem") renderMem();
    if (name === "seal") renderSeals();
    if (name === "sys") renderSys();
  }
  async function ensureCortex() {
    status("Загрузка WebLLM (первый раз долго, Chrome + WebGPU)…");
    if (!window.AKSI_WEBLLM) await loadScript("/aksi-webllm.js?v=8");
    if (!window.AKSI_WEBLLM) throw new Error("WebLLM не загрузился");
    if (AKSI_WEBLLM.autoLoad)
      await AKSI_WEBLLM.autoLoad(function (info) {
        status(typeof info === "string" ? info : (info && (info.text || info.progress)) || "загрузка…");
      });
    else if (AKSI_WEBLLM.load) await AKSI_WEBLLM.load(null, function () {});
    status(cortexReady() ? "Кора готова — спрашивайте" : "Кора не поднялась (нужен WebGPU)");
    return cortexReady();
  }
  function boot() {
    if (!$("go")) return;
    if ($("ver")) $("ver").textContent = "АКСИ " + VER;
    $("go").onclick = function () { ask(); };
    if ($("q")) $("q").addEventListener("keydown", function (e) { if (e.key === "Enter") ask(); });
    document.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () { ask(b.getAttribute("data-q")); };
    });
    document.querySelectorAll(".tab[data-tab], .bnav button[data-tab]").forEach(function (t) {
      t.onclick = function () { showTab(t.getAttribute("data-tab")); };
    });
    if ($("memSave")) $("memSave").onclick = function () {
      var v = (($("memIn") && $("memIn").value) || "").trim(); if (!v) return;
      ask(/^запомни/i.test(v) ? v : "запомни: " + v);
      if ($("memIn")) $("memIn").value = "";
      showTab("mem");
    };
    if ($("memClear")) $("memClear").onclick = function () {
      if (confirm("Очистить память?")) { memWrite([]); renderMem(); }
    };
    if ($("cortexBtn")) $("cortexBtn").onclick = async function () {
      var btn = $("cortexBtn"); btn.disabled = true;
      try {
        var ok = await ensureCortex();
        btn.textContent = ok ? "Кора ON" : "Кора сбой";
      } catch (e) {
        status("Кора: " + (e.message || e));
        btn.textContent = "Кора сбой";
      } finally {
        btn.disabled = false;
        renderSys();
      }
    };
    ensureModules().then(function () { renderSys(); });
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
  if (typeof window !== "undefined") window.AKSI = { version: VER, think: fullThink, ask: ask };
})();
