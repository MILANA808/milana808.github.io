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
  'id="aksiModel"', 'id="aksiLoadModel"', 'id="aksiUnloadModel"',
  'id="aksiRememberTurns"', 'id="aksiUseWeb"', 'id="aksiClearMemory"',
  'src="/aksi-webllm.js"', 'src="/aksi-internet.js"', 'src="/aksi-calculator.js"',
  "window.AKSI_WEBLLM.complete", "window.AKSI_INTERNET.gather",
  "state.history=state.history.slice(-60)", "state.history=[];state.memory={};",
  "Языковая модель не загружена", "Источники:"
]) assert.ok(html.includes(marker), "missing main-product capability: " + marker);

assert.ok(html.indexOf('src="/aksi-webllm.js"') < scriptStart, "WebLLM must load before the main app script");
assert.ok(html.indexOf('src="/aksi-internet.js"') < scriptStart, "source lookup must load before the main app script");
assert.ok(html.includes("if($('aksiRememberTurns').checked)"), "conversation persistence must be opt-in");
assert.ok(html.includes("if(!$('aksiUseWeb').checked)"), "old evidence must be hidden when web lookup is disabled");

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
