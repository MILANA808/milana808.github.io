import fs from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const htmlPath = "aixi-lab/index.html";
const html = fs.readFileSync(htmlPath, "utf8");
const scriptMatch = html.match(/<script>([\\s\\S]*?)<\\/script>/i);
if (!scriptMatch) throw new Error("Inline application script not found");
for (const marker of ["id=\"run\"", "id=\"chart\"", "id=\"export\"", "localStorage", "sameSeedSameOutput", "NOT AIXI ITSELF"]) {
  if (!html.includes(marker)) throw new Error("Required lab feature missing: " + marker);
}
if (/\\b(fetch|XMLHttpRequest|WebSocket)\\b/.test(scriptMatch[1])) {
  throw new Error("Lab must remain browser-local without network APIs");
}
const temp = path.join(os.tmpdir(), "aksi-aixi-lab-check.js");
fs.writeFileSync(temp, scriptMatch[1], "utf8");
const result = spawnSync(process.execPath, ["--check", temp], { encoding: "utf8" });
fs.rmSync(temp, { force: true });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
console.log("AKSI AIXI-inspired Decision Lab: static integrity PASS");
console.log("Validated inline JavaScript syntax, core controls, reproducibility marker, and no network API dependency.");
