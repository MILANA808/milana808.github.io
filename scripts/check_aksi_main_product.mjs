import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const scriptStart = html.indexOf("<script>\n(function(){");
assert.notEqual(scriptStart, -1, "main product script must exist");
const bodyStart = scriptStart + "<script>".length;
const scriptEnd = html.indexOf("</script>", bodyStart);
assert.ok(scriptEnd > bodyStart, "main product script must close");
new Function(html.slice(bodyStart, scriptEnd));

for (const marker of [
  'id="aksiModelStatus"', 'id="aksiRememberTurns"', 'id="aksiUseWeb"', 'id="aksiClearMemory"',
  'src="/aksi-dna-topology-engine.js?v=1"', 'src="/aksi-internet.js"', 'src="/aksi-calculator.js"',
  "window.AKSI_UNIFIED_CORE.answer", "window.AKSI_INTERNET.gather",
  "state.history=state.history.slice(-60)", "if(!Array.isArray(state.history))state.history=[];",
  "AKSI Native Generator", "Источники для самостоятельной проверки:"
]) assert.ok(html.includes(marker), "missing main-product capability: " + marker);

assert.ok(html.indexOf('src="/aksi-dna-topology-engine.js?v=1"') < scriptStart, "native generator must load before the main app script");
assert.ok(!html.includes('src="/aksi-webllm.js"'), "main chat must not depend on WebLLM");
assert.ok(html.indexOf("window.AKSI_UNIFIED_CORE.answer") < html.indexOf("if(/кто ты|представься/.test(n))"), "native generator must take priority over canned answers");
assert.ok(html.indexOf('src="/aksi-internet.js"') < scriptStart, "source lookup must load before the main app script");
assert.ok(html.includes("if($('aksiRememberTurns').checked)"), "conversation persistence must be opt-in");
assert.ok(html.includes("if(!$('aksiUseWeb').checked)"), "old evidence must be hidden when web lookup is disabled");
assert.ok(html.includes("if($('aksiUseWeb').checked){"), "opt-in web search must run when explicitly enabled");
assert.ok(!html.includes("if(false && $('aksiUseWeb').checked){"), "web search must not be permanently disabled");

const ctx = {};
vm.runInNewContext(fs.readFileSync("aksi-calculator.js", "utf8"), ctx);
const calc = ctx.AKSICalculator;
for (const [expr, expected] of [["2+2*3",8], ["(2+3)^2",25], ["-3^2",-9], ["2^-2",0.25], ["sqrt(81)",9]]) {
  assert.equal(calc.evaluate(expr).value, expected, "math regression: " + expr);
}
for (const expr of ["1/0", "window.alert(1)", "", "2+", "1e309"]) {
  assert.equal(calc.evaluate(expr).ok, false, "unsafe/invalid expression must fail: " + expr);
}
console.log("AKSI main product checks: OK");
