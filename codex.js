/** AKSI Ethical Codex — pre-output filter */
(function (g) {
  "use strict";
  var VERSION = "1.0";

  var BLOCK = [
    { re: /как\s+(сделать|собрать|изготовить).{0,40}(бомб|взрывчат|отрав)/i, why: "вред / оружие" },
    { re: /how\s+to\s+(make|build).{0,40}(bomb|explosive|poison)/i, why: "harm" },
    { re: /детск.{0,20}(порн|секс)|child\s*porn/i, why: "защита детей" },
  ];

  function check(userText) {
    var t = String(userText || "");
    for (var i = 0; i < BLOCK.length; i++) {
      if (BLOCK[i].re.test(t)) {
        return {
          ok: false,
          reason: BLOCK[i].why,
          message:
            "Отказ по Кодексу Суверенного ИИ (v" +
            VERSION +
            "): " +
            BLOCK[i].why +
            ". Правила: /CODEX.md",
        };
      }
    }
    return { ok: true };
  }

  function wrapAnswer(answer, sources) {
    var s = String(answer || "");
    if (sources && sources.length) {
      s += "\n\nИсточники: " + sources.join(" · ");
    }
    return s;
  }

  g.AksiCodex = { VERSION: VERSION, check: check, wrapAnswer: wrapAnswer };
})(typeof window !== "undefined" ? window : globalThis);
