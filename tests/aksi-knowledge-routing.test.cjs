const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert.match(html, /let m=\/\^запомни\\s\+факт\\s\*\[:：\]\/i\.test\(q\)\?null:q\.match/);
assert.ok(html.indexOf("answerRouter.answer(q") < html.indexOf("window.AKSI_UNIFIED_CORE?await window.AKSI_UNIFIED_CORE.answer"));
assert.ok(html.indexOf('src="/aksi-knowledge-base.js?v=2"') < html.indexOf('src="/aksi-answer-router.js?v=3"'));
console.log("AKSI knowledge command routing contract: OK");
