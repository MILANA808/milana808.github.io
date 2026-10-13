const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const d=JSON.parse(fs.readFileSync(path.join(__dirname,"../datasets/aksi-archive-theorem-corpus-v1.json"),"utf8"));
assert.equal(d.schema,"AKSI-TRANSPARENT-TRAINING-DATASET/1");
assert.ok(d.entries.length>=20);
assert.ok(d.sources.length>=8);
const ids=new Set(d.sources.map(s=>s.id));
for(const e of d.entries){assert.ok(e.id&&e.label&&e.text);assert.ok(e.sourceIds.length>0);for(const id of e.sourceIds)assert.ok(ids.has(id),`unknown source ${id} in ${e.id}`);}
assert.ok(d.entries.some(e=>e.id==="bayes-theorem"));
assert.ok(d.entries.some(e=>e.id==="sha256"));
assert.ok(d.entries.some(e=>e.id==="archive-2025-11-03-ed25519"&&e.caveat.includes("placeholder")));
assert.ok(d.entries.some(e=>e.id==="integrity-not-truth"));
console.log("AKSI archive + theorem corpus validation passed");
