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
  'liquidityAvailable!==true', 'tokenAddress'
]) {
  assert.ok(html.includes(required), `Missing required exchange behavior: ${required}`);
}
assert.ok(!html.includes("ZEROX_API_KEY"), "0x API key must never appear in the browser page");
assert.ok(!html.includes("BITCOIN_WIF"), "Bitcoin private keys must never appear in the browser page");
console.log("AKSI Exchange page syntax and safety checks passed.");
