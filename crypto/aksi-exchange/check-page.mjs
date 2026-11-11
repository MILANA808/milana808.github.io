import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageUrl = new URL("../../aksi-exchange/index.html", import.meta.url);
const html = readFileSync(pageUrl, "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, "Expected exactly one inline application script");
new Function(scripts[0][1]);

for (const required of [
  'id="worker"', 'id="getQuote"', 'id="execute"', 'id="checkTx"',
  'window.ethereum', 'signPsbt', 'pushPsbt', '/status',
  'liquidityAvailable!==true', 'tokenAddress', 'BTC_NATIVE_ID', 'eth_sendTransaction', 'eth_call', 'q.sellAmount!==amount'
]) {
  assert.ok(html.includes(required), `Missing required exchange behavior: ${required}`);
}
assert.ok(!html.includes("ZEROX_API_KEY"), "0x API key must never appear in the browser page");
assert.ok(!html.includes("BITCOIN_WIF"), "Bitcoin private keys must never appear in the browser page");
console.log("AKSI Exchange page syntax and safety checks passed.");

const preflight = readFileSync(new URL("../aksi-swap-worker/scripts/preflight.mjs", import.meta.url), "utf8");
assert.ok(preflight.includes("eth_getCode"), "Deployment preflight must verify Base contract bytecode");
assert.ok(preflight.includes("AKSI") && preflight.includes("decimals !== 18"), "Deployment preflight must verify AKSI metadata");
const deployWorkflow = readFileSync(new URL("../../.github/workflows/deploy-aksi-swap-worker.yml", import.meta.url), "utf8");
assert.ok(deployWorkflow.includes("workflow_dispatch"), "Worker deployment must be manually triggered");
assert.ok(deployWorkflow.includes("DEPLOY_AKSI_WORKER"), "Worker deployment must require an explicit confirmation phrase");
assert.ok(!/^  push:/m.test(deployWorkflow), "Worker deployment must not run automatically on pushes");
console.log("AKSI Worker deployment guard checks passed.");
