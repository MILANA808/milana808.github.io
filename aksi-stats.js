/**
 * AKSI Stats — локальная телеметрия
 */
(function (G) {
  "use strict";
  var KEY = "aksi_stats_v1", MAX_POINTS = 120;
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "{}"); if (!o.adia) o.adia = []; if (!o.queries) o.queries = 0; if (!o.byDay) o.byDay = {}; return o; }
    catch (e) { return { adia: [], queries: 0, byDay: {} }; }
  }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function dayKey() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function recordAdia(score, axes) {
    var o = load(); o.queries = (o.queries || 0) + 1; var dk = dayKey(); o.byDay[dk] = (o.byDay[dk] || 0) + 1;
    o.adia.push({ t: Date.now(), score: Number(score) || 0, axes: axes || null });
    if (o.adia.length > MAX_POINTS) o.adia = o.adia.slice(-MAX_POINTS); save(o); return o;
  }
  function avg(arr) { if (!arr || !arr.length) return null; var s = 0; arr.forEach(function (p) { s += Number(p.score) || 0; }); return Math.round(s / arr.length); }
  function snapshot() {
    var o = load(), memN = 0, mods = 0, sent = null;
    try { memN = Number(sessionStorage.getItem("aksi_mem_n") || 0); } catch (e) {}
    try { ["AKSI_COMPOSE","AKSI_NEURO","AKSI_ADIA_ASSESS","AKSI_SWARM","AKSI_HRR","AKSI_SECURE_MEM","AKSI_PQ","AKSI_SENTIMENT"].forEach(function (k) { if (G[k]) mods++; }); } catch (e) {}
    try { sent = G.AKSI_SENTIMENT && G.AKSI_SENTIMENT.status(); } catch (e) {}
    return { queries: o.queries || 0, adiaPoints: o.adia || [], byDay: o.byDay || {}, memoryItems: memN, modulesOn: mods, sentiment: sent, avgAdia: avg(o.adia) };
  }
  function sparklineSVG(points, w, h) {
    w = w || 280; h = h || 64;
    if (!points || points.length < 2) return '<svg width="' + w + '" height="' + h + '"><text x="8" y="32" fill="#7a6f60" font-size="12">мало данных</text></svg>';
    var vals = points.map(function (p) { return Number(p.score) || 0; });
    var min = Math.min.apply(null, vals.concat([0])), max = Math.max.apply(null, vals.concat([100])); if (max === min) max = min + 1;
    var step = w / (vals.length - 1);
    var d = vals.map(function (v, i) { var x = i * step, y = h - 4 - ((v - min) / (max - min)) * (h - 12); return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); }).join(" ");
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><path d="' + d + '" fill="none" stroke="#6b4f35" stroke-width="2"/></svg>';
  }
  function renderInto(el) {
    if (!el) return; var s = snapshot();
    el.innerHTML = '<div class="kv" style="margin-bottom:12px"><div class="cell"><b>' + s.queries + '</b><span>запросов</span></div><div class="cell"><b>' + (s.avgAdia != null ? s.avgAdia : "—") + '</b><span>ср. ADIA</span></div><div class="cell"><b>' + s.memoryItems + '</b><span>память</span></div><div class="cell"><b>' + s.modulesOn + '</b><span>модули</span></div></div><h3 style="font-size:12px;margin:8px 0;color:var(--muted)">ADIA score во времени</h3>' + sparklineSVG(s.adiaPoints) + (s.sentiment ? '<p class="muted" style="margin-top:10px">Classifier: ' + (s.sentiment.status || "?") + (s.sentiment.error ? " · " + s.sentiment.error : "") + "</p>" : "");
  }
  G.AKSI_STATS = { recordAdia: recordAdia, snapshot: snapshot, renderInto: renderInto, sparklineSVG: sparklineSVG };
})(typeof window !== "undefined" ? window : globalThis);
