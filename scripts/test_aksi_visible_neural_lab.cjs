const assert = require("node:assert/strict");
const Lab = require("../aksi-visible-neural-lab.js");
(async()=>{
 const corpus=[
 "AKSI checks evidence.",
 "Models learn patterns from text.",
 "Test data must stay unseen.",
 "Loss measures prediction error.",
 "Memory does not make a fact true.",
 "Reproducible experiments record seeds.",
 "Neural weights change during training.",
 "A small model can generate imperfect text."
 ].join("\n");
 const a=await Lab.train({corpus,seed:1234,trainRatio:.75,epochs:2,hidden:8,contextSize:3});
 assert.equal(a.model.schema,"AKSI-CHAR-MLP/1");
 assert.equal(a.model.history.length,2);
 assert.ok(a.model.W1.some(x=>x!==0));
 assert.ok(Number.isFinite(a.model.metrics.train.crossEntropy));
 assert.ok(Number.isFinite(a.model.metrics.test.crossEntropy));
 assert.equal(a.model.metrics.split.train+a.model.metrics.split.test,a.model.metrics.split.total);
 const generated=Lab.generate(a.model,"AKSI",{maxChars:30,seed:9});
 assert.ok(generated.text.startsWith("AKSI"));
 assert.ok(generated.text.length>4);
 const exported=Lab.exportModel(a.model);
 const imported=Lab.importModel(exported);
 assert.equal(imported.schema,a.model.schema);
 assert.equal(imported.W1.length,a.model.W1.length);
 assert.ok(Number.isFinite(Lab.evaluate(imported,a.split.test).crossEntropy));
 const storage=new Map();global.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null};
 assert.equal(Lab.saveLocal(imported),true);
 const restored=Lab.loadLocal();assert.equal(restored.schema,imported.schema);assert.equal(restored.W2.length,imported.W2.length);
 const again=await Lab.train({corpus,seed:1234,trainRatio:.75,epochs:2,hidden:8,contextSize:3});
 assert.deepEqual(a.model.history,again.model.history);
 console.log("AKSI visible neural lab tests passed");
})().catch(e=>{console.error(e);process.exitCode=1;});
