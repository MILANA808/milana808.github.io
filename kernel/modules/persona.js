/** Dual persona: AKSI (logic) + Milana (empathy) */
(function () {
  "use strict";
  if (!window.AksiKernel) return;

  var mode = localStorage.getItem("AKSI_PERSONA") || "unified"; // aksi | milana | unified

  function setMode(m) {
    mode = m;
    localStorage.setItem("AKSI_PERSONA", m);
    if (window.AksiBus) AksiBus.emit("persona.changed", "persona", { mode: m });
  }

  function styleReply(text, source) {
    if (mode === "aksi") {
      return { text: text, source: (source ? source + " · " : "") + "режим АКСИ (логика)" };
    }
    if (mode === "milana") {
      return {
        text: "Я рядом. " + text,
        source: (source ? source + " · " : "") + "режим Милана (тепло)",
      };
    }
    return { text: text, source: source || null };
  }

  AksiKernel.register({
    id: "persona",
    name: "Persona",
    version: "1.0",
    init: function (bus) {
      if (!bus) return;
      bus.on("persona.set", function (intent) {
        if (intent.payload && intent.payload.mode) setMode(intent.payload.mode);
      });
    },
    getMode: function () {
      return mode;
    },
    setMode: setMode,
    styleReply: styleReply,
  });
})();
