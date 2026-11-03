/**
 * AKSI provider-neutral model adapter.
 *
 * Import this module from a user-initiated action. init() is intentionally
 * capability-neutral: it never requests a GPU adapter or downloads model code.
 * WebGPU probing and model loading happen only inside loadModel().
 */
const root = globalThis;

const state = {
  initialized: false,
  provider: null,
  phase: "idle",
  progress: 0,
  error: null,
  webgpu: null,
};

const adapters = new Map();

function snapshot(extra = {}) {
  return {
    initialized: state.initialized,
    provider: state.provider,
    phase: state.phase,
    ready: state.phase === "ready",
    loading: state.phase === "loading",
    progress: state.progress,
    webgpu: state.webgpu,
    error: state.error,
    ...extra,
  };
}

function assertAdapter(adapter) {
  for (const method of ["init", "loadModel", "generate", "status"]) {
    if (typeof adapter?.[method] !== "function") {
      throw new TypeError(`AKSI adapter must implement ${method}()`);
    }
  }
}

adapters.set("webllm", {
  async init() {
    if (!root.AKSI_WEBLLM) {
      throw new Error("AKSI_WEBLLM не найден. Подключите aksi-webllm.js перед вызовом.");
    }
    return { available: true, provider: "webllm" };
  },

  async loadModel(options = {}) {
    const runtime = root.AKSI_WEBLLM;
    if (typeof runtime.load !== "function") {
      throw new Error("WebLLM runtime не предоставляет load().");
    }
    const result = await runtime.load(options.modelId || null, options.onProgress);
    const providerStatus = runtime.status?.();
    if (typeof providerStatus?.webgpu === "boolean") state.webgpu = providerStatus.webgpu;
    return result;
  },

  async generate(prompt, options = {}) {
    const runtime = root.AKSI_WEBLLM;
    if (!runtime || typeof runtime.complete !== "function") {
      throw new Error("WebLLM runtime не предоставляет complete().");
    }
    return runtime.complete(prompt, options);
  },

  status() {
    return root.AKSI_WEBLLM?.status?.() || { ready: false };
  },
});

/**
 * Register another provider (for example Transformers.js or a backend).
 * The adapter must implement init(), loadModel(), generate(), and status().
 */
export function registerAdapter(name, adapter) {
  const key = String(name || "").trim().toLowerCase();
  if (!key) throw new TypeError("Adapter name is required.");
  assertAdapter(adapter);
  adapters.set(key, adapter);
  return { ok: true, provider: key };
}

/**
 * Select and initialize a provider without probing WebGPU or loading weights.
 */
export async function init(options = {}) {
  const provider = String(options.provider || state.provider || "webllm").toLowerCase();
  const adapter = adapters.get(provider);
  if (!adapter) {
    state.initialized = false;
    state.provider = provider;
    state.phase = "unavailable";
    state.error = `Провайдер "${provider}" не зарегистрирован.`;
    return snapshot();
  }

  state.provider = provider;
  state.phase = "initializing";
  state.error = null;
  try {
    const result = await adapter.init();
    state.initialized = true;
    state.phase = result?.available === false ? "unavailable" : "idle";
    if (result?.available === false) state.error = result.error || "Провайдер недоступен.";
    return snapshot({ providerStatus: result || null });
  } catch (error) {
    state.initialized = false;
    state.phase = "unavailable";
    state.error = String(error?.message || error);
    return snapshot();
  }
}

/**
 * Load model weights. Call only from an explicit user action (button click).
 */
export async function loadModel(options = {}) {
  if (!state.initialized || !state.provider) {
    await init({ provider: options.provider || "webllm" });
  }
  const adapter = adapters.get(state.provider);
  if (!adapter || !state.initialized) {
    throw new Error(state.error || "Сначала инициализируйте доступный AI-провайдер.");
  }

  state.phase = "loading";
  state.progress = 0;
  state.error = null;
  try {
    const result = await adapter.loadModel({
      ...options,
      onProgress(progress) {
        const value = Number(progress?.progress);
        state.progress = Number.isFinite(value)
          ? Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
          : state.progress;
        try { options.onProgress?.(snapshot({ providerStatus: progress || null })); } catch (callbackError) { void callbackError; }
      },
    });
    state.phase = "ready";
    state.progress = 100;
    return snapshot({ providerStatus: result || null });
  } catch (error) {
    state.phase = "failed";
    const providerStatus = adapters.get(state.provider)?.status?.();
    if (typeof providerStatus?.webgpu === "boolean") state.webgpu = providerStatus.webgpu;
    state.error = String(error?.message || error);
    throw error;
  }
}

/**
 * Generate text with the selected provider. No hidden fallback is performed.
 */
export async function generate(prompt, options = {}) {
  if (state.phase !== "ready") {
    return {
      text: null,
      source: state.provider || "none",
      error: state.error || "Модель не загружена. Нажмите кнопку загрузки модели.",
    };
  }
  const adapter = adapters.get(state.provider);
  if (!adapter) throw new Error("Текущий AI-провайдер больше не зарегистрирован.");
  return adapter.generate(String(prompt || ""), options);
}

/** Return normalized adapter and provider status. */
export function status() {
  const adapter = adapters.get(state.provider);
  let providerStatus = null;
  try { providerStatus = adapter?.status?.() || null; } catch (error) {
    providerStatus = { error: String(error?.message || error) };
  }
  return snapshot({ providerStatus, registeredProviders: [...adapters.keys()] });
}
