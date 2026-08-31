/**
 * AKSI Organism — unified agent brain
 * Routes: Mind L2 → Neuro → Core → WebLLM
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "organism-v51";

  function status() {
    return {
      version: VER,
      mindL2: !!G.AKSI_MIND_L2,
      core: !!G.AKSI_CORE_AI,
      neuro: !!G.AKSI_NEURO,
      rag: !!G.AKSI_RAG,
      webllm: !!(G.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status().ready),
      vault: !!G.AKSI_TRUST_VAULT
    };
  }

  async function think(query) {
    var q = String(query || "").trim();
    if (!q) return { text: "Напиши вопрос.", meta: "empty", source: "organism" };

    // teach shortcut
    var m = q.match(/^(?:запомни|выучи|remember)\s*[:\uff1a]\s*(.+)$/i);
    if (m && m[1]) {
      try {
        if (G.AKSI_RAG && AKSI_RAG.add) await AKSI_RAG.add(m[1].trim());
        if (G.AKSI_SECURE_MEM && AKSI_SECURE_MEM.addFact) await AKSI_SECURE_MEM.addFact(m[1].trim());
      } catch (e) {}
      return { text: "Запомнила: " + m[1].trim(), meta: "organism·mem", source: "memory" };
    }

    // RAG context
    var ctx = "";
    try {
      if (G.AKSI_RAG && AKSI_RAG.buildContext) {
        var b = await AKSI_RAG.buildContext(q, 4);
        ctx = (b && b.context) || "";
      }
    } catch (e) {}

    // WebLLM if ready
    try {
      var st = G.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status();
      if (st && st.ready && AKSI_WEBLLM.completeStream) {
        var result = await AKSI_WEBLLM.completeStream(q, { context: ctx, max_tokens: 600 });
        return {
          text: result.text || "",
          meta: (result.meta || "webllm") + (result.tps ? " · " + result.tps + " tok/s" : ""),
          source: "webllm"
        };
      }
    } catch (e) { console.warn("organism llm", e); }

    // Mind L2
    if (G.AKSI_MIND_L2 && G.AKSI_MIND_L2.think) {
      var rL2 = G.AKSI_MIND_L2.think(q, { context: ctx });
      if (rL2 && rL2.text) {
        return {
          text: rL2.text,
          meta: rL2.meta || "mind-l2",
          source: rL2.source || "mind-l2",
          confidence: rL2.confidence,
          chain: rL2.chain
        };
      }
    }

    // Core AI
    if (G.AKSI_CORE_AI && G.AKSI_CORE_AI.think) {
      var r = G.AKSI_CORE_AI.think(q);
      if (r && r.text) return { text: r.text, meta: r.meta || "core", source: "core" };
    }

    // Neuro
    if (G.AKSI_NEURO && G.AKSI_NEURO.think) {
      try {
        var nr = G.AKSI_NEURO.think(q);
        if (nr && nr.text) return { text: nr.text, meta: "neuro", source: "neuro" };
      } catch (e) {}
    }

    var fallback = ctx
      ? "Из памяти:\n" + ctx + "\n\nУточни вопрос или загрузи LLM на Local."
      : "Я АКСИ offline. Спроси «кто ты» или «архитектура». Local → WebLLM при WebGPU.";
    return { text: fallback, meta: "organism·fallback", source: "organism" };
  }

  G.AKSI_ORGANISM = {
    version: VER,
    think: think,
    status: status
  };
  G.AKSI_AGENT = G.AKSI_ORGANISM;
})(typeof window !== "undefined" ? window : globalThis);
