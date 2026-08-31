/**
 * AKSI Stats — ADIA timeline, queries, memory; Chart.js progressive
 */
(function (G) {
  "use strict";
  var KEY = "aksi_stats_v1";
  var MAX_POINTS = 120;
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (!o.adia) o.adia = [];
      if (!o.queries) o.queries = 0;
      if (!o.byDay) o.byDay = {};
      return o;
    } catch (e) { return { adia: [], queries: 0, byDay: {} }; }
  }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function dayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function recordAdia(score, axes) {
    var o = load();
    o.queries = (o.queries || 0) + 1;
    var dk = dayKey();
    o.byDay[dk] = (o.byDay[dk] || 0) + 1;
    o.adia.push({ t: Date.now(), score: Number(score) || 0, axes: axes || null });
    if (o.adia.length > MAX_POINTS) o.adia = o.adia.slice(-MAX_POINTS);
    save(o);
    return o;
  }
  function memorySize() {
    try { return Number(sessionStorage.getItem("aksi_mem_n") || 0); } catch (e) { return 0; }
  }
  function avg(arr) {
    if (!arr || !arr.length) return null;
    var s = 0; arr.forEach(function (p) { s += Number(p.score) || 0; });
    return Math.round(s / arr.length);
  }
  function snapshot() {
    var o = load();
    var mods = 0;
    ["AKSI_COMPOSE", "AKSI_NEURO", "AKSI_ADIA_ASSESS", "AKSI_SWARM", "AKSI_SECURE_MEM", "AKSI_PQ", "AKSI_SENTIMENT", "AKSI_ALGORITHM", "AKSI_SECURITY"].forEach(function (k) { if (G[k]) mods++; });
    return { queries: o.queries || 0, adiaPoints: o.adia || [], byDay: o.byDay || {}, memoryItems: memorySize(), modulesOn: mods, avgAdia: avg(o.adia) };
  }
  function sparklineSVG(points, w, h) {
    w = w || 280; h = h || 64;
    if (!points || points.length < 2) return '<svg width="'+w+'" height="'+h+'"><text x="8" y="32" fill="#7a6f60" font-size="12">мало данных</text></svg>';
    var vals = points.map(function (p) { return Number(p.score) || 0; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max <= min) max = min + 1;
    var step = w / (vals.length - 1);
    var d = vals.map(function (v, i) {
      var x = i * step, y = h - ((v - min) / (max - min)) * (h - 8) - 4;
      return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><path d="'+d+'" fill="none" stroke="#6b4f35" stroke-width="2"/></svg>';
  }
  function tryChart(canvasId, points) {
    if (!G.Chart || !points || points.length < 2) return false;
    var el = document.getElementById(canvasId);
    if (!el) return false;
    try {
      if (el._aksiChart) { el._aksiChart.destroy(); el._aksiChart = null; }
      el._aksiChart = new G.Chart(el.getContext("2d"), {
        type: "line",
        data: {
          labels: points.map(function (p, i) { return i + 1; }),
          datasets: [{ label: "ADIA", data: points.map(function (p) { return p.score; }), borderColor: "#6b4f35", tension: 0.3, pointRadius: 2 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
      });
      return true;
    } catch (e) { return false; }
  }
  function renderInto(el) {
    if (!el) return;
    var s = snapshot();
    var html = '<div class="kv" style="margin-bottom:12px">';
    html += '<div class="cell"><b>'+s.queries+'</b><span>запросов</span></div>';
    html += '<div class="cell"><b>'+(s.avgAdia!=null?s.avgAdia:"—")+'</b><span>ср. ADIA</span></div>';
    html += '<div class="cell"><b>'+s.memoryItems+'</b><span>память</span></div>';
    html += '<div class="cell"><b>'+s.modulesOn+'</b><span>модули</span></div></div>';
    html += '<h3 style="font-size:12px;margin:8px 0;color:var(--muted)">ADIA score</h3>';
    html += '<canvas id="adiaChart" height="120" style="width:100%;max-width:360px;display:none"></canvas>';
    html += '<div id="adiaSpark">'+sparklineSVG(s.adiaPoints)+'</div>';
    el.innerHTML = html;
    if (s.adiaPoints.length >= 2) {
      var tryLoad = function () {
        if (tryChart("adiaChart", s.adiaPoints)) {
          var c = document.getElementById("adiaChart"), sp = document.getElementById("adiaSpark");
          if (c) c.style.display = "block"; if (sp) sp.style.display = "none";
        }
      };
      if (G.Chart) tryLoad();
      else if (!G._aksiChartLoading) {
        G._aksiChartLoading = true;
        var sc = document.createElement("script");
        sc.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
        sc.onload = function () { G.Chart = window.Chart; tryLoad(); };
        document.head.appendChild(sc);
      }
    }
  }
  G.AKSI_STATS = { recordAdia: recordAdia, snapshot: snapshot, renderInto: renderInto, sparklineSVG: sparklineSVG };
})(typeof window !== "undefined" ? window : globalThis);
