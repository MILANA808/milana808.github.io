import { createHash } from 'node:crypto';

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
}

function hash(value) {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function containsExpected(expected, actual) {
  if (expected === undefined) return { matched: true, reason: 'no_expected_state' };
  if (expected === null || typeof expected !== 'object') {
    return { matched: stable(actual) === stable(expected), reason: 'scalar_equality' };
  }
  if (!actual || typeof actual !== 'object') return { matched: false, reason: 'actual_not_object' };
  const checks = Object.entries(expected).map(([k, v]) => ({
    key: k,
    expected: v,
    actual: actual[k],
    matched: stable(actual[k]) === stable(v)
  }));
  return { matched: checks.every(x => x.matched), reason: 'field_equality', checks };
}

export class ResultVerifier {
  verify(expected, actual) {
    const r = containsExpected(expected, actual);
    return {
      status: r.matched ? 'VERIFIED' : 'FAILED',
      expected_hash: hash(expected),
      actual_hash: hash(actual),
      reason: r.reason,
      checks: r.checks || []
    };
  }
}

export default ResultVerifier;
