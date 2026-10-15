const assert = require('node:assert/strict');
const fs = require('node:fs');

const cluster = fs.readFileSync('cluster-lab/index.html', 'utf8');
const infinity = fs.readFileSync('infinity/index.html', 'utf8');

for (const [name, source] of [['cluster-lab', cluster], ['infinity', infinity]]) {
  assert.doesNotMatch(source, /https:\/\/milana-backend\.replit\.app|https:\/\/aksi-backend\.onrender\.com/,
    name + ' must not ship a hard-coded hosted backend');
}
assert.match(cluster, /get\("api"\)\|\|localStorage\.getItem\("aksi-backend-url"\)\|\|""/,
  'cluster-lab must use only an explicitly supplied API or saved opt-in');
assert.match(cluster, /if\(!API\)throw Error/,
  'cluster-lab must stop before network calls when no API is configured');
assert.match(infinity, /configuredBackend\|\|savedBackend\|\|''/,
  'infinity must prefer an explicit URL and otherwise stay unconfigured');
assert.match(infinity, /if\(last&&base\(\)\)/,
  'infinity must not resume a previous remote task without an explicitly configured backend');

console.log('AKSI default-backend isolation contract: OK');
