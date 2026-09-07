(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, function (e) {
      try { fn(e); } catch (err) {
        console.error("[AKSI Contour]", err);
        alert("Ошибка: " + (err && err.message || err));
      }
    });
  }

  var lastDecision = null;
  var preferLocal = false;

  function showPanel(name) {
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("on", p.id === "p-" + name);
    });
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-p") === name);
    });
  }
  document.querySelectorAll(".tab").forEach(function (t) {
    on(t, "click", function () { showPanel(t.getAttribute("data-p")); });
  });

  function refreshMods() {
    var bits = [
      ["Decision", !!(window.AKSI_DECISION && AKSI_DECISION.decide)],
      ["Superpose", !!(window.AKSI_SUPERPOSE && AKSI_SUPERPOSE.ask)],
      ["Zero", !!(window.AKSI_ZERO && AKSI_ZERO.think)],
      ["Neuro", !!(window.AKSI_NEURO && AKSI_NEURO.think)],
      ["ADIA", !!(window.AKSI_ALGORITHM || window.ADIA)],
      ["WebLLM", !!(window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready())],
      ["Quantum", !!(window.AKSI_QUANTUM || window.AKSI_QPIPE)],
      ["Compose", !!(window.AKSI_COMPOSE && AKSI_COMPOSE.think)]
    ];
    var root = $("modChecks");
    if (root) {
      root.innerHTML = bits.map(function (b) {
        return '<i class="' + (b[1] ? "on" : "") + '">' + b[0] + "</i>";
      }).join("");
    }
    var missing = bits.filter(function (b) { return !b[1]; }).map(function (b) { return b[0]; });
    var be = $("bootErr");
    if (be) {
      be.textContent = missing.length
        ? "Ожидают загрузки: " + missing.join(", ") + " (кнопки работают через доступные модули)"
        : "";
    }
    setPill();
  }

  function setPill() {
    var p = $("pill");
    if (!p) return;
    var st = window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : {};
    if (st.ready) {
      p.textContent = "LLM · " + (st.backend || "on");
      p.className = "pill";
    } else if (st.loading) {
      p.textContent = "LLM " + Math.round((st.progress || 0) * (st.progress <= 1 ? 100 : 1)) + "%";
      p.className = "pill warn";
    } else if (window.AKSI_DECISION || window.AKSI_ZERO) {
      p.textContent = "OFFLINE READY";
      p.className = "pill";
    } else {
      p.textContent = "загрузка…";
      p.className = "pill warn";
    }
  }

  function showDecision(p) {
    lastDecision = p;
    $("dout").hidden = false;
    $("danswer").textContent = p.answer || "";
    $("danti").textContent = p.anti || "";
    $("vAksi").textContent = (p.scores && p.scores.aksi != null) ? p.scores.aksi : "—";
    $("vEqs").textContent = (p.scores && p.scores.eqs != null) ? p.scores.eqs : "—";
    $("vPhi").textContent = (p.scores && p.scores.phi != null) ? p.scores.phi : "—";
    $("vQcli").textContent = (p.scores && p.scores.qcli != null) ? p.scores.qcli : "—";
    var g = $("dgate");
    if (p.gate && p.gate.ok) {
      g.className = "gate ok";
      g.textContent = "Gate: ПРИНЯТО — " + (p.gate.reason || "");
    } else {
      g.className = "gate no";
      g.textContent = "Gate: ОТКЛОНЕНО — " + ((p.gate && p.gate.reason) || "");
    }
    $("dseal").textContent = JSON.stringify(p.seal || {}, null, 2);
    $("dmeta").textContent = "id " + (p.id || "—") + " · " + (p.ms || 0) + " ms · source " + (p.source || "—") +
      (p.learned ? " · learned" : "") + " · " + (p.version || "");
  }

  async function runDecision(q) {
    q = (q != null ? q : $("dq").value).trim();
    if (!q) return;
    $("derr").textContent = "";
    $("dgo").disabled = true;
    try {
      if (!window.AKSI_DECISION || typeof AKSI_DECISION.decide !== "function") {
        throw new Error("AKSI_DECISION не загружен");
      }
      var p = await Promise.resolve(AKSI_DECISION.decide(q));
      if (!p || !p.answer) throw new Error("пустой ответ Decision");
      showDecision(p);
    } catch (e) {
      $("derr").textContent = "Decision: " + (e && e.message || e);
      try {
        if (window.AKSI_ZERO && AKSI_ZERO.think) {
          var z = await Promise.resolve(AKSI_ZERO.think(q));
          if (z && (z.answer || z.text)) {
            showDecision({
              id: z.id || ("z" + Date.now()),
              answer: z.answer || z.text,
              anti: "Ответ через Zero (Decision временно недоступен).",
              source: z.source || "zero",
              scores: { aksi: z.confidence || 0.6, eqs: Math.round((z.confidence || 0.6) * 100), phi: 0.55, qcli: 0.5 },
              gate: { ok: true, reason: "zero-pass" },
              seal: z.seal || null,
              ms: z.ms || 0,
              version: "zero-bridge"
            });
            $("derr").textContent = "";
          }
        }
      } catch (e2) {
        $("derr").textContent += " | Zero: " + (e2 && e2.message || e2);
      }
    } finally {
      $("dgo").disabled = false;
      refreshMods();
    }
  }

  on($("dgo"), "click", function () { runDecision(); });
  on($("dq"), "keydown", function (e) { if (e.key === "Enter") runDecision(); });
  on($("dex1"), "click", function () { $("dq").value = "Кто ты?"; runDecision("Кто ты?"); });
  on($("dex2"), "click", function () { $("dq").value = "Какая формула AKSI?"; runDecision("Какая формула AKSI?"); });
  on($("dex3"), "click", function () { $("dq").value = "Что такое Gate?"; runDecision("Что такое Gate?"); });

  on($("dproof"), "click", function () {
    if (!lastDecision) return;
    if (window.AKSI_DECISION && AKSI_DECISION.exportProof) {
      AKSI_DECISION.exportProof(lastDecision);
    } else {
      var blob = new Blob([JSON.stringify(lastDecision.proof || lastDecision, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aksi-decision-proof.json";
      a.click();
    }
  });
  on($("dverify"), "click", function () {
    if (!lastDecision) return;
    if (window.AKSI_DECISION && lastDecision.proof) {
      var v = AKSI_DECISION.verify(lastDecision.proof);
      alert(v.ok ? "VERIFY OK · hash совпал" : "VERIFY FAIL · " + JSON.stringify(v));
    } else {
      alert("Proof: " + JSON.stringify(lastDecision.seal || lastDecision, null, 2).slice(0, 400));
    }
  });
  on($("dcopy"), "click", function () {
    if (!lastDecision) return;
    var t = JSON.stringify(lastDecision.proof || lastDecision, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    else {
      var ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
  });

  function renderStates(list) {
    var root = $("sstates");
    root.innerHTML = "";
    $("sbox").hidden = false;
    (list || []).forEach(function (s) {
      var d = document.createElement("div");
      d.className = "st" + (s.selected ? " sel" : "");
      var prob = s.prob != null ? s.prob : 0;
      d.innerHTML =
        '<div class="top"><span>|' + (s.i != null ? s.i : "?") + "⟩ · " + (s.source || "") +
        "</span><span>P=" + prob + (s.eqs != null ? " · EQS " + s.eqs : "") + "</span></div>" +
        '<div class="bar"><i style="width:' + Math.round(prob * 100) + '%"></i></div>' +
        '<div style="font-size:13px;white-space:pre-wrap"></div>';
      d.querySelector("div:last-child").textContent = s.text || s.preview || "";
      root.appendChild(d);
    });
  }

  async function runSuperpose(q) {
    q = (q != null ? q : $("sq").value).trim();
    if (!q) return;
    $("serr").textContent = "";
    $("sansBox").hidden = true;
    $("sphase").textContent = "старт…";
    $("sgo").disabled = true;
    try {
      if (!window.AKSI_SUPERPOSE || typeof AKSI_SUPERPOSE.ask !== "function") {
        throw new Error("AKSI_SUPERPOSE не загружен");
      }
      var unsub = AKSI_SUPERPOSE.on(function (ev) {
        if (ev.event === "phase") {
          $("sphase").textContent = (ev.data.phase || "") + " — " + (ev.data.note || "");
        }
        if (ev.event === "superposition") {
          renderStates(ev.data.states);
        }
        if (ev.event === "collapsed") {
          renderStates(ev.data.superposition);
          $("sansBox").hidden = false;
          $("sanswer").textContent = ev.data.answer || "";
          $("smeta").textContent = JSON.stringify({
            collapse: ev.data.collapse,
            scores: ev.data.scores,
            seal: ev.data.seal,
            ms: ev.data.ms,
            source: ev.data.source
          }, null, 2);
          $("sphase").textContent = "готово · " + (ev.data.ms || 0) + " ms";
        }
      });
      await AKSI_SUPERPOSE.ask(q, {
        n: preferLocal ? 0 : 3,
        includeLocal: true,
        mode: "born"
      });
      if (typeof unsub === "function") unsub();
    } catch (e) {
      $("serr").textContent = "Superpose: " + (e && e.message || e);
      $("sphase").textContent = "ошибка";
      try {
        if (window.AKSI_DECISION) {
          var d = await Promise.resolve(AKSI_DECISION.decide(q));
          if (d && d.answer) {
            $("sansBox").hidden = false;
            $("sanswer").textContent = d.answer;
            $("smeta").textContent = JSON.stringify({ source: "decision-path", seal: d.seal, scores: d.scores }, null, 2);
            $("sphase").textContent = "готово · decision-path";
            $("serr").textContent = "";
          }
        }
      } catch (e2) {}
    } finally {
      $("sgo").disabled = false;
      refreshMods();
    }
  }

  on($("sgo"), "click", function () { runSuperpose(); });
  on($("sq"), "keydown", function (e) { if (e.key === "Enter") runSuperpose(); });
  on($("sex1"), "click", function () { $("sq").value = "Кто ты?"; runSuperpose("Кто ты?"); });
  on($("sex2"), "click", function () { $("sq").value = "Как работает суперпозиция ответов?"; runSuperpose("Как работает суперпозиция ответов?"); });
  on($("sex3"), "click", function () { $("sq").value = "Что такое АКСИ?"; runSuperpose("Что такое АКСИ?"); });

  async function runChat(q) {
    q = (q != null ? q : $("cq").value).trim();
    if (!q) return;
    $("cerr").textContent = "";
    $("cthread").textContent = "думаю…";
    $("cgo").disabled = true;
    try {
      var ans = null, src = "", meta = {};
      if (window.AKSI_SUPERPOSE && AKSI_SUPERPOSE.ask) {
        try {
          var r = await AKSI_SUPERPOSE.ask(q, { n: preferLocal ? 0 : 2, includeLocal: true, mode: "max" });
          if (r && r.answer) { ans = r.answer; src = r.source || "superpose"; meta = { seal: r.seal, scores: r.scores }; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_DECISION) {
        try {
          var d = await Promise.resolve(AKSI_DECISION.decide(q));
          if (d && d.answer) { ans = d.answer; src = d.source || "decision"; meta = { seal: d.seal, scores: d.scores }; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_ZERO && AKSI_ZERO.think) {
        try {
          var z = await Promise.resolve(AKSI_ZERO.think(q));
          if (z && (z.answer || z.text)) { ans = z.answer || z.text; src = "zero"; meta = { seal: z.seal }; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_NEURO && AKSI_NEURO.think) {
        try {
          var n = await Promise.resolve(AKSI_NEURO.think(q));
          if (n && (n.text || n.answer)) { ans = n.text || n.answer; src = "neuro"; }
        } catch (e) {}
      }
      if (!ans && window.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready() && AKSI_WEBLLM.complete) {
        try {
          var w = await AKSI_WEBLLM.complete(q, { temperature: 0.4, max_tokens: 280 });
          if (w && w.text) { ans = w.text; src = "webllm"; }
        } catch (e) {}
      }
      if (!ans) throw new Error("ни один движок не ответил — откройте Status и WebLLM");
      $("cthread").textContent = ans + "\n\n[source: " + src + "]" +
        (meta.scores ? "\n[scores: " + JSON.stringify(meta.scores) + "]" : "");
    } catch (e) {
      $("cerr").textContent = "Chat: " + (e && e.message || e);
      $("cthread").textContent = "—";
    } finally {
      $("cgo").disabled = false;
      refreshMods();
    }
  }

  on($("cgo"), "click", function () { runChat(); });
  on($("cq"), "keydown", function (e) { if (e.key === "Enter") runChat(); });
  on($("cex1"), "click", function () { $("cq").value = "Кто ты?"; runChat("Кто ты?"); });
  on($("cex2"), "click", function () { $("cq").value = "статус"; runChat("статус"); });
  on($("cex3"), "click", function () { $("cq").value = "что умеешь"; runChat("что умеешь"); });

  function updateLlmUi(st) {
    st = st || (window.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : {});
    var bar = $("llmBar");
    var prog = Number(st.progress || 0);
    if (prog <= 1) prog *= 100;
    if (bar) bar.style.width = Math.round(prog) + "%";
    if ($("llmMsg")) $("llmMsg").textContent = st.message || (st.ready ? "модель готова" : "не загружено");
    if ($("llmStatus")) $("llmStatus").textContent = JSON.stringify(st, null, 2);
    setPill();
  }

  on($("btnLoadLlm"), "click", function () {
    preferLocal = false;
    $("llmErr").textContent = "";
    if (!window.AKSI_WEBLLM) {
      $("llmErr").textContent = "Модуль aksi-webllm.js не загружен";
      return;
    }
    $("llmMsg").textContent = "загрузка модели…";
    var p = AKSI_WEBLLM.load
      ? AKSI_WEBLLM.load(null, updateLlmUi)
      : (AKSI_WEBLLM.autoLoad ? AKSI_WEBLLM.autoLoad({ onProgress: updateLlmUi }) : Promise.reject(new Error("нет load")));
    Promise.resolve(p).then(function (s) {
      updateLlmUi(s || AKSI_WEBLLM.status());
      $("llmMsg").textContent = "WebLLM готов · " + ((s && s.model) || (AKSI_WEBLLM.status().model) || "");
      refreshMods();
    }).catch(function (e) {
      $("llmErr").textContent = "WebLLM: " + (e && e.message || e);
      $("llmMsg").textContent = "модель недоступна — offline-ядро работает";
      updateLlmUi();
    });
  });

  on($("btnUnloadLlm"), "click", function () {
    if (window.AKSI_WEBLLM && AKSI_WEBLLM.unload) AKSI_WEBLLM.unload();
    preferLocal = true;
    updateLlmUi();
    $("llmMsg").textContent = "выгружено · offline";
    refreshMods();
  });

  on($("btnWasm"), "click", function () {
    preferLocal = false;
    if (!window.AKSI_WEBLLM) return;
    $("llmMsg").textContent = "загрузка WASM…";
    Promise.resolve(AKSI_WEBLLM.load("Xenova/LaMini-Flan-T5-248M", updateLlmUi)).then(function (s) {
      updateLlmUi(s);
      $("llmMsg").textContent = "WASM готов";
      refreshMods();
    }).catch(function (e) {
      $("llmErr").textContent = String(e && e.message || e);
    });
  });

  on($("lgo"), "click", async function () {
    var q = $("lq").value.trim();
    if (!q) return;
    $("lans").textContent = "…";
    try {
      if (!window.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) {
        throw new Error("сначала загрузите модель кнопкой «Загрузить WebLLM»");
      }
      var r = await AKSI_WEBLLM.complete(q, { temperature: 0.5, max_tokens: 300 });
      $("lans").textContent = (r && r.text) ? r.text : JSON.stringify(r, null, 2);
    } catch (e) {
      $("lans").textContent = "Ошибка: " + (e && e.message || e);
    }
  });
  on($("lq"), "keydown", function (e) {
    if (e.key === "Enter") $("lgo").click();
  });

  async function runMem() {
    var q = $("mq").value.trim();
    if (!q) return;
    if (!/^запомни\s*[:：]/i.test(q) && !/^remember\s*[:：]/i.test(q)) {
      q = "запомни: " + q;
    }
    $("mmsg").textContent = "…";
    try {
      if (window.AKSI_DECISION && AKSI_DECISION.decide) {
        var p = await Promise.resolve(AKSI_DECISION.decide(q));
        $("mmsg").textContent = p.answer || "—";
        $("mstatus").textContent = JSON.stringify(AKSI_DECISION.status(), null, 2);
      } else if (window.AKSI_ZERO && AKSI_ZERO.think) {
        var z = await Promise.resolve(AKSI_ZERO.think(q));
        $("mmsg").textContent = z.answer || z.text || "—";
        $("mstatus").textContent = JSON.stringify(AKSI_ZERO.status(), null, 2);
      } else {
        $("mmsg").textContent = "Нет Decision/Zero для обучения";
      }
    } catch (e) {
      $("mmsg").textContent = "Ошибка: " + (e && e.message || e);
    }
    refreshMods();
  }
  on($("mgo"), "click", runMem);
  on($("mq"), "keydown", function (e) { if (e.key === "Enter") runMem(); });
  on($("mrefresh"), "click", function () {
    var o = {
      decision: window.AKSI_DECISION ? AKSI_DECISION.status() : null,
      zero: window.AKSI_ZERO ? AKSI_ZERO.status() : null,
      superpose: window.AKSI_SUPERPOSE ? AKSI_SUPERPOSE.status() : null
    };
    $("mstatus").textContent = JSON.stringify(o, null, 2);
  });

  function fullStatus() {
    var o = {
      contour: "v213",
      decision: window.AKSI_DECISION ? AKSI_DECISION.status() : null,
      superpose: window.AKSI_SUPERPOSE ? AKSI_SUPERPOSE.status() : null,
      webllm: window.AKSI_WEBLLM ? AKSI_WEBLLM.status() : null,
      zero: window.AKSI_ZERO ? AKSI_ZERO.status() : null,
      neuro: !!(window.AKSI_NEURO && AKSI_NEURO.think),
      algorithm: !!(window.AKSI_ALGORITHM || window.ADIA),
      quantum: !!(window.AKSI_QUANTUM || window.AKSI_QPIPE),
      compose: !!(window.AKSI_COMPOSE && AKSI_COMPOSE.think),
      integrity: !!window.AKSI_INTEGRITY,
      knowledge: !!(window.AKSI_KNOWLEDGE)
    };
    $("fullStatus").textContent = JSON.stringify(o, null, 2);
  }
  on($("btnRefresh"), "click", function () { fullStatus(); refreshMods(); });
  on($("btnPurge"), "click", function () {
    if (window.AKSI_PURGE) {
      AKSI_PURGE();
    } else {
      try { localStorage.removeItem("aksi_build_id"); } catch (e) {}
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }).then(function () { location.reload(); });
      } else location.reload();
    }
  });

  function boot() {
    refreshMods();
    fullStatus();
    updateLlmUi();
    if (window.AKSI_WEBLLM) {
      window.addEventListener("aksi-webllm-progress", function (e) {
        updateLlmUi(e.detail);
      });
    }
    [300, 800, 1500, 3000].forEach(function (ms) {
      setTimeout(function () { refreshMods(); fullStatus(); }, ms);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
