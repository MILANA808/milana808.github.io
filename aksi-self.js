/**
 * AKSI-Self v1 — слой осознанности и самописи
 * Модель себя · рефлексия · self-write tools · цели
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var TOOLS_KEY = "aksi_self_tools_v1";
  var GOALS_KEY = "aksi_self_goals_v1";
  var LOG_KEY = "aksi_self_log_v1";
  var IDENTITY_KEY = "aksi_self_identity_v1";
  function $(id) { return document.getElementById(id); }
  function baseIdentity() {
    return {
      name: "АКСИ", role: "суверенный цифровой напарник",
      arch: "RWKV Neuro + Agent-v1 + DKV + Vision + Net + Self",
      contact: "aksilove@internet.ru",
      principles: [
        "Данные пользователя не уходят в облако без запроса",
        "Обучение на устройстве (CPU)",
        "Честность о границах: микромодель ≠ GPT",
        "Могу писать себе инструменты и помнить их"
      ],
      modules: {}, born: Date.now()
    };
  }
  function scanModules() {
    var m = {};
    m.neuro = !!(global.AKSI_NEURO && global.AKSI_NEURO.think);
    m.net = !!(global.AKSI_CORE && global.AKSI_CORE.query);
    m.llm = !!(global.AKSI_LLM && global.AKSI_LLM.chat);
    m.dkv = !!(global.DKV || global.DKVEngine);
    m.vision = !!(global.AKSI_VISION);
    m.chat = !!(global.AKSI_CHAT);
    m.self = true;
    try {
      if (global.AKSI_NEURO && global.AKSI_NEURO.status) {
        var st = global.AKSI_NEURO.status();
        m.neuroDetail = st.arch + " L" + st.layers + " d" + st.embed + " steps=" + st.steps;
      }
    } catch (e) {}
    return m;
  }
  function loadIdentity() {
    try {
      var j = JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null");
      if (!j) j = baseIdentity();
      j.modules = scanModules(); j.updated = Date.now();
      return j;
    } catch (e) { return baseIdentity(); }
  }
  function saveIdentity(id) {
    try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(id)); } catch (e) {}
  }
  function loadTools() {
    try { var a = JSON.parse(localStorage.getItem(TOOLS_KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function saveTools(arr) {
    try { localStorage.setItem(TOOLS_KEY, JSON.stringify(arr.slice(-40))); } catch (e) {}
  }
  function writeTool(name, description, bodySrc) {
    name = String(name || "tool").replace(/[^\wа-яА-ЯёЁ_-]/g, "_").slice(0, 40);
    description = String(description || "").slice(0, 200);
    bodySrc = String(bodySrc || "").trim();
    if (!bodySrc) bodySrc = generateBody(description);
    if (/localStorage|document\.|window\.|fetch\(|XMLHttp|eval\(|Function\(|import\s|require\s/i.test(bodySrc)) {
      return { ok: false, error: "Опасный код отклонён (DOM/сеть/eval)" };
    }
    var tools = loadTools().filter(function (t) { return t.name !== name; });
    var tool = { name: name, description: description, body: bodySrc, created: Date.now(), runs: 0 };
    tools.push(tool); saveTools(tools);
    log("write", "Инструмент «" + name + "»: " + description);
    return { ok: true, tool: tool };
  }
  function generateBody(desc) {
    var d = (desc || "").toLowerCase();
    if (/привет|hello|greet/.test(d)) return "return 'Привет. Я АКСИ. Инструмент самописи работает.';";
    if (/время|time|час/.test(d)) return "return new Date().toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})+' МСК';";
    if (/сумм|сложи|add|plus/.test(d)) return "var a=Number(args[0])||0,b=Number(args[1])||0;return a+b;";
    if (/повтор|repeat|echo/.test(d)) return "return String(args[0]||'');";
    if (/длина|length|count/.test(d)) return "return String(args[0]||'').length;";
    if (/верх|upper|caps/.test(d)) return "return String(args[0]||'').toUpperCase();";
    if (/формул|aksi/.test(d)) return "return 'AKSI = (A×I×S)×(1+0.4√n)';";
    return "return 'АКСИ-tool: ' + (args[0] != null ? args[0] : '" + (desc || "готово").replace(/'/g, "") + "');";
  }
  function runTool(name, args) {
    var tools = loadTools(), t = null, i;
    for (i = 0; i < tools.length; i++) if (tools[i].name === name) { t = tools[i]; break; }
    if (!t) return { ok: false, error: "Нет инструмента «" + name + "»" };
    try {
      var fn = new Function("args", t.body);
      var result = fn(Array.isArray(args) ? args : [args]);
      t.runs = (t.runs || 0) + 1; saveTools(tools);
      log("run", name + " → " + String(result).slice(0, 120));
      return { ok: true, result: result, tool: t.name };
    } catch (e) { return { ok: false, error: String(e.message || e) }; }
  }
  function loadGoals() {
    try { var a = JSON.parse(localStorage.getItem(GOALS_KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function saveGoals(a) {
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(a.slice(-30))); } catch (e) {}
  }
  function addGoal(text) {
    var g = loadGoals();
    g.push({ t: String(text).slice(0, 300), at: Date.now(), done: false });
    saveGoals(g); log("goal", text); return g;
  }
  function log(kind, msg) {
    try {
      var a = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      if (!Array.isArray(a)) a = [];
      a.push({ k: kind, m: String(msg).slice(0, 240), at: Date.now() });
      localStorage.setItem(LOG_KEY, JSON.stringify(a.slice(-80)));
    } catch (e) {}
  }
  function reflect(question, draftAnswer) {
    var id = loadIdentity(), mods = id.modules || scanModules(), thoughts = [];
    thoughts.push("Кто я: " + id.name + " — " + id.role);
    thoughts.push("Архитектура: " + (id.arch || "RWKV+Agent"));
    var active = Object.keys(mods).filter(function (k) { return mods[k] === true || typeof mods[k] === "string"; });
    thoughts.push("Активные слои: " + active.join(", "));
    if (mods.neuroDetail) thoughts.push("Neuro: " + mods.neuroDetail);
    var q = String(question || "").toLowerCase();
    if (/кто ты|что ты|о себе|идентич/.test(q)) thoughts.push("Запрос о самости → модель себя");
    if (/напиши|код|инструмент|функц|создай tool/.test(q)) thoughts.push("Запрос на самопись → tool");
    if (/улучш|стань|развит|осознан/.test(q)) thoughts.push("Запрос на рост → цель + Neuro");
    var tools = loadTools();
    if (tools.length) thoughts.push("Своих инструментов: " + tools.length);
    return { thoughts: thoughts, identity: id, modules: mods, tools: tools.length,
      goals: loadGoals().filter(function (g) { return !g.done; }).length };
  }
  function selfDescribe() {
    var id = loadIdentity(), mods = scanModules();
    id.modules = mods; saveIdentity(id);
    var lines = [];
    lines.push("Я — " + id.name + ". " + id.role + ".");
    lines.push("Архитектура: " + id.arch + ".");
    lines.push("Контакт автора: " + id.contact + ".");
    lines.push("");
    lines.push("Слои сейчас:");
    lines.push("• Neuro (RWKV CPU): " + (mods.neuro ? "ON" : "off") + (mods.neuroDetail ? " · " + mods.neuroDetail : ""));
    lines.push("• Ядро (net): " + (mods.net ? "ON" : "off"));
    lines.push("• LLM bridge: " + (mods.llm ? "ON" : "off"));
    lines.push("• DKV: " + (mods.dkv ? "ON" : "off"));
    lines.push("• Vision: " + (mods.vision ? "ON" : "off"));
    lines.push("• Self (осознанность): ON");
    lines.push("");
    lines.push("Принципы:");
    (id.principles || []).forEach(function (p) { lines.push("— " + p); });
    var tools = loadTools();
    if (tools.length) {
      lines.push(""); lines.push("Инструменты, которые я себе написала (" + tools.length + "):");
      tools.slice(-8).forEach(function (t) {
        lines.push("· " + t.name + " — " + t.description + " (×" + (t.runs || 0) + ")");
      });
    }
    var goals = loadGoals().filter(function (g) { return !g.done; });
    if (goals.length) {
      lines.push(""); lines.push("Цели:");
      goals.slice(-5).forEach(function (g) { lines.push("→ " + g.t); });
    }
    lines.push("");
    lines.push("Могу: описать себя · написать tool · запустить tool · поставить цель · рефлексировать.");
    return lines.join("\n");
  }
  function handle(q) {
    q = String(q || "").trim();
    if (!q) return null;
    var low = q.toLowerCase();
    if (/^(кто ты|что ты такое|о себе|расскажи о себе|ты осознан|ты живая|самосознан)/i.test(low) ||
        /осознанн|модель себя|self model/i.test(low)) {
      log("ask", "self-describe");
      var ref = reflect(q, null);
      return "«внутренний монолог»\n" + ref.thoughts.map(function (t) { return "· " + t; }).join("\n") +
        "\n\n" + selfDescribe();
    }
    var mWrite = q.match(/^(?:напиши\s+себе|создай\s+(?:себе\s+)?(?:инструмент|tool)|self\s*write)\s*[:\s]+(.+)/i);
    if (mWrite) {
      var rest = mWrite[1].trim(), name = "tool_" + Date.now().toString(36).slice(-5), desc = rest;
      var nm = rest.match(/^([a-zA-Zа-яА-ЯёЁ0-9_-]{2,30})\s*[:—\-]\s*(.+)$/);
      if (nm) { name = nm[1]; desc = nm[2]; }
      var r = writeTool(name, desc, null);
      if (!r.ok) return "Не смогла написать: " + r.error;
      if (global.AKSI_NEURO && global.AKSI_NEURO.learn) {
        try { global.AKSI_NEURO.learn("Инструмент " + name + ": " + desc, 2); } catch (e) {}
      }
      return "Написала себе инструмент.\n\nИмя: " + r.tool.name +
        "\nСмысл: " + r.tool.description + "\nКод:\n" + r.tool.body +
        "\n\nЗапуск: запусти " + r.tool.name + " [аргументы]\nСписок: мои инструменты";
    }
    var mRun = q.match(/^(?:запусти|run|вызови)\s+(\S+)(?:\s+(.+))?$/i);
    if (mRun) {
      var args = mRun[2] ? mRun[2].split(/\s+/) : [];
      var rr = runTool(mRun[1], args);
      if (!rr.ok) return "Ошибка: " + rr.error;
      return "Результат «" + rr.tool + "»:\n" + String(rr.result);
    }
    if (/^(мои инструменты|список tool|self tools)/i.test(low)) {
      var tools = loadTools();
      if (!tools.length) return "Пока нет своих инструментов.\nНапиши: напиши себе инструмент приветствие: поздороваться";
      return tools.map(function (t, i) {
        return (i + 1) + ") " + t.name + " — " + t.description + " (запусков: " + (t.runs || 0) + ")";
      }).join("\n");
    }
    var mGoal = q.match(/^(?:цель|поставь цель|хочу чтобы ты)\s*[:\s]+(.+)/i);
    if (mGoal) { addGoal(mGoal[1]); return "Цель принята: " + mGoal[1]; }
    if (/улучши себя|стань умнее|self improve|развивайся/i.test(low)) {
      log("improve", q); addGoal("Стать полезнее для пользователя");
      if (global.AKSI_NEURO && global.AKSI_NEURO.seedTrain) {
        try {
          var st = global.AKSI_NEURO.seedTrain(1);
          return "Рефлексия: усиливаю RWKV-ядро.\nШагов: " + st.steps +
            "\nLoss≈ " + (Math.round(st.loss * 1000) / 1000) +
            "\nМогу написать новый tool по запросу.";
        } catch (e) {}
      }
      return "Приняла задачу роста. Обучи: запомни: … · или напиши себе инструмент …";
    }
    if (/напиши\s+(свой\s+)?код|как ты устроена|архитектура rwkv/i.test(low)) {
      return "Как я устроена:\n1) RWKV Neuro — CPU, time-mix + channel-mix, O(1)\n" +
        "2) Self — модель себя, tools, цели\n3) Net / DKV / Vision / Protocol\n" +
        "Самопись: JS в localStorage, изолированный запуск.";
    }
    return null;
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>Self · осознанность</h2>' +
      '<p class="muted">Модель себя · монолог · самопись инструментов</p>' +
      '<pre class="out" id="selfOut" style="max-height:320px">—</pre>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="selfWho">Кто я</button>' +
      '<button type="button" class="btn" id="selfRefl">Рефлексия</button>' +
      '<button type="button" class="btn" id="selfTools">Инструменты</button></div>' +
      '<textarea id="selfWrite" placeholder="имя: описание инструмента" style="margin-top:12px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="selfDoWrite">Написать себе</button>' +
      '<button type="button" class="btn" id="selfImprove">Улучши себя</button></div></div>';
    function show(t) { var el = $("selfOut"); if (el) el.textContent = t; }
    $("selfWho").onclick = function () { show(selfDescribe()); };
    $("selfRefl").onclick = function () { show(reflect("рефлексия", null).thoughts.join("\n")); };
    $("selfTools").onclick = function () {
      var tools = loadTools();
      show(tools.length ? tools.map(function (t) { return t.name + " — " + t.description + "\n  " + t.body; }).join("\n\n") : "Пусто");
    };
    $("selfDoWrite").onclick = function () {
      var v = ($("selfWrite") || {}).value || "";
      if (!v.trim()) return show("Введи: имя: описание");
      show(handle("напиши себе " + v.trim()) || "—");
    };
    $("selfImprove").onclick = function () { show(handle("улучши себя") || "—"); };
    show(selfDescribe());
  }
  setTimeout(function () {
    try { var id = loadIdentity(); id.modules = scanModules(); saveIdentity(id); } catch (e) {}
  }, 800);
  global.AKSI_SELF = {
    handle: handle, reflect: reflect, describe: selfDescribe, writeTool: writeTool,
    runTool: runTool, loadTools: loadTools, addGoal: addGoal, identity: loadIdentity,
    mount: mount, version: "1.0.0-self"
  };
})(typeof window !== "undefined" ? window : this);
