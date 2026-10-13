const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /const neuralMatch=String\(q\)\.match\(\/\^\\\\s\*/);
assert.doesNotMatch(html, /const neuralMatch=String\(q\)\.match\(\/\^\\\\\\\\s\*/);
assert.match(html, /q\.replace\(\/\^\\\\s\*/);
assert.match(html, /generated\.text\+"\\\\n\\\\n\[/);
assert.match(html, /\.join\('\\\\n'\)/);
assert.match(html, /\.join\('\\\\n\\\\n'\)/);

const command = /^\s*(?:нейросеть|нейронная модель|генерация)\s*[:：]\s*([\s\S]+)$/i;
assert.equal(command.exec('нейросеть: проверь модель')[1], 'проверь модель');
assert.equal(command.exec('  генерация：пример')[1], 'пример');

console.log('AKSI main chat runtime escape checks passed.');
