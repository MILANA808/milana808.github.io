import fs from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const html = fs.readFileSync("aixi-lab/index.html", "utf8");
const start = html.indexOf("<script>");
const end = html.indexOf("</script>", start + 8);
if (start < 0 || end < 0) throw new Error("Inline application script not found");
const script = html.slice(start + 8, end);
for (const marker of ["id=" + String.fromCharCode(34) + "run" + String.fromCharCode(34), "id=" + String.fromCharCode(34) + "chart" + String.fromCharCode(34), "id=" + String.fromCharCode(34) + "export" + String.fromCharCode(34), "localStorage", "sameSeedSameOutput", "NOT AIXI ITSELF"]) {
  if (!html.includes(marker)) throw new Error("Required lab feature missing: " + marker);
}
for (const forbidden of ["fetch(", "XMLHttpRequest", "new WebSocket"]) {
  if (script.includes(forbidden)) throw new Error("Lab must remain browser-local; found " + forbidden);
}
const temp = path.join(os.tmpdir(), "aksi-aixi-lab-check.js");
fs.writeFileSync(temp, script, "utf8");
const result = spawnSync(process.execPath, ["--check", temp], { encoding: "utf8" });
fs.rmSync(temp, { force: true });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
console.log("AKSI AIXI-inspired Decision Lab: static integrity PASS");
console.log("Validated inline JavaScript syntax, core controls, reproducibility marker, and no network API dependency.");
