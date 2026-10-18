const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const core = fs.readFileSync('aksi-unified-adaptive-core.js', 'utf8');

assert.ok(core.includes('const neuralRequest = String(query == null ? "" : query).match(/^\\s*'), 'neural command must use a real whitespace regex in the unified core');
assert.ok(!html.includes('const neuralMatch=String(q).match('), 'main page must not bypass the unified core for neural requests');
assert.ok(core.includes('const command = original.match(/^(?:вычисли|посчитай|реши|сколько будет|calculate|compute|evaluate)\\s+(.+)$/i)'), 'calculator command prefix must accept whitespace in the unified core');
assert.ok(core.includes('root.AKSICalculator.evaluate(math.expression)'), 'arithmetic must call the existing safe calculator');
assert.ok(core.includes('generated.text + "\\n\\n["'), 'neural model caveat must render on separate lines');
assert.ok(html.includes(".join('\\\\n')"), 'lists must join with actual newline escape sequences');
assert.ok(html.includes(".join('\\\\n\\\\n')"), 'paragraphs must join with blank lines');
assert.ok(html.includes('id="aksiUseBackend"'), 'server model must be opt-in');
assert.ok(html.includes("backend('/api/chat'"), 'opt-in server model must call the backend chat route');
assert.ok(html.includes('using local fallback'), 'backend failure must preserve the local fallback');

const command = /^\s*(?:нейросеть|нейронная модель|генерация)\s*[:：]\s*([\s\S]+)$/i;
assert.equal(command.exec('нейросеть: проверь модель')[1], 'проверь модель');
assert.equal(command.exec('  генерация：пример')[1], 'пример');

console.log('AKSI main chat runtime escape checks passed.');
