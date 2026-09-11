/**
 * AKSI Cortex bridge — WebLLM synthesis attached to Organism
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-cortex-bridge";

  function ready() {
    try {
      return !!(G.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status().ready);
    } catch (e) {
      return false;
    }
  }

  async function ensure(onProgress) {
    if (ready()) return true;
    if (!G.AKSI_WEBLLM) {
      await new Promise(function (res, rej) {
        var s = document.createElement("script");
        s.src = "/aksi-webllm.js?v=3";
        s.onload = res;
        s.onerror = function () {
          rej(new Error("webllm load"));
        };
        document.head.appendChild(s);
      });
    }
    if (!G.AKSI_WEBLLM) throw new Error("no WEBLLM");
    var prog = onProgress || function () {};
    if (AKSI_WEBLLM.autoLoad) await AKSI_WEBLLM.autoLoad(prog);
    else if (AKSI_WEBLLM.load) await AKSI_WEBLLM.load(null, prog);
    return ready();
  }

  async function synthesize(query, facts) {
    if (!ready()) return null;
    var ctx = (facts || [])
      .slice(0, 4)
      .map(function (f, i) {
        return i + 1 + ") " + String(f.text || f).slice(0, 450);
      })
      .join("\n");
    var system =
      "Ты кора АКСИ. Только русский. 4–10 предложений. Сначала прямой ответ. Опирайся на факты. Без воды.";
    var user =
      "Вопрос: " + query + "\n\nФакты:\n" + (ctx || "(мало фактов)") + "\n\nОтвет:";
    try {
      var r = await AKSI_WEBLLM.complete(user, {
        system: system,
        temperature: 0.35,
        max_tokens: 500
      });
      var t = String((r && (r.text || r.answer)) || "").trim();
      if (t.length < 40 || !/[а-яёА-ЯЁ]/.test(t)) return null;
      return { text: t, source: "кора·webllm", conf: 0.94 };
    } catch (e) {
      return null;
    }
  }

  function install() {
    var org = G.AKSI_ORGANISM || G.AKSI_PULSE;
    if (!org || !org.think || org._cortex) return;
    var raw = org.think.bind(org);
    org.think = async function (query, opts) {
      opts = opts || {};
      var r = await raw(query, opts);
      if (ready() && opts.cortex !== false) {
        try {
          var facts = [];
          if (r && r.superposition) {
            facts = r.superposition.map(function (s) {
              return { text: s.preview || "" };
            });
          }
          if (r && r.answer) facts.unshift({ text: r.answer });
          var neural = await synthesize(query, facts);
          if (neural && neural.text) {
            r.answer = neural.text;
            r.source = "organism:" + neural.source;
            r.cortex = true;
            r.version = (r.version || "") + "+cortex";
          }
        } catch (e) {}
      }
      r.cortex = ready();
      return r;
    };
    org.ensureCortex = ensure;
    org.cortexReady = ready;
    org._cortex = VER;
    G.AKSI_ORGANISM = org;
    G.AKSI_PULSE = org;
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(install, 50);
      });
    else setTimeout(install, 50);
  }
  G.AKSI_CORTEX = {
    version: VER,
    ensure: ensure,
    ready: ready,
    synthesize: synthesize,
    install: install
  };
})(typeof window !== "undefined" ? window : globalThis);
