#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const schemaPath = 'schemas/aksi-evidence-lifecycle-v1.schema.json';
const fixturePath = 'schemas/fixtures/aksi-evidence-lifecycle-v1.example.json';
const htmlPath = 'evidence-lifecycle/index.html';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const record = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');

assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(record.schema_version, 'AKSI-EVIDENCE-LIFECYCLE/1');
for (const key of ['schema_version','record_id','created_at','subject','context','sources','claims','hypotheses','decision','outcomes','revisions']) {
  assert.ok(Object.hasOwn(record, key), 'fixture missing required root field: ' + key);
}
assert.ok(Array.isArray(record.sources));
assert.ok(Array.isArray(record.claims));
assert.ok(Array.isArray(record.hypotheses));
assert.ok(Array.isArray(record.decision.alternatives) && record.decision.alternatives.length > 0);

const sourceIds = new Set(record.sources.map(x => x.id));
for (const item of record.context.items) for (const id of item.source_ids || []) assert.ok(sourceIds.has(id), 'unknown context source id: ' + id);
for (const claim of record.claims) for (const id of claim.source_ids || []) assert.ok(sourceIds.has(id), 'unknown claim source id: ' + id);
for (const hypothesis of record.hypotheses) for (const test of hypothesis.tests || []) for (const id of test.source_ids || []) assert.ok(sourceIds.has(id), 'unknown test source id: ' + id);
const alternativeIds = new Set(record.decision.alternatives.map(x => x.id));
assert.ok(record.decision.selected_alternative_id === null || alternativeIds.has(record.decision.selected_alternative_id), 'selected alternative must resolve');

const localRefs = [];
(function walk(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) localRefs.push({ref:value.$ref,path});
  for (const [k,v] of Object.entries(value)) walk(v, path + '.' + k);
})(schema);
for (const item of localRefs) {
  const parts = item.ref.slice(2).split('/');
  let cursor = schema;
  for (const part of parts) cursor = cursor && cursor[part.replace(/~1/g,'/').replace(/~0/g,'~')];
  assert.ok(cursor, 'unresolved schema reference ' + item.ref + ' at ' + item.path);
}

const scripts = [];
let pos = 0;
while ((pos = html.indexOf('<script', pos)) !== -1) {
  const start = html.indexOf('>', pos);
  const end = html.indexOf('</script>', start + 1);
  if (start < 0 || end < 0) break;
  const script = html.slice(start + 1, end);
  if (script.trim()) scripts.push(script);
  pos = end + '</script>'.length;
}
assert.ok(scripts.length > 0, 'verifier page should include a script');
scripts.forEach((script, i) => {
  execFileSync(process.execPath, ['--check'], { input: script, stdio: ['pipe','pipe','pipe'] });
});
assert.ok(html.includes('AKSI-EVIDENCE-LIFECYCLE-VERIFIER/1'));
assert.match(html, /не подтверждает достоверность источников/i);

console.log('AKSI Evidence Lifecycle contract checks passed.');
console.log('- schema and fixture parse');
console.log('- required record fields exist');
console.log('- source references and selected alternative resolve');
console.log('- local schema references resolve');
console.log('- verifier inline JavaScript syntax passes');
