// Browser-console / Playwright-compatible smoke tests for AKSI Core v3.
// Load ../aksi-core-v3.js before running.
(async()=>{
  const assert=(x,m)=>{if(!x)throw new Error(m)};
  const c=[
    {text:'A',evidence:.9,coherence:.9,agreement:.9,freshness:.9,provenance:.9,type:'inference'},
    {text:'B',evidence:.4,coherence:.5,agreement:.4,freshness:.5,provenance:.3,type:'uncertain'},
    {text:'C',evidence:.7,coherence:.6,agreement:.7,freshness:.8,provenance:.7,type:'inference'}
  ];
  const a=await AKSICoreV3.run('reproducibility',c,{mode:'deterministic',lambda:.35,counterfactual:.15});
  const b=await AKSICoreV3.run('reproducibility',c,{mode:'deterministic',lambda:.35,counterfactual:.15});
  assert(JSON.stringify(a.result)===JSON.stringify(b.result),'deterministic replay failed');
  assert(Math.abs(a.calibration.quantum.reduce((x,y)=>x+y,0)-1)<1e-12,'quantum probabilities do not normalize');
  assert(Math.abs(a.calibration.classical.reduce((x,y)=>x+y,0)-1)<1e-12,'classical probabilities do not normalize');
  assert(a.receipt.payload_hash.length===64,'payload hash malformed');
  assert(a.receipt.receipt_hash.length===64,'receipt hash malformed');
  console.log('AKSI Core v3 smoke tests: PASS');
  return a;
})();
