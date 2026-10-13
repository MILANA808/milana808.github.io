const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');

assert.ok(html.includes('const neuralMatch=String(q).match(/^\\s*'), 'neural command must use a real whitespace regex');
assert.ok(!html.includes('const neuralMatch=String(q).match(/^\\\\s*'), 'neural command must not match a literal backslash');
assert.ok(html.includes("q.replace(/^\\s*(?:посчитай|вычисли|сколько будет)\\s*/i"), 'calculator command prefix must accept whitespace');
assert.ok(html.includes('generated.text+"\\n\\n['), 'neural model caveat must render on separate lines');
assert.ok(html.includes(".join('\\n')"), 'lists must join with actual newline escape sequences');
assert.ok(html.includes(".join('\\n\\n')"), 'paragraphs must join with blank lines');

const command = /^\\s*(?:нейросеть|нейронная модель|генерация)\\s*[:：]\\s*([\\s\\S]+)$/i;
assert.equal(command.exec('нейросеть: проверь модель')[1], 'проверь модель');
assert.equal(command.exec('  генерация：пример')[1], 'пример');

console.log('AKSI main chat runtime escape checks passed.');
