export class WebLLMWrapper {
  constructor({ statusEl }) {
    this.statusEl = statusEl;
    this.engine = null;
    this.loading = null;
  }

  setStatus(t) {
    if (this.statusEl) this.statusEl.textContent = t;
  }

  async ensure() {
    if (this.engine) return this.engine;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      this.setStatus("LLM загрузка…");
      try {
        const { CreateMLCEngine } = await import("https://esm.run/@mlc-ai/web-llm");
        const models = [
          "SmolLM2-360M-Instruct-q4f16_1-MLC",
          "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
          "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC",
        ];
        let lastErr;
        for (const id of models) {
          try {
            this.engine = await CreateMLCEngine(id, {
              initProgressCallback: (r) => {
                const p = Math.round((r.progress || 0) * 100);
                this.setStatus((r.text || id) + " " + p + "%");
              },
            });
            this.setStatus("LLM ready");
            return this.engine;
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr || new Error("no model");
      } catch (e) {
        this.engine = null;
        this.setStatus("LLM offline · ядро");
        return null;
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  async chat(userText) {
    const eng = await this.ensure();
    if (!eng) {
      return "Локальная LLM ещё не загружена. Спросите про квант/запутанность — сработает без модели.";
    }
    const stream = await eng.chat.completions.create({
      messages: [
        { role: "system", content: "Ты АКСИ MATRIX. Отвечай по-русски кратко и по делу." },
        { role: "user", content: userText },
      ],
      temperature: 0.7,
      max_tokens: 280,
      stream: true,
    });
    let out = "";
    for await (const chunk of stream) {
      const t = chunk.choices?.[0]?.delta?.content || "";
      out += t;
    }
    return out || "Пустой ответ модели.";
  }
}
