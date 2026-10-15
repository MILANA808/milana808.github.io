const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/aksi-self-apply.yml', 'utf8');

assert.match(workflow, /permissions:\s+contents:\s+write\s+pull-requests:\s+write/m,
  'workflow must declare only the write permissions it needs');
assert.match(workflow, /peter-evans\/create-pull-request@v7/,
  'learning updates must be proposed as a pull request');
assert.doesNotMatch(workflow, /\bgit\s+push\b/,
  'self-apply must never push directly to a branch');
assert.match(workflow, /fact\.length\s*>\s*2000/,
  'input length must be bounded');
assert.match(workflow, /unsupported control characters/,
  'control characters must be rejected');
assert.match(workflow, /JSON\.parse\(fs\.readFileSync/,
  'existing learning data must be parsed');
assert.match(workflow, /refusing to overwrite it/,
  'invalid schema must fail closed rather than erase data');
assert.match(workflow, /data\.items\.some\(item => item && item\.text === fact\)/,
  'duplicate notes must be ignored');
assert.match(workflow, /data\.items\.length\s*>\s*500/,
  'learning history must be bounded');

console.log('AKSI self-apply workflow safety contract: OK');
