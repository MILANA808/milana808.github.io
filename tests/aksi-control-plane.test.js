const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');

const root = process.cwd();
const verifierPath = 'aksi-kernel/verify/ResultVerifier.js';
assert.ok(fs.existsSync(verifierPath), 'ResultVerifier missing');
assert.ok(fs.existsSync('benchmark/tasks-v1.json'), 'benchmark tasks missing');

const probe = `
import { ResultVerifier } from './aksi-kernel/verify/ResultVerifier.js';
const v = new ResultVerifier();
console.log(JSON.stringify({
  pass: v.verify({status:'ok'}, {status:'ok'}),
  fail: v.verify({status:'ok'}, {status:'error'})
}));
`;
const out = execFileSync(process.execPath, ['--input-type=module','-e',probe], {encoding:'utf8'});
const r = JSON.parse(out.trim());
assert.equal(r.pass.status, 'VERIFIED');
assert.equal(r.fail.status, 'FAILED');

const tasks = JSON.parse(fs.readFileSync('benchmark/tasks-v1.json','utf8'));
assert.equal(tasks.length, 10);
assert.equal(new Set(tasks.map(x=>x.id)).size, 10);

console.log('AKSI control-plane contract PASS');
