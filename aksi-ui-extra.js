/** aksi-ui-extra.js — Сеть / Метрики / Протокол + погода в чате */
(function () {
  "use strict";
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    var E = window.AksiEngine;

    // Titles for new panels (if openPanel exists via hash)
    // Weather button
    var wBtn = document.getElementById("wBtn");
    var wCity = document.getElementById("wCity");
    var wOut = document.getElementById("wOut");
    if (wBtn && E) {
      wBtn.onclick = function () {
        var city = (wCity && wCity.value) || "Moscow";
        if (wOut) wOut.textContent = "Загрузка…";
        E.getWeather(city).then(function (w) {
          if (!wOut) return;
          if (w.temp_c === null) wOut.textContent = "Погода недоступна.";
          else wOut.textContent = w.city + ": " + w.temp_c + "°C, " + w.condition +
            ", влажность " + w.humidity + "%, ветер " + w.wind_kph + " км/ч, ощущается " + w.feelslike_c + "°C";
        });
      };
    }

    // Metrics
    var mCalc = document.getElementById("mCalc");
    var mText = document.getElementById("mText");
    var mOut = document.getElementById("mOut");
    if (mCalc && E) {
      mCalc.onclick = function () {
        var t = (mText && mText.value) || "";
        if (!t.trim()) { if (mOut) mOut.textContent = "Введите текст"; return; }
        var m = E.computeQuantumMetrics(t);
        var rec = E.recordMessage(E.AKSI_DID, "АКСИ", t);
        if (mOut) {
          mOut.innerHTML =
            '<span class="metric"><b>' + m.H + '</b>Shannon H</span>' +
            '<span class="metric"><b>' + m.qcli + '</b>QCLI</span>' +
            '<span class="metric"><b>' + m.heff + '</b>H_eff</span>' +
            '<span class="metric"><b>' + m.fingerprint + '</b>fingerprint</span>' +
            '<span class="metric"><b>' + rec.eqs + '</b>EQS (' + (rec.badge || "") + ')</span>' +
            '<p class="muted" style="margin-top:8px">Уровень сложности текста: ' + m.level + '</p>';
        }
      };
    }

    // Protocol
    var protoRefresh = document.getElementById("protoRefresh");
    var protoOut = document.getElementById("protoOut");
    function showProto() {
      if (!E || !protoOut) return;
      var s = E.getProtocolStatus();
      protoOut.textContent = JSON.stringify(s, null, 2);
    }
    if (protoRefresh) protoRefresh.onclick = showProto;
    showProto();

    // Intercept chat: weather + protocol log
    // Hook after answers by observing thread is heavy; instead enhance send path if available
    // Patch local weather queries via capturing send button second handler
    var inp = document.getElementById("inp");
    var send = document.getElementById("send");

    function tryWeatherAnswer(q) {
      if (!E) return null;
      var m = q.match(/погода\s+(.+)/i) || (q.toLowerCase() === "погода" ? ["", "Moscow"] : null);
      if (!m) return null;
      var city = (m[1] || "Moscow").trim();
      return E.getWeather(city).then(function (w) {
        if (w.temp_c === null) return "Погода сейчас недоступна.";
        return "Погода в " + w.city + ":\n" + w.temp_c + "°C, " + w.condition +
          "\nВлажность " + w.humidity + "% · ветер " + w.wind_kph + " км/ч · ощущается " + w.feelslike_c + "°C";
      });
    }

    // Wrap existing sendText by listening to data-q weather buttons already wired;
    // Add document-level helper for weather queries after user message
    var thread = document.getElementById("thread");
    if (thread && E) {
      var obs = new MutationObserver(function (muts) {
        // no-op: protocol records on explicit calc
      });
      // Record assistant-ish: when metrics calc happens we already record
    }

    // Soft-patch: when user clicks send, if message is weather, inject answer after short delay if needed
    function enhanceSend() {
      if (!inp || !send) return;
      var orig = send.onclick;
      send.addEventListener("click", function () {
        var q = (inp.value || "").trim();
        var p = tryWeatherAnswer(q);
        if (!p) return;
        // Let main handler run; also log protocol
        p.then(function (text) {
          if (E.createAgentMessage) E.createAgentMessage("user", "response", text);
          showProto();
        });
      }, true);
    }
    enhanceSend();

    // Hash navigation for new panels
    var hash = (location.hash || "").replace("#", "");
    if (hash === "net" || hash === "metrics" || hash === "protocol") {
      var tab = document.querySelector('.tab[data-p="' + hash + '"]');
      if (tab) tab.click();
    }
  });
})();
