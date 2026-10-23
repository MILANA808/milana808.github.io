const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const persistMatch = html.match(/function persist\(\)\{[^\n]*\}/);
const eventMatch = html.match(/function event\(kind,msg\)\{[^\n]*\}/);
assert.ok(persistMatch, 'persist() must exist in the chat page');
assert.ok(eventMatch, 'event() must exist in the chat page');
assert.doesNotMatch(persistMatch[0], /event\s*\(/,
  'persist() must never call event() from its storage-failure handler');

const state = { events: [] };
const fakeElement = { textContent: '', scrollTop: 0, scrollHeight: 0 };
const context = {
  state, STORE: 'test-store', JSON, Date, String,
  localStorage: { setItem() { throw new Error('quota exceeded'); } },
  $: () => fakeElement
};
vm.createContext(context);
vm.runInContext(persistMatch[0] + '\n' + eventMatch[0], context);

assert.equal(context.persist(), false, 'storage failure should return false');
assert.doesNotThrow(() => context.event('TEST', 'storage remains full'),
  'event logging must not recurse when localStorage is unavailable');
assert.equal(state.events.length, 1, 'event should be recorded once in memory');
console.log('AKSI chat storage-failure recursion regression: OK');
