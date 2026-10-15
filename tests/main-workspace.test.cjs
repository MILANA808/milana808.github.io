#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const adapter = fs.readFileSync('aksi-webllm.js', 'utf8');
const demo = fs.readFileSync('demo/index.html', 'utf8');

for (const id of ['aksiLocalModelPanel','aksiLocalModelSelect','aksiLoadLocalModel','aksiUnloadLocalModel','aksiLocalModelStatus','aksiModelProgress']) {
  assert.ok(html.includes('id="' + id + '"'), 'main workspace missing model control: ' + id);
}
assert.ok(html.includes('<script src="/aksi-webllm.js?v=5.0.0"></script>'), 'model adapter must load before inline workspace initialization');
assert.ok(html.indexOf('<script src="/aksi-webllm.js?v=5.0.0"></script>') < html.indexOf('<script>\n(function(){'), 'adapter script must precede workspace script');
assert.ok(adapter.includes('complete: complete') && adapter.includes('load: loadModel') && adapter.includes('unload: unload'), 'adapter API contract changed');
assert.ok(html.includes('window.AKSI_WEBLLM.complete(q'), 'chat should use loaded browser-local language model');
assert.ok(html.includes('window.AKSI_WEBLLM.ready()'), 'chat must only call local generation when model is ready');
assert.ok(html.includes('вывод модели не является независимой проверкой фактов'), 'model answer must retain factual limitation notice');
assert.ok(html.includes('Выгрузить') && html.includes('Загрузить модель'), 'user must be able to load and unload the model');
assert.ok(demo.includes('id="langToggle"') && demo.includes('Switch to Russian') && demo.includes('Switch to English'), 'public demo should expose RU/EN language control');

const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(m => !/\bsrc\s*=/.test(m[1]) && !/application\/ld\+json/i.test(m[1]))
  .map(m => m[2]).filter(s => s.trim());
assert.ok(inlineScripts.length > 0, 'main page should contain its workspace controller');
inlineScripts.forEach((script, i) => new vm.Script(script, { filename: 'index.html:inline-script-' + i }));

console.log('AKSI main workspace smoke tests passed.');
console.log('- browser-local model controls and adapter load order');
console.log('- local generation route, readiness gate, load/unload controls');
console.log('- explicit model limitation notice');
console.log('- bilingual public demo toggle');
console.log('- main inline JavaScript syntax');
