/**
 * AKSI LLM boot (ES module)
 */
const VER = "1.0.0-boot";
const WEBLLM = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm";
const WEBLLM2 = "https://unpkg.com/@mlc-ai/web-llm@0.2.84/+esm";
const XF = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

let engine = null, pipe = null, backend = null, model = null;
let loading = false, progress = 0, message = "idle", error = null;

function status() {
  return { version: VER, ready: !!(engine || pipe), loading, progress, message, model, backend, error, webgpu: !!(typeof navigator !== "undefined" && navigator.gpu) };
}
function emit() {
  try { window.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: status() })); } catch (_) {}
}

async function hasWebGPU() {
  try {
    if (!navigator.gpu) return false;
    const a = await navigator.gpu.requestAdapter();
    return !!a;
  } catch { return false; }
}

async function loadWebLLM(modelId = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC") {
  message = "WebLLM runtime\u2026"; progress = 5; emit();
  let mod;
  try { mod = await import(WEBLLM); } catch { mod = await import(WEBLLM2); }
  const CreateMLCEngine = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
  if (!CreateMLCEngine) throw new Error("CreateMLCEngine missing");
  message = "download weights\u2026"; progress = 10; emit();
  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (r) => {
      if (r && r.progress != null) progress = Math.round(r.progress * 100);
      if (r && r.text) message = String(r.text).slice(0, 160);
      emit();
    }
  });
  pipe = null; backend = "webllm"; model = modelId; progress = 100; message = "ready WebLLM"; loading = false; error = null; emit();
  return status();
}

async function loadWASM(modelId = "Xenova/LaMini-Flan-T5-248M") {
  message = "Transformers WASM\u2026"; progress = 8; emit();
  const mod = await import(XF);
  const pipeline = mod.pipeline || (mod.default && mod.default.pipeline);
  if (!pipeline) throw new Error("pipeline missing");
  try { if (mod.env) { mod.env.allowLocalModels = false; mod.env.useBrowserCache = true; } } catch {}
  const task = /T5|LaMini|flan/i.test(modelId) ? "text2text-generation" : "text-generation";
  pipe = await pipeline(task, modelId, {
    progress_callback: (p) => {
      if (p && p.progress != null) progress = Math.max(10, Math.min(95, Math.round(p.progress)));
      if (p && p.status) message = p.status + (p.file ? " \u00b7 " + p.file : "");
      emit();
    }
  });
  engine = null; backend = "transformers"; model = modelId; progress = 100; message = "ready WASM"; loading = false; error = null; emit();
  return status();
}

async function autoLoad(opts = {}) {
  if (engine || pipe) return status();
  if (loading) return status();
  loading = true; error = null; emit();
  try {
    if (opts.modelId && String(opts.modelId).startsWith("Xenova/")) return await loadWASM(opts.modelId);
    const gpu = await hasWebGPU();
    if (!gpu) { message = "no WebGPU \u2192 WASM"; emit(); return await loadWASM("Xenova/LaMini-Flan-T5-248M"); }
    try { return await loadWebLLM(opts.modelId || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"); }
    catch (e) { error = String(e.message || e); message = "WebLLM fail \u2192 WASM"; emit(); return await loadWASM("Xenova/LaMini-Flan-T5-248M"); }
  } catch (e) {
    loading = false; error = String(e.message || e); message = "error: " + error.slice(0, 120); emit(); return status();
  }
}

async function complete(prompt, opts = {}) {
  const system = opts.system || "\u0422\u044b \u0410\u041a\u0421\u0418. \u041a\u0440\u0430\u0442\u043a\u043e \u0438 \u0447\u0435\u0441\u0442\u043d\u043e.";
  if (backend === "webllm" && engine) {
    const reply = await engine.chat.completions.create({
      messages: [{ role: "system", content: system }, { role: "user", content: String(prompt).slice(0, 6000) }],
      temperature: 0.6, max_tokens: opts.max_tokens || 400, stream: false
    });
    const text = reply && reply.choices && reply.choices[0] && reply.choices[0].message ? String(reply.choices[0].message.content || "").trim() : "";
    return { text, source: "webllm", model, backend };
  }
  if (backend === "transformers" && pipe) {
    const q = String(prompt).slice(0, 1200);
    const input = /T5|LaMini|flan/i.test(model || "") ? q : ("<|user|>\n" + q + "\n<|assistant|>\n");
    const out = await pipe(input, { max_new_tokens: opts.max_tokens || 160, temperature: 0.7, do_sample: true });
    let text = Array.isArray(out) ? (out[0] && (out[0].generated_text || out[0].translation_text) || "") : "";
    text = String(text).replace(input, "").trim();
    if (text.startsWith(q)) text = text.slice(q.length).trim();
    return { text, source: "transformers", model, backend };
  }
  return { text: null, error: "not loaded" };
}

const api = {
  version: VER, status, autoLoad, load: autoLoad, complete,
  think: (q) => complete(q).then(r => r && r.text ? r : null),
  ready: () => !!(engine || pipe),
  models: ["Qwen2.5-0.5B-Instruct-q4f16_1-MLC", "Xenova/LaMini-Flan-T5-248M"],
  backend: () => backend,
  unload() { engine = null; pipe = null; backend = null; model = null; message = "unloaded"; emit(); }
};

window.AKSI_WEBLLM = Object.assign(window.AKSI_WEBLLM || {}, api);
window.AKSI_LLM_BOOT = api;

const auto = window.AKSI_WEBLLM_AUTO !== false && (
  document.documentElement.getAttribute("data-aksi-autoload") === "1" ||
  (document.body && document.body.getAttribute("data-aksi-autoload") === "1") ||
  window.AKSI_WEBLLM_AUTO === true
);
if (auto) setTimeout(() => { autoLoad().catch(() => {}); }, 400);

export { autoLoad, complete, status };
