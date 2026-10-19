const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Cortex session does not fall back to a hard-coded default password', () => {
  const source = fs.readFileSync('aksi-bot.js', 'utf8');
  assert.doesNotMatch(source, /DEFAULT_CORTEX_PW/);
  assert.match(source, /if \(!G\.AKSI_CORTEX_KERNEL \|\| !cortexPw\(\)\) return null/);
  assert.match(source, /sessionStorage\.removeItem\("aksi_cortex_pw"\)/);
});
