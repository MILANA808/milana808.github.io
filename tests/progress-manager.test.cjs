const assert = require("node:assert/strict");
const { award } = require("../modules/progress-manager.js");

const state = { xp: 0, actionRewards: [] };
const day = new Date("2026-11-04T12:00:00.000Z");
assert.equal(award(state, "note:alpha", 10, day).awarded, true);
assert.equal(state.xp, 10);
assert.equal(award(state, "note:alpha", 10, day).awarded, false);
assert.equal(state.xp, 10);
assert.equal(award(state, "math:expression", 5, day).awarded, true);
assert.equal(state.xp, 15);
console.log("AKSI Progress Manager tests: OK");
