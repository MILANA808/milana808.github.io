(function () {
  "use strict";

  var NQ = 6, DIM = 64;

  function C(re, im) { return { re: re || 0, im: im || 0 }; }
  function cabs2(a) { return a.re * a.re + a.im * a.im; }
  function zero() {
    var s = [], i;
    for (i = 0; i < DIM; i++) s.push(C(0, 0));
    s[0] = C(1, 0);
    return s;
  }
  function normalize(st) {
    var n = 0, i;
    for (i = 0; i < DIM; i++) n += cabs2(st[i]);
    n = Math.sqrt(n) || 1;
    for (i = 0; i < DIM; i++) { st[i].re /= n; st[i].im /= n; }
    return st;
  }
  function ry(st, q, theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2), bit = 1 << q;
    var out = st.map(function (x) { return C(x.re, x.im); });
    var i, j, a, b;
    for (i = 0; i < DIM; i++) {
      if (i & bit) continue;
      j = i | bit; a = st[i]; b = st[j];
      out[i] = C(c * a.re + s * b.re, c * a.im + s * b.im);
      out[j] = C(-s * a.re + c * b.re, -s * a.im + c * b.im);
    }
    return out;
  }
  function cnot(st, c, t) {
    var cb = 1 << c, tb = 1 << t;
    var out = st.map(function (x) { return C(x.re, x.im); });
    var i, j;
    for (i = 0; i < DIM; i++) {
      if ((i & cb) && !(i & tb)) { j = i | tb; out[i] = st[j]; out[j] = st[i]; }
    }
    return out;
  }
  function hash(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function encode(text) {
    var st = zero(), h = hash(text), i;
    for (i = 0; i < NQ; i++) {
      st = ry(st, i, ((h >> (i * 5)) & 31) / 31 * Math.PI * 2);
      if (i < NQ - 1) st = cnot(st, i, i + 1);
    }
    for (i = 0; i < Math.min(text.length, 12); i++) {
      st = ry(st, i % NQ, (text.charCodeAt(i) % 97) / 97 * Math.PI);
      if (i % 2) st = cnot(st, i % NQ, (i + 1) % NQ);
    }
    return normalize(st);
  }
  function probs(st) { return st.map(cabs2); }
  function entropy(p) {
    var e = 0, i;
    for (i = 0; i < p.length; i++) if (p[i] > 1e-12) e -= p[i] * Math.log2(p[i]);
    return e;
  }
  function sample(p, rng) {
    var r = rng(), acc = 0, i;
    for (i = 0; i < p.length; i++) { acc += p[i]; if (r <= acc) return i; }
    return p.length - 1;
  }
  function bits(idx) { return (idx >>> 0).toString(2).padStart(NQ, "0"); }
  function mulberry(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }

  var BANK = {
    open: [
      "С точки зрения контура АКСИ",
      "В этой симуляции",
      "Квантовый маршрут показывает",
      "По локальному состоянию",
      "С учётом коллапса амплитуд"
    ],
    bridge: [
      "можно сказать что",
      "следует",
      "вероятнее всего",
      "резонанс указывает",
      "связь выглядит так:"
    ],
    about: [
      "АКСИ — offline-агент с quantum-seed, Neuro и опциональным WebLLM.",
      "Система отвечает локально в браузере без обязательного сервера.",
      "Допуск действий идёт через Permit/Gate, а не «просто чат»."
    ],
    math: [
      "Это вычислимая задача — результат получается точно.",
      "Математика здесь не угадывается, а считается."
    ],
    quantum: [
      "Симулятор кубитов строит суперпозицию и коллапсирует в битовую строку.",
      "Энтропия Шеннона измеряет «размытость» состояния до измерения.",
      "Это честный statevector в JS, не облачный QPU."
    ],
    help: [
      "Спросите «кто ты», пример 12*12, или загрузите WebLLM.",
      "Кнопка «Загрузить WebLLM» — Chrome + WebGPU."
    ],
    close: [
      "Готова уточнить детали.",
      "Можно углубить вопрос.",
      "Контакт: aksilove@internet.ru"
    ]
  };

  function pick(key, idx, p) {
    var arr = BANK[key] || BANK.open;
    var j = Math.floor((idx / DIM) * arr.length) % arr.length;
    var maxi = 0, m = 0, i;
    for (i = 0; i < p.length; i++) if (p[i] > m) { m = p[i]; maxi = i; }
    return arr[(j + (maxi % arr.length)) % arr.length];
  }

  function qGenerate(query) {
    var st = encode(query);
    var p = probs(st);
    var rng = mulberry(hash(query + "|" + Date.now().toString(36)));
    var parts = [], i, idx;
    for (i = 0; i < 4; i++) {
      st = ry(st, i % NQ, rng() * 0.4);
      st = normalize(st);
      p = probs(st);
      idx = sample(p, rng);
      if (i === 0) parts.push(pick("open", idx, p));
      else if (i === 1) parts.push(pick("bridge", idx, p));
      else if (i === 2) {
        var q = query.toLowerCase();
        if (/12\s*\*|математик|корень|сколько/.test(q)) parts.push(pick("math", idx, p));
        else if (/квант|qubit|суперпоз/.test(q)) parts.push(pick("quantum", idx, p));
        else if (/кто ты|что такое акси|привет|hello/.test(q)) parts.push(pick("about", idx, p));
        else if (/как|help|помощ/.test(q)) parts.push(pick("help", idx, p));
        else parts.push(pick("about", idx, p));
      } else parts.push(pick("close", idx, p));
    }
    var finalIdx = sample(p, rng);
    return {
      text: parts.join(" "),
      bits: bits(finalIdx),
      entropy: entropy(p),
      probs: p
    };
  }

  function qPulse(label) {
    var st = encode(label || ("p|" + Date.now()));
    var p = probs(st);
    var idx = sample(p, Math.random);
    return { bits: bits(idx), entropy: entropy(p), probs: p };
  }

  var S = window.AKSI_SUPER;
  var M = window.AKSI_SUPER_MIND;
  var W = window.AKSI_WEBLLM;
  var Neuro = window.AKSI_NEURO || window.AKSI_LOCAL_LLM;
  var Know = window.AKSI_KNOWLEDGE || window.AKSIKnowledge;
  var fabric = null, busy = false, lastQ = null, history = [], qMode = true;

  function $(id) { return document.getElementById(id); }
  function pill(id, t, cls) {
    var el = $(id);
    if (!el) return;
    el.textContent = t;
    el.className = "pill" + (cls ? " " + cls : "");
  }
  function add(role, text, meta) {
    var d = document.createElement("div");
    d.className = "msg " + role;
    d.appendChild(document.createTextNode(text || ""));
    if (meta) {
      var m = document.createElement("span");
      m.className = "meta";
      m.textContent = meta;
      d.appendChild(m);
    }
    $("feed").appendChild(d);
    $("feed").scrollTop = 1e9;
  }
  function stage(t) { if ($("stage")) $("stage").textContent = t || ""; }
  function setBar(p) {
    if ($("bar")) $("bar").style.width = Math.min(100, Math.round((p || 0) * 100)) + "%";
  }
  function llmReady() {
    try { return !!(W && W.ready && W.ready()); } catch (e) { return false; }
  }

  function paintAmps(pr) {
    var box = $("amps");
    if (!box || !pr) return;
    box.innerHTML = "";
    var step = Math.max(1, Math.floor(pr.length / 16));
    var i, j, s, el;
    for (i = 0; i < 16; i++) {
      s = 0;
      for (j = 0; j < step; j++) s += pr[i * step + j] || 0;
      el = document.createElement("i");
      el.style.height = Math.max(2, Math.round(s * 36 * 8)) + "px";
      box.appendChild(el);
    }
  }

  function fillModels() {
    var sel = $("model");
    if (!sel) return;
    sel.innerHTML = "";
    var list = (W && W.modelsForDevice) ? W.modelsForDevice() : ((W && W.models) || []);
    if (!list.length) {
      sel.innerHTML = "<option value=\"\">—</option>";
      return;
    }
    var def = (W.defaultModel && W.defaultModel()) || list[0].id;
    list.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.id;
      o.textContent = m.label || m.id;
      if (m.id === def) o.selected = true;
      sel.appendChild(o);
    });
  }

  function paintStack() {
    pill("pNeuro", Neuro ? "neuro on" : "neuro —", Neuro ? "on" : "");
    pill("pKnow", Know ? "know on" : "know —", Know ? "on" : "");
    pill("pMind", M ? "mind on" : "mind —", M ? "on" : "");
    pill("pLlm", llmReady() ? "llm on" : "llm off", llmReady() ? "on" : "");
    pill("pQ", lastQ ? ("|" + (lastQ.bits || "?") + "⟩") : "quantum", lastQ ? "q" : "");
    var b = [];
    b.push("<b>Q-Gen</b> 6q/64");
    if (Neuro) b.push("<b>Neuro</b>");
    if (Know) b.push("<b>Knowledge</b>");
    if (M) b.push("<b>Mind</b>");
    if (W) b.push("<b>WebLLM</b> " + (W.version || ""));
    if (S) b.push("<b>Super</b>");
    if ($("feats")) $("feats").innerHTML = b.join("<br>");
  }

  function paint() {
    if (fabric) {
      var sn = fabric.snapshot();
      pill("pBoot", sn.booted ? "ONLINE" : "off", sn.booted ? "on" : "");
      pill("pCluster", sn.nodes + "n/" + sn.gpus + "g", sn.avg_util > 5 ? "gpu" : "on");
      pill("pExo", sn.exo ? "exo on" : "exo", sn.exo ? "on" : "");
      var box = $("nodes");
      if (box) {
        box.innerHTML = "";
        (sn.nodes_detail || []).forEach(function (n) {
          var avg = n.gpus.reduce(function (a, g) { return a + g.util; }, 0) / Math.max(1, n.gpus.length);
          var el = document.createElement("div");
          el.className = "node" + (avg > 12 ? " hot" : "");
          el.innerHTML = "<div>" + n.id.replace("node-", "n") + "</div><div class=\"u\">" + avg.toFixed(0) + "%</div>";
          box.appendChild(el);
        });
      }
      if ($("metrics")) {
        $("metrics").textContent = (fabric.clusterReport ? fabric.clusterReport() : "") + "\ndone " + sn.done;
      }
    }
    if (lastQ) {
      if ($("qView")) {
        $("qView").textContent = "|" + (lastQ.bits || "") + "⟩ S=" +
          ((lastQ.entropy != null) ? Number(lastQ.entropy).toFixed(3) : "—");
      }
      if (lastQ.probs) paintAmps(lastQ.probs);
    }
    paintStack();
  }

  async function ensure() {
    if (!S) return null;
    if (!fabric) {
      fabric = new S.SuperFabric();
      try { fabric.loadMemory(); } catch (e) {}
      fabric.onTick = paint;
    }
    if (!fabric.booted) {
      fabric.boot(16, 4);
      fabric.startScheduler(100);
      try { await fabric.attachExocortex(); } catch (e) {}
      add("sys", "Cluster " + (S.version || "") + " · 16×4");
    }
    paint();
    return fabric;
  }

  function neuroStrong(q) {
    try {
      if (!Neuro || !Neuro.think) return null;
      var n = Neuro.think(q);
      if (!n || n.mode === "fallback" || (Number(n.score) || 0) < 0.45) return null;
      var t = String(n.answer || n.text || "").trim();
      return t.length > 8 ? { text: t } : null;
    } catch (e) { return null; }
  }

  async function dialogAnswer(text) {
    try {
      if (M && M.tryMath) {
        var math = M.tryMath(text);
        if (math && math.ok) {
          var mv = Array.isArray(math.value) ? math.value.join(", ") : String(math.value);
          var expl = (math.steps && math.steps.join("\n")) || ("Результат: " + mv);
          if (expl.indexOf(String(mv)) < 0) expl += "\nИтог: " + mv;
          return { text: expl, meta: "math" };
        }
      }
    } catch (e) {}

    var qg = qGenerate(text);
    lastQ = { bits: qg.bits, entropy: qg.entropy, probs: qg.probs };

    if (llmReady() && W && W.complete) {
      stage("webllm…");
      var sys = "Ты АКСИ Quantum AI. Отвечай по-русски, ясно. Quantum |" + qg.bits + "⟩.";
      var ns = neuroStrong(text);
      if (ns) sys += "\nКонтекст: " + ns.text.slice(0, 400);
      try {
        var r = await Promise.race([
          W.complete(text, { system: sys, history: history.slice(-8), max_tokens: 650 }),
          new Promise(function (res) {
            setTimeout(function () { res({ text: "" }); }, 55000);
          })
        ]);
        var t = (r && r.text) ? String(r.text).trim() : "";
        if (t.length > 12) {
          return { text: t, meta: "webllm + quantum |" + qg.bits + "⟩" };
        }
      } catch (e) {}
    }

    if (M && M.answer) {
      stage("mind…");
      try {
        var a = await Promise.race([
          Promise.resolve(M.answer(text, lastQ)),
          new Promise(function (res) {
            setTimeout(function () { res(null); }, 15000);
          })
        ]);
        if (a && a.text && String(a.text).trim().length > 12) {
          return { text: String(a.text).trim(), meta: "mind · |" + qg.bits + "⟩" };
        }
      } catch (e) {}
    }

    var nh = neuroStrong(text);
    if (nh) {
      return {
        text: nh.text + "\n\n— |" + qg.bits + "⟩ S=" + qg.entropy.toFixed(2),
        meta: "neuro + quantum"
      };
    }

    try {
      if (Know && Know.search) {
        var k = Know.search(text);
        if (k && k.body) {
          return {
            text: k.title + ": " + k.body + "\n\n— |" + qg.bits + "⟩",
            meta: "knowledge + quantum"
          };
        }
      }
    } catch (e) {}

    return {
      text: qg.text + "\n\n|ψ⟩ → |" + qg.bits + "⟩ · S=" + qg.entropy.toFixed(3) + " bit",
      meta: "quantum-gen · 6q"
    };
  }

  $("btnLlm").onclick = async function () {
    if (!W) { add("sys", "WebLLM не загрузился"); return; }
    var mid = $("model").value;
    $("btnLlm").disabled = true;
    add("sys", "Загрузка WebLLM: " + mid + "…");
    try {
      await W.load(mid, function (st) {
        var p = (st && st.progress) || 0;
        if (p > 1) p = p / 100;
        setBar(p);
        stage((st && st.message) || "");
      });
      setBar(llmReady() ? 1 : 0);
      add("sys", llmReady()
        ? ("✓ WebLLM: " + (((W.status() || {}).model) || mid))
        : "Не поднялась — quantum/Neuro/Mind работают");
    } catch (e) {
      add("sys", "WebLLM: " + (e.message || e));
    }
    $("btnLlm").disabled = false;
    stage("");
    paint();
  };

  $("btnQMode").onclick = function () {
    qMode = !qMode;
    $("btnQMode").textContent = qMode ? "Режим: Quantum Gen" : "Режим: Hybrid";
    add("sys", qMode ? "Quantum Gen ON" : "Hybrid ON");
  };

  $("btnBoot").onclick = async function () {
    if (fabric && fabric.booted) {
      fabric.scale(16, 4);
      add("sys", "Rescale 16×4");
      paint();
      return;
    }
    await ensure();
  };

  $("btnBench").onclick = async function () {
    var f = await ensure();
    if (!f) { add("sys", "нет Super"); return; }
    var d = await f.waitJob(f.submit({ type: "cluster_bench", size: 48 }), 20000);
    add("sys", d && d.result ? ("Bench flops " + d.result.flops) : "bench fail");
    paint();
  };

  $("btnQ").onclick = function () {
    lastQ = qPulse("pulse|" + Date.now());
    add("sys", "|" + lastQ.bits + "⟩ S=" + lastQ.entropy.toFixed(3));
    paint();
  };

  $("btnVerify").onclick = async function () {
    var o = await dialogAnswer("12*12");
    var ok = String(o.text).indexOf("144") >= 0;
    add("bot", o.text, (ok ? "✓ " : "") + (o.meta || ""));
    paint();
  };

  async function send() {
    var text = $("q").value.trim();
    if (!text || busy) return;
    busy = true;
    $("send").disabled = true;
    $("q").value = "";
    add("user", text);
    history.push({ role: "user", content: text });
    await ensure();
    stage("quantum…");
    var out;
    try {
      out = await dialogAnswer(text);
    } catch (e) {
      out = { text: String(e.message || e), meta: "error" };
    }
    add("bot", out.text || "—", out.meta || "");
    history.push({ role: "assistant", content: out.text || "" });
    if (history.length > 20) history = history.slice(-20);
    if (fabric) {
      try { fabric.submit({ type: "agent", prompt: text, size: 8 }); } catch (e) {}
    }
    busy = false;
    $("send").disabled = false;
    stage("");
    paint();
  }

  $("send").onclick = send;
  $("q").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); send(); }
  });

  fillModels();
  paintStack();
  ensure().then(function () {
    add("sys", "АКСИ готова. Напишите вопрос или нажмите Verify 12×12.");
    lastQ = qPulse("boot");
    paint();
  });
})();
