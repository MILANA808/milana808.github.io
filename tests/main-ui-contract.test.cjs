const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const memoryBridge = fs.readFileSync("aksi-q-site-memory.js", "utf8");
const initStart = html.indexOf("function initLocalModel(");
const initEnd = html.indexOf("function prepareLocalModel()", initStart);
assert.ok(initStart >= 0 && initEnd > initStart, "lazy model UI initializer exists");
const initBlock = html.slice(initStart, initEnd);
assert.equal(initBlock.includes("navigator.gpu"), false, "initializing the model UI must not probe WebGPU");
assert.equal(html.includes("initLocalModel();\nconst STORE"), false, "model UI must not initialize on page load");
const initialStatus = html.slice(html.indexOf('id="aksiLocalModelStatus"'), html.indexOf("</div>", html.indexOf('id="aksiLocalModelStatus"')));
assert.match(initialStatus, /Ожидание команды/);
assert.doesNotMatch(initialStatus, /Проверяю поддержку WebGPU/);
assert.match(html, /function startLocalModelLoad\(\)/);
assert.equal(html.includes('<script src="/aksi-webllm.js'), false, "WebLLM script must not load on initial page view");
assert.ok(html.includes("script.src='/aksi-webllm.js"), "WebLLM script must load after user action");
assert.match(html, /import\('\/modules\/engine-adapter\.mjs'\)/);
assert.match(html, /setTimeout\(\(\)=>finish\(false/);
assert.match(html, /2500/);
assert.match(html, /id="aksiProveAnswer"/);
assert.match(html, /id="aksiProofOutput"/);
assert.match(html, /function buildEvidencePassport\(/);
assert.match(html, /recordActionEvidence\(\x27mission:/);
assert.match(html, /lastEvidencePassport=await buildEvidencePassport\(q,a\)/);
assert.doesNotMatch(html, /#missions\{display:none!important\}/, "mission section must remain visible");
assert.match(html, /function universeReact\(kind\)/);
assert.match(html, /window\.location\.href='\/quantum-mind\/'/);
console.log("AKSI main UI contract tests: OK");

assert.match(html, /AKSI_DNA_TOPOLOGY\.clearMemory\(\)/, "clear-memory control must clear native generator history and approved feedback");
assert.match(html, /AKSI_UNIFIED_CORE\.clearMemory\(\)/, "clear-memory control must clear unified-core memory");
assert.match(html, /AKSIKnowledgeBase\.clear\(\)/, "clear-memory control must clear user knowledge-base facts");
assert.match(html, /AKSIDialogueIntelligence\.clearContext\(\)/, "clear-memory control must clear dialogue context");
assert.match(html, /const failed=storageChecks\.filter\(x=>!x\.ok\)/, "clear-memory control must verify persistent store deletion");
assert.match(html, /const requiredStores=\[/, "clear-memory must require all expected store modules");
assert.match(html, /if\(missingStores\.length\)throw new Error/, "clear-memory must fail closed if a store module is missing");

assert.match(html, /if\(!persist\(\)\)throw new Error/, "clear-memory control must verify empty UI state persistence");


assert.match(html, /AKSI_SITE_MEMORY\.clear\(\)/, "clear-memory control must clear IndexedDB notes");
assert.match(html, /window\.AKSI_SITE_MEMORY_CONTEXT=\{\}/, "clear-memory control must clear in-memory prompt context");
assert.match(html, /Не удалось подтвердить полную очистку памяти/, "clear-memory control must not claim success when storage deletion fails");
assert.match(memoryBridge, /ready: ready/);
assert.match(memoryBridge, /await ready;\s*const result = await store\.clear\(\)/, "clear must wait for the initial migration to finish");
