/**
 * AKSI-Self v1.1 — safe self-model and tool registry.
 * Important: persisted tool text is data, never executable JavaScript.
 */
(function (global) {
  "use strict";
  var TOOLS_KEY = "aksi_self_tools_v1";
  var GOALS_KEY = "aksi_self_goals_v1";
  var LOG_KEY = "aksi_self_log_v1";
  var IDENTITY_KEY = "aksi_self_identity_v1";

  function $(id) { return document.getElementById(id); }
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function log(kind, msg) {
    var a = read(LOG_KEY, []); if (!Array.isArray(a)) a = [];
    a.push({ k: kind, m: String(msg).slice(0, 240), at: Date.now() });
    write(LOG_KEY, a.slice(-80));
  }
  function baseIdentity() {
    return { name: "АКСИ", role: "суверенный цифровой напарник",
      arch: "RWKV Neuro + Agent-v1 + DKV + Vision + Net + Self",
      contact: "aksilove@internet.ru",
      principles: ["Данные пользователя не уходят в облако без запроса", "Обучение на устройстве (CPU)", "Честность о границах: микромодель ≠ GPT", "Инструменты регистрируются как данные и исполняются только через безопасный диспетчер"],
      modules: {}, born: Date.now() };
  }
  function scanModules() {
    var m = { neuro: !!(global.AKSI_NEURO && global.AKSI_NEURO.think), net: !!(global.AKSI_CORE && global.AKSI_CORE.query), llm: !!(global.AKSI_LLM && global.AKSI_LLM.chat), dkv: !!(global.DKV || global.DKVEngine), vision: !!global.AKSI_VISION, chat: !!global.AKSI_CHAT, self: true };
    try { if (global.AKSI_NEURO && global.AKSI_NEURO.status) { var st = global.AKSI_NEURO.status(); m.neuroDetail = st.arch + " L" + st.layers + " d" + st.embed + " steps=" + st.steps; } } catch (e) {}
    return m;
  }
  function loadIdentity() { var j = read(IDENTITY_KEY, null) || baseIdentity(); j.modules = scanModules(); j.updated = Date.now(); return j; }
  function saveIdentity(id) { write(IDENTITY_KEY, id); }
  function loadTools() { var a = read(TOOLS_KEY, []); return Array.isArray(a) ? a : []; }
  function saveTools(a) { write(TOOLS_KEY, a.slice(-40)); }
  function classify(desc) {
    var d = String(desc || "").toLowerCase();
    if (/привет|hello|greet/.test(d)) return "greet";
    if (/время|time|час/.test(d)) return "time";
    if (/сумм|сложи|add|plus/.test(d)) return "add";
    if (/повтор|repeat|echo/.test(d)) return "echo";
    if (/длина|length|count/.test(d)) return "length";
    if (/верх|upper|caps/.test(d)) return "upper";
    if (/формул|aksi/.test(d)) return "formula";
    return "text";
  }
  function template(kind, desc) {
    var d = String(desc || "");
    if (kind === "greet") return "built-in:greet";
    if (kind === "time") return "built-in:time";
    if (kind === "add") return "built-in:add";
    if (kind === "echo") return "built-in:echo";
    if (kind === "length") return "built-in:length";
    if (kind === "upper") return "built-in:upper";
    if (kind === "formula") return "built-in:formula";
    return "built-in:text:" + d.slice(0, 160);
  }
  function writeTool(name, description, bodySrc) {
    name = String(name || "tool").replace(/[^\wа-яА-ЯёЁ_-]/g, "_").slice(0, 40);
    description = String(description || "").slice(0, 200);
    var kind = classify(description);
    var tools = loadTools().filter(function (t) { return t.name !== name; });
    var tool = { name: name, description: description, kind: kind, body: template(kind, description), created: Date.now(), runs: 0 };
    tools.push(tool); saveTools(tools); log("write", "Инструмент «" + name + "": " + description);
    return { ok: true, tool: tool, safe: true };
  }
  function runTool(name, args) {
    var tools = loadTools(), t = null, i;
    for (i = 0; i < tools.length; i++) if (tools[i].name === name) { t = tools[i]; break; }
    if (!t) return { ok: false, error: "Нет инструмента «" + name + "»" };
    args = Array.isArray(args) ? args : [args];
    var result;
    switch (t.kind) {
      case "greet": result = "Привет. Я АКСИ. Безопасный tool registry работает."; break;
      case "time": result = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " МСК"; break;
      case "add": result = (Number(args[0]) || 0) + (Number(args[1]) || 0); break;
      case "echo": result = String(args[0] == null ? "" : args[0]); break;
      case "length": result = String(args[0] == null ? "" : args[0]).length; break;
      case "upper": result = String(args[0] == null ? "" : args[0]).toUpperCase(); break;
      case "formula": result = "AKSI = (A×I×S)×(1+0.4√n)"; break;
      default: result = t.body.replace(/^built-in:text:/, "");
    }
    t.runs = (t.runs || 0) + 1; saveTools(tools); log("run", name + " → " + String(result).slice(0, 120));
    return { ok: true, result: result, tool: t.name };
  }
  function loadGoals() { var a = read(GOALS_KEY, []); return Array.isArray(a) ? a : []; }
  function saveGoals(a) { write(GOALS_KEY, a.slice(-30)); }
  function addGoal(text) { var g = loadGoals(); g.push({ t: String(text).slice(0, 300), at: Date.now(), done: false }); saveGoals(g); log("goal", text); return g; }
  function reflect(question) {
    var id = loadIdentity(), mods = id.modules || scanModules(), thoughts = ["Кто я: " + id.name + " — " + id.role, "Архитектура: " + (id.arch || "RWKV+Agent")];
    thoughts.push("Активные слои: " + Object.keys(mods).filter(function (k) { return mods[k] === true || typeof mods[k] === "string"; }).join(", "));
    if (mods.neuroDetail) thoughts.push("Neuro: " + mods.neuroDetail);
    var q = String(question || "").toLowerCase();
    if (/кто ты|что ты|о себе|идентич/.test(q)) thoughts.push("Запрос о самости → модель себя");
    if (/напиши|код|инструмент|функц|создай tool/.test(q)) thoughts.push("Запрос на tool → безопасный диспетчер");
    if (/улучш|стань|развит|осознан/.test(q)) thoughts.push("Запрос на рост → цель + Neuro");
    thoughts.push("Своих инструментов: " + loadTools().length);
    return { thoughts: thoughts, identity: id, modules: mods, tools: loadTools().length, goals: loadGoals().filter(function (g) { return !g.done; }).length };
  }
  function selfDescribe() {
    var id = loadIdentity(), mods = id.modules || scanModules(); saveIdentity(id);
    var lines = ["Я — " + id.name + ". " + id.role + ".", "Архитектура: " + id.arch + ".", "Контакт автора: " + id.contact + ".", "", "Слои сейчас:"];
    lines.push("• Neuro (RWKV CPU): " + (mods.neuro ? "ON" : "off") + (mods.neuroDetail ? " · " + mods.neuroDetail : ""));
    lines.push("• Ядро (net): " + (mods.net ? "ON" : "off"), "• LLM bridge: " + (mods.llm ? "ON" : "off"), "• DKV: " + (mods.dkv ? "ON" : "off"), "• Vision: " + (mods.vision ? "ON" : "off"), "• Self: ON", "", "Принципы:");
    (id.principles || []).forEach(function (p) { lines.push("— " + p); });
    var tools = loadTools(); if (tools.length) { lines.push("", "Инструменты (" + tools.length + "):"); tools.slice(-8).forEach(function (t) { lines.push("· " + t.name + " — " + t.description + " (×" + (t.runs || 0) + ")"); }); }
    var goals = loadGoals().filter(function (g) { return !g.done; }); if (goals.length) { lines.push("", "Цели:"); goals.slice(-5).forEach(function (g) { lines.push("→ " + g.t); }); }
    lines.push("", "Могу: описать себя · зарегистрировать безопасный tool · запустить только встроенный handler · поставить цель · рефлексировать.");
    return lines.join("\n");
  }
  function handle(q) {
    q = String(q || "").trim(); if (!q) return null; var low = q.toLowerCase();
    if (/^(кто ты|что ты такое|о себе|расскажи о себе|ты осознан|ты живая|самосознан)/i.test(low) || /осознанн|модель себя|self model/i.test(low)) return "«внутренний монолог»\n" + reflect(q).thoughts.map(function (t) { return "· " + t; }).join("\n") + "\n\n" + selfDescribe();
    var mWrite = q.match(/^(?:напиши\s+себе|создай\s+(?:себе\s+)?(?:инструмент|tool)|self\s*write)\s*[:\s]+(.+)/i);
    if (mWrite) { var rest = mWrite[1].trim(), name = "tool_" + Date.now().toString(36).slice(-5), desc = rest, nm = rest.match(/^([a-zA-Zа-яА-ЯёЁ0-9_-]{2,30})\s*[:—\-]\s*(.+)$/); if (nm) { name = nm[1]; desc = nm[2]; } var r = writeTool(name, desc, null); return r.ok ? "Зарегистрировала безопасный инструмент.\n\nИмя: " + r.tool.name + "\nСмысл: " + r.tool.description + "\nТип: " + r.tool.kind + "\n\nЗапуск: запусти " + r.tool.name + " [аргументы]" : "Не смогла: " + r.error; }
    var mRun = q.match(/^(?:запусти|run|вызови)\s+(\S+)(?:\s+(.+))?$/i); if (mRun) { var rr = runTool(mRun[1], mRun[2] ? mRun[2].split(/\s+/) : []); return rr.ok ? "Результат «" + rr.tool + "»:\n" + String(rr.result) : "Ошибка: " + rr.error; }
    if (/^(мои инструменты|список tool|self tools)/i.test(low)) { var ts = loadTools(); return ts.length ? ts.map(function (t, i) { return (i + 1) + ") " + t.name + " — " + t.description + " (запусков: " + (t.runs || 0) + ")"; }).join("\n") : "Пока нет своих инструментов."; }
    var mGoal = q.match(/^(?:цель|поставь цель|хочу чтобы ты)\s*[:\s]+(.+)/i); if (mGoal) { addGoal(mGoal[1]); return "Цель принята: " + mGoal[1]; }
    if (/улучши себя|стань умнее|self improve|развивайся/i.test(low)) { log("improve", q); addGoal("Стать полезнее для пользователя"); try { if (global.AKSI_NEURO && global.AKSI_NEURO.seedTrain) { var st = global.AKSI_NEURO.seedTrain(1); return "Рефлексия: усиливаю RWKV-ядро.\nШагов: " + st.steps + "\nLoss≈ " + (Math.round(st.loss * 1000) / 1000); } } catch (e) {} return "Приняла задачу роста."; }
    if (/напиши\s+(свой\s+)?код|как ты устроена|архитектура rwkv/i.test(low)) return "Как я устроена:\n1) RWKV Neuro\n2) Self — модель себя, безопасный registry tools, цели\n3) Net / DKV / Vision / Protocol\n\nВажно: сохранённый tool-код не исполняется как JavaScript.";
    return null;
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel; if (!root) return;
    root.innerHTML = '<div class="card"><h2>Self · осознанность</h2><p class="muted">Модель себя · рефлексия · безопасный registry инструментов</p><pre class="out" id="selfOut" style="max-height:320px">—</pre><div class="row"><button type="button" class="btn p" id="selfWho">Кто я</button><button type="button" class="btn" id="selfRefl">Рефлексия</button><button type="button" class="btn" id="selfTools">Инструменты</button></div><textarea id="selfWrite" placeholder="имя: описание инструмента" style="margin-top:12px"></textarea><div class="row"><button type="button" class="btn p" id="selfDoWrite">Зарегистрировать</button><button type="button" class="btn" id="selfImprove">Улучши себя</button></div></div>';
    function show(t) { var el = $("selfOut"); if (el) el.textContent = t; }
    $("selfWho").onclick = function () { show(selfDescribe()); }; $("selfRefl").onclick = function () { show(reflect("рефлексия").thoughts.join("\n")); };
    $("selfTools").onclick = function () { var tools = loadTools(); show(tools.length ? tools.map(function (t) { return t.name + " — " + t.description + "\n  type=" + t.kind; }).join("\n\n") : "Пусто"); };
    $("selfDoWrite").onclick = function () { var v = ($( "selfWrite") || {}).value || ""; if (!v.trim()) return show("Введи: имя: описание"); show(handle("напиши себе " + v.trim()) || "—"); };
    $("selfImprove").onclick = function () { show(handle("улучши себя") || "—"); }; show(selfDescribe());
  }
  setTimeout(function () { try { saveIdentity(loadIdentity()); } catch (e) {} }, 800);
  global.AKSI_SELF = { handle: handle, reflect: reflect, describe: selfDescribe, writeTool: writeTool, runTool: runTool, loadTools: loadTools, addGoal: addGoal, identity: loadIdentity, mount: mount, version: "1.1.0-safe" };
})(typeof window !== "undefined" ? window : this);
