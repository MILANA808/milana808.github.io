const assert = require("node:assert/strict");
global.__AKSI_SEED = [
 { q: "что такое акси", a: "АКСИ — локальный помощник с памятью и вычислительными инструментами." },
 { q: "что такое квантовая суперпозиция", a: "Суперпозиция — математическое описание квантового состояния как комбинации базисных состояний." },
 { q: "почему небо голубое", a: "Воздух рассеивает коротковолновый синий свет сильнее красного." }
];
const store = new Map();
global.localStorage = { getItem:k=>store.get(k)||null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) };
const Engine = require("../aksi-dna-topology-engine.js");
assert.equal(Engine.version,"0.1.0");
const dna = Engine.topology(Engine.tokens("семантическая спираль смысл язык"));
assert.equal(dna.sequence.length,4);
assert.equal(dna.complement.length,4);
assert.equal(dna.invariant,"AKSI-DNA-SIGNATURE/1");
assert.match(dna.note,/не многочлен Джонса/);
const known = Engine.generate("что такое акси");
assert.match(known.text,/локальный помощник/);
assert.equal(known.mode,"retrieval_recombination");
assert.equal(known.source,"aksi-native-dna-topology");
const unknown = Engine.generate("объясни принцип сверхпроводимости в конкретном материале");
assert.equal(typeof unknown.text,"string");
assert.ok(unknown.text.length>30);
assert.equal(Engine.stats().episodes,2);
const rating = Engine.feedback("что такое акси",known.text,1);
assert.equal(rating.ok,true);
assert.equal(Engine.stats().learnedItems,1);
assert.ok(store.has("aksi_native_dna_topology_v1"));
Engine.clearMemory();
assert.equal(Engine.stats().episodes,0);
console.log("AKSI Native DNA-Topology Engine: all tests passed.");
