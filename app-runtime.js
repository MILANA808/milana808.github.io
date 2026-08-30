(function () {
  "use strict";
  var MEM_KEY = "aksi_whole_mem_v3";
  var MAIN = { home: 1, chat: 1, local: 1, trust: 1, mem: 1, lab: 1 };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function goTab(t) {
    if (!t || !MAIN[t]) return;
    document.querySelectorAll(".bnav [data-tab]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-tab") === t);
    });
    document.querySelectorAll(".stage .panel").forEach(function (p) {
      p.classList.toggle("on", p.id === "tab-" + t);
    });
    var c = $("composer");
    if (c) c.classList.toggle("on", t === "chat");
    var s = $("stage"); if (s) s.scrollTop = 0;
    if (t === "trust") refreshPq();
    if (t === "mem") renderMem();
    if (t === "local") refreshLocalCaps();
    if (t === "home") refreshHome();
  }

  function loadMem() {
    try {
      var a = JSON.parse(localStorage.getItem(MEM_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function saveMem(a) {
    try { localStorage.setItem(MEM_KEY, JSON.stringify((a || []).slice(-200))); } catch (e) {}
  }
  function renderMem() {
    var a = loadMem();
    var n = $("memN"); if (n) n.textContent = String(a.length);
    var kv = $("kvMem"); if (kv) kv.textContent = String(a.length);
    var list = $("memList"); if (!list) return;
    list.innerHTML = "";
    if (!a.length) {
      list.innerHTML = '<p class="muted">Пока пусто. Напиши «запомни: …» в чате или добавь факт выше.</p>';
      return;
    }
    a.slice().reverse().slice(0, 50).forEach(function (item) {
      var d = document.createElement("div");
      d.className = "muted";
      d.style.cssText = "padding:10px 0;border-bottom:1px solid var(--line)";
      d.textContent = typeof item === "string" ? item : (item.text || JSON.stringify(item));
      list.appendChild(d);
    });
  }

  function addMsg(role, text, meta) {
    var th = $("thread"); if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    d.innerHTML = '<div class="bub">' + esc(text) + (meta ? '<div class="meta">' + esc(meta) + "</div>" : "") + "</div>";
    th.appendChild(d);
    th.scrollTop = th.scrollHeight;
  }

  function moduleMap() {
    return {
      compose: !!(window.AKSI_COMPOSE && AKSI_COMPOSE.think),
      neuro: !!(window.AKSI_NEURO && AKSI_NEURO.think),
      algo: !!(window.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate),
      pq: !!(window.AKSI_PQ && AKSI_PQ.status),
      engine: !!(window.AKSI_LOCAL_ENGINE && AKSI_LOCAL_ENGINE.ask),
      quantum: !!(window.AKSI_QUANTUM),
      selfArch: !!(window.AKSI_SELF_ARCH && AKSI_SELF_ARCH.answer)
    };
  }

  function refreshHome() {
    var m = moduleMap();
    var on = Object.keys(m).filter(function (k) { return m[k]; });
    var kn = $("kvNeuro");
    if (kn) kn.textContent = m.compose ? "Composer" : (m.neuro ? "Neuro" : "core");
    var km = $("kvMem"); if (km) km.textContent = String(loadMem().length);
    var kmod = $("kvMods"); if (kmod) kmod.textContent = String(on.length);
    var box = $("modStats");
    if (box) {
      box.innerHTML = "";
      [
        ["Composer", m.compose],
        ["Neuro", m.neuro],
        ["ADIA", m.algo],
        ["PQ", m.pq],
        ["Engine", m.engine],
        ["Self-Arch", m.selfArch]
      ].forEach(function (row) {
        var el = document.createElement("div");
        el.className = "stat";
        el.innerHTML = "<b>" + (row[1] ? "on" : "off") + "</b><span>" + row[0] + "</span>";
        el.style.color = row[1] ? "var(--ok)" : "var(--muted)";
        box.appendChild(el);
      });
    }
  }

  function coreAnswer(q) {
    q = String(q || "").trim();
    if (!q) return { text: "", meta: "empty" };

    if (/^запомни[:：\s]/i.test(q)) {
      var fact = q.replace(/^запомни[:：\s]*/i, "").trim();
      if (fact) {
        var a = loadMem();
        a.push({ text: fact, ts: Date.now() });
        saveMem(a);
        renderMem();
        if (window.AKSI_NEURO && typeof AKSI_NEURO.learn === "function") {
          try { AKSI_NEURO.learn(fact); } catch (e) {}
        }
        if (window.AKSI_COMPOSE && typeof AKSI_COMPOSE.teach === "function") {
          try { AKSI_COMPOSE.teach("запомни: " + fact); } catch (e) {}
        }
        return { text: "Запомнила: " + fact, meta: "memory · teach" };
      }
    }

    if (window.AKSI_SELF_ARCH && typeof AKSI_SELF_ARCH.answer === "function") {
      try {
        var sa = AKSI_SELF_ARCH.answer(q);
        if (sa && sa.text) {
          return { text: sa.text, meta: sa.meta || "self-arch" };
        }
      } catch (e) {}
    }

    if (window.AKSIKnowledge && typeof AKSIKnowledge.search === "function") {
      try {
        var lowQ = q.toLowerCase();
        if (/архитектур|pipeline|пайплайн|модул|протокол|живой разум|adia|eqs|как устроен|стек|границ|крипто|pq |did|trust/.test(lowQ)) {
          var k = AKSIKnowledge.search(q);
          if (k && k.body) {
            return { text: k.title + "\n\n" + k.body, meta: "knowledge · product" };
          }
        }
      } catch (e) {}
    }

    if (window.AKSI_COMPOSE && typeof AKSI_COMPOSE.think === "function") {
      try {
        var c = AKSI_COMPOSE.think(q);
        if (c && c.text) {
          return {
            text: c.text,
            meta: "compose · " + (c.mode || "gen") + (c.confidence != null ? " · conf " + Number(c.confidence).toFixed(2) : "")
          };
        }
      } catch (e) {}
    }

    if (window.AKSI_NEURO && typeof AKSI_NEURO.think === "function") {
      try {
        var n = AKSI_NEURO.think(q);
        if (n && n.text) {
          return {
            text: n.text,
            meta: "neuro · " + (n.mode || "hit") + (n.score != null ? " · " + Number(n.score).toFixed(2) : "")
          };
        }
      } catch (e) {}
    }

    var low = q.toLowerCase();
    if (/кто ты|who are you|что ты такое/i.test(low)) {
      if (window.AKSI_SELF_ARCH && AKSI_SELF_ARCH.overview) {
        return { text: AKSI_SELF_ARCH.overview(), meta: "self-arch · overview" };
      }
      return {
        text: "Я АКСИ — локальный offline runtime. Composer + Neuro, ADIA, hybrid crypto. Контакт: aksilove@internet.ru",
        meta: "core"
      };
    }
    if (/без (сети|интернета)|offline|оффлайн/i.test(low)) {
      return {
        text: "Да. Offline по умолчанию: Composer, Neuro, локальная память. Сеть не нужна для базовых ответов и «запомни:».",
        meta: "core"
      };
    }
    if (/статус|status/i.test(low)) {
      var m = moduleMap();
      return {
        text: "Статус:\n• Composer: " + (m.compose ? "on" : "off") +
          "\n• Neuro: " + (m.neuro ? "on" : "off") +
          "\n• ADIA: " + (m.algo ? "on" : "off") +
          "\n• PQ: " + (m.pq ? "on" : "off") +
          "\n• Self-Arch: " + (m.selfArch ? "on" : "off") +
          "\n• Память: " + loadMem().length,
        meta: "status"
      };
    }
    if (/adia|eqs|метрик/i.test(low)) {
      return {
        text: "ADIA / Metrics Engine: EQS, QCLI, H_eff — инженерные сигналы. Integrity = FNV-hash; подпись = ECDSA / hybrid PQ.",
        meta: "adia"
      };
    }
    if (/что умеешь|возможности|features/i.test(low)) {
      return {
        text: "Локальный чат, «запомни:», pipeline Local AI, ADIA, hybrid PQ, память, MATRIX / Protocol. Спроси «как устроена АКСИ».",
        meta: "core"
      };
    }

    var mem = loadMem();
    if (mem.length) {
      var hits = mem.filter(function (it) {
        var t = (typeof it === "string" ? it : (it.text || "")).toLowerCase();
        return t && low.split(/\s+/).some(function (w) { return w.length > 3 && t.indexOf(w) !== -1; });
      }).slice(0, 3);
      if (hits.length) {
        return {
          text: "Из локальной памяти:\n• " + hits.map(function (h) {
            return typeof h === "string" ? h : h.text;
          }).join("\n• "),
          meta: "memory · retrieve"
        };
      }
    }

    return {
      text: "Принято. Добавь знание «запомни: факт» или спроси про архитектуру: pipeline, ADIA, protocol.",
      meta: "fallback"
    };
  }

  function sealMetrics(q, answer, source) {
    var meta = source || "local";
    try {
      if (window.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
        var m = AKSI_ALGORITHM.evaluate(q, answer, { offline: true, source: source || "chat", seal: false });
        var met = m.metrics || m;
        var eqs = met.EQS != null ? met.EQS : met.eqs;
        if (eqs != null) {
          meta += " · EQS " + eqs;
          var ke = $("kvEqs"); if (ke) ke.textContent = String(eqs);
        }
      }
    } catch (e) {}
    return meta;
  }

  function askChat(q) {
    if (!q) return;
    addMsg("me", q);
    var r = coreAnswer(q);
    var meta = sealMetrics(q, r.text, r.meta);
    addMsg("ai", r.text, meta);
    refreshHome();
  }

  function refreshLocalCaps() {
    var el = $("localCaps");
    if (!el) return;
    var m = moduleMap();
    var parts = [];
    if (m.compose) parts.push("Composer");
    if (m.neuro) parts.push("Neuro");
    if (m.engine) parts.push("Engine");
    if (m.algo) parts.push("ADIA");
    if (m.selfArch) parts.push("Self-Arch");
    el.textContent = (parts.length ? parts.join(" · ") : "базовое ядро") + " · сеть OFF";
  }

  function setPipe(active) {
    var map = {
      "input.received": "input",
      "memory.retrieve": "memory",
      "memory.write": "memory",
      "context.built": "memory",
      "kernel.compose": "kernel",
      "kernel.neuro": "kernel",
      "kernel.offline": "kernel",
      "inference.start": "kernel",
      "inference.complete": "kernel",
      "quantum.seal": "quantum",
      "metrics.eval": "metrics",
      "verification.complete": "verify"
    };
    var order = ["input", "memory", "kernel", "quantum", "metrics", "verify"];
    var cur = map[active];
    var idx = order.indexOf(cur);
    document.querySelectorAll("#pipe .step").forEach(function (el) {
      var s = el.getAttribute("data-s");
      var i = order.indexOf(s);
      el.classList.remove("on", "done");
      if (idx >= 0 && i < idx) el.classList.add("done");
      if (i === idx) el.classList.add("on");
      if (idx < 0 && s === "input") el.classList.add("on");
    });
  }

  function localTrace(type, data) {
    setPipe(type);
    var t = $("localTrace"); if (!t) return;
    var d = document.createElement("div");
    d.className = "event";
    var payload = typeof data === "string" ? data : JSON.stringify(data || {}).slice(0, 140);
    d.innerHTML = "<b>" + esc(type) + "</b> · " + esc(payload);
    t.prepend(d);
  }

  async function runLocal() {
    var q = ($("localQ") && $("localQ").value || "").trim();
    if (!q) return;
    $("localAns").textContent = "Обработка…";
    $("localMeta").textContent = "";
    localTrace("input.received", { chars: q.length });
    try {
      localTrace("memory.retrieve", { items: loadMem().length });
      if (window.AKSI_LOCAL_ENGINE && typeof AKSI_LOCAL_ENGINE.ask === "function") {
        var unsub = AKSI_LOCAL_ENGINE.subscribe(function (e) {
          localTrace(e.type || "engine", e.data || {});
        });
        var r = await AKSI_LOCAL_ENGINE.ask(q, { useMemory: true });
        unsub();
        $("localAns").textContent = r.text || "—";
        var parts = ["источник: " + (r.source || "engine")];
        if (r.latencyMs != null) parts.push(r.latencyMs + " мс");
        if (r.metrics && (r.metrics.EQS != null || r.metrics.eqs != null)) {
          parts.push("EQS " + (r.metrics.EQS != null ? r.metrics.EQS : r.metrics.eqs));
        }
        $("localMeta").textContent = parts.join(" · ");
        localTrace("verification.complete", { source: r.source || "engine" });
      } else {
        localTrace("kernel.compose", {});
        var r2 = coreAnswer(q);
        localTrace("metrics.eval", {});
        var meta = sealMetrics(q, r2.text, r2.meta);
        localTrace("verification.complete", { source: r2.meta });
        $("localAns").textContent = r2.text;
        $("localMeta").textContent = meta + " · offline";
      }
      refreshHome();
    } catch (e) {
      $("localAns").textContent = "Ошибка: " + (e.message || e);
      localTrace("error", String(e.message || e));
    }
  }

  function refreshPq() {
    var el = $("pqStatus"); if (!el) return;
    if (!window.AKSI_PQ || typeof AKSI_PQ.status !== "function") {
      el.textContent = "AKSI_PQ не загружен. Ctrl+F5 или /aksi-pq.js";
      return;
    }
    el.textContent = "загрузка…";
    AKSI_PQ.status().then(function (s) {
      el.textContent = JSON.stringify(s, null, 2);
    }).catch(function (e) {
      el.textContent = String(e.message || e);
    });
  }

  function boot() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-tab]");
      if (t) {
        var id = t.getAttribute("data-tab");
        if (id) goTab(id);
      }
      var ask = e.target.closest && e.target.closest("[data-ask]");
      if (ask) {
        goTab("chat");
        askChat(ask.getAttribute("data-ask"));
      }
    }, true);

    $("send") && ($("send").onclick = function () {
      var v = $("inp").value.trim();
      if (!v) return;
      $("inp").value = "";
      askChat(v);
    });
    $("inp") && $("inp").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        $("send").click();
      }
    });

    $("localAsk") && ($("localAsk").onclick = runLocal);
    $("localRemember") && ($("localRemember").onclick = function () {
      var q = ($("localQ") && $("localQ").value || "").trim();
      if (!q) return;
      var a = loadMem();
      a.push({ text: q, ts: Date.now() });
      saveMem(a);
      renderMem();
      $("localQ").value = "";
      localTrace("memory.write", { chars: q.length });
      refreshHome();
    });

    $("btnTeach") && ($("btnTeach").onclick = function () {
      var v = ($("teachIn") && $("teachIn").value || "").trim();
      if (!v) return;
      var a = loadMem();
      a.push({ text: v, ts: Date.now() });
      saveMem(a);
      renderMem();
      $("teachIn").value = "";
      if (window.AKSI_NEURO && AKSI_NEURO.learn) try { AKSI_NEURO.learn(v); } catch (e) {}
      refreshHome();
    });
    $("btnWipe") && ($("btnWipe").onclick = function () {
      if (confirm("Очистить локальную память?")) {
        saveMem([]);
        renderMem();
        refreshHome();
      }
    });

    $("pqBoot") && ($("pqBoot").onclick = function () {
      if (!window.AKSI_PQ) return refreshPq();
      AKSI_PQ.ensureIdentity().then(function () { refreshPq(); }).catch(function (e) {
        $("pqStatus").textContent = String(e.message || e);
      });
    });
    $("pqExport") && ($("pqExport").onclick = function () {
      if (!window.AKSI_PQ) return;
      AKSI_PQ.ensureIdentity().then(function () {
        var p = AKSI_PQ.publicPack();
        $("pqEnv").value = JSON.stringify(p, null, 2);
        refreshPq();
      });
    });
    $("pqSeal") && ($("pqSeal").onclick = function () {
      if (!window.AKSI_PQ) return;
      var peer;
      try { peer = JSON.parse($("pqPeer").value || "{}"); } catch (e) { return alert("peer JSON invalid"); }
      AKSI_PQ.seal($("pqMsg").value || "", peer, { eqs: 0.55 }).then(function (env) {
        $("pqEnv").value = JSON.stringify(env, null, 2);
        refreshPq();
      }).catch(function (e) { alert(e.message || e); });
    });
    $("pqOpen") && ($("pqOpen").onclick = function () {
      if (!window.AKSI_PQ) return;
      var env;
      try { env = JSON.parse($("pqEnv").value || "{}"); } catch (e) { return alert("envelope invalid"); }
      AKSI_PQ.open(env).then(function (r) {
        $("pqMsg").value = r.text;
        refreshPq();
      }).catch(function (e) { alert(e.message || e); });
    });

    $("btnMetrics") && ($("btnMetrics").onclick = function () {
      if (!window.AKSI_ALGORITHM) {
        $("labMetrics").textContent = "algorithm not loaded";
        return;
      }
      var r = AKSI_ALGORITHM.evaluate("lab", "АКСИ local metrics sample", { offline: true, source: "lab", seal: false });
      $("labMetrics").textContent = JSON.stringify(r.metrics || r, null, 2);
      var m = r.metrics || r;
      if ($("kvEqs") && (m.EQS != null || m.eqs != null)) $("kvEqs").textContent = String(m.EQS != null ? m.EQS : m.eqs);
    });

    if ($("thread") && !$("thread").children.length) {
      addMsg(
        "ai",
        "Здравствуйте. АКСИ — рабочий offline-прототип.\nВкладки: Home · Чат · Local · Trust · Память · Lab.\nСпросите: «как устроена АКСИ», «pipeline», «ADIA», «протокол».\nОбучение: «запомни: факт». Контакт: aksilove@internet.ru",
        "self-arch · boot"
      );
    }

    renderMem();
    refreshLocalCaps();
    refreshHome();
    goTab("home");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
