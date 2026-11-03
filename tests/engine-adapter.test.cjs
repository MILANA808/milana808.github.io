const assert = require("node:assert/strict");

(async () => {
  let gpuRequests = 0;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      gpu: {
        async requestAdapter() {
          gpuRequests += 1;
          return {};
        },
      },
    },
  });

  let loaded = false;
  globalThis.AKSI_WEBLLM = {
    async load(_modelId, onProgress) {
      await globalThis.navigator.gpu.requestAdapter();
      loaded = true;
      onProgress?.({ progress: 0.5, message: "half" });
      return { model: "mock-model" };
    },
    async complete(prompt) {
      return { text: `mock: ${prompt}`, source: "webllm" };
    },
    status() {
      return { ready: loaded, model: loaded ? "mock-model" : null };
    },
  };

  const api = await import("../modules/engine-adapter.mjs");

  const initialized = await api.init();
  assert.equal(initialized.initialized, true);
  assert.equal(gpuRequests, 0, "init() must not prompt for WebGPU");

  const beforeLoad = api.status();
  assert.equal(beforeLoad.ready, false);
  assert.equal(beforeLoad.webgpu, null);

  const result = await api.loadModel();
  assert.equal(result.ready, true);
  assert.equal(gpuRequests, 1, "loadModel() should perform the explicit GPU check");

  const answer = await api.generate("hello");
  assert.equal(answer.text, "mock: hello");

  const unavailable = await api.init({ provider: "not-installed" });
  assert.equal(unavailable.phase, "unavailable");
  assert.equal(unavailable.ready, false);

  console.log("AKSI engine adapter tests: OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
