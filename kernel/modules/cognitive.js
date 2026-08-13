/** Cognitive UI — light heuristics (no biometrics): pace, time, length */
(function () {
  "use strict";
  if (!window.AksiKernel) return;

  var state = { level: "calm", density: "normal" }; // calm | focus | overload
  var recent = [];

  function update(userText) {
    var now = Date.now();
    recent.push(now);
    recent = recent.filter(function (t) {
      return now - t < 60000;
    });
    var hour = new Date().getHours();
    var burst = recent.length >= 8;
    var longMsg = String(userText || "").length > 280;
    var late = hour >= 23 || hour < 6;

    if (burst || (longMsg && recent.length > 4)) {
      state = { level: "overload", density: "sparse" };
    } else if (late) {
      state = { level: "calm", density: "soft" };
    } else if (recent.length >= 4) {
      state = { level: "focus", density: "compact" };
    } else {
      state = { level: "calm", density: "normal" };
    }

    document.documentElement.setAttribute("data-cognitive", state.density);
    if (window.AksiBus) AksiBus.emit("cognitive.state", "cognitive", state);
    return state;
  }

  AksiKernel.register({
    id: "cognitive",
    name: "Cognitive UI",
    version: "1.0",
    init: function () {
      document.documentElement.setAttribute("data-cognitive", "normal");
    },
    update: update,
    getState: function () {
      return state;
    },
  });
})();
