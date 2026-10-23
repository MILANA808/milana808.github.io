const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../aksi-webllm.js"), "utf8");
const store = new Map();
const context = {
  console,
  navigator: { userAgent: "Desktop Browser" },
  localStorage: { getItem: key => store.has(key) ? store.get(key) : null, setItem: (key, value) => store.set(key, String(value)) },
  CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
  dispatchEvent: () => true
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: "aksi-webllm.js" });
const api = context.AKSI_WEBLLM;
assert.ok(api, "WebLLM helper API must load without loading a model");
const evidence = "EVIDENCE-START " + "evidence ".repeat(900) + " EVIDENCE-END";
const messages = api.packMessages("Summarize the sources", [], { system: evidence });
assert.equal(messages[0].role, "system");
assert.ok(messages[0].content.includes("EVIDENCE-START"), "the evidence context should be included");
assert.ok(messages[0].content.length > 3000, "the router should not silently truncate the context to 1,000 chars");
assert.ok(messages[0].content.length <= 10000, "system prompt must remain within the desktop budget");
assert.equal(messages[messages.length - 1].content, "Summarize the sources");
console.log("AKSI WebLLM evidence context budget tests: OK");
