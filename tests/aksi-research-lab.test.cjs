const test = require("node:test");
const assert = require("node:assert/strict");
const lab = require("../aksi-research-lab.js");

test("Bayes posterior uses explicit likelihoods",()=>{
 const r=lab.bayes(.2,.8,.1);
 assert.ok(Math.abs(r.posterior-2/3)<1e-10);
});
test("Bayes rejects zero-probability evidence",()=>{
 assert.throws(()=>lab.bayes(.2,0,0),/нулевую вероятность/);
});
test("gradient descent approaches convex minimum",()=>{
 const r=lab.gradientDescent(-4,.15,40);
 assert.ok(Math.abs(r.minimumX-3)<1e-4);
 assert.ok(r.minimumLoss<1e-8);
});
test("gradient descent rejects unsafe parameters",()=>{
 assert.throws(()=>lab.gradientDescent(0,2,40));
 assert.throws(()=>lab.gradientDescent(0,.1,1000));
});
test("five-fold partition is disjoint and complete",()=>{
 const r=lab.makeFolds(20,5);
 assert.equal(r.folds.length,5);
 assert.equal(r.uniqueCount,20);
 assert.equal(r.disjoint,true);
 assert.equal(r.complete,true);
});
test("fold partition rejects too few samples",()=>{
 assert.throws(()=>lab.makeFolds(3,5));
});
