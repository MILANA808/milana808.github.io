const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('channel renders message and metadata through text APIs, not HTML parsing', () => {
  const source = fs.readFileSync('aksi-channel.js', 'utf8');
  assert.match(source, /createTextNode\(String\(t == null \? "" : t\)\)/);
  assert.match(source, /metadata\.textContent = String\(meta == null \? "" : meta\)/);
  assert.doesNotMatch(source, /d\.innerHTML\s*=\s*'<div class="bub">'/);
});
