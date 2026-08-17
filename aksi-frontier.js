(()=>{'use strict';
/* AKSI FRONTIER LAYER v1
 * Capability orchestrator. Detects real platform capabilities and exposes only those that exist.
 * No fake quantum advantage, no fake PQC, no fake agent protocols.
 */
const has=(o,k)=>k in o;
async function detect(){const caps={
 local:{webCrypto:!!globalThis.crypto?.subtle,indexedDB:!!globalThis.indexedDB,serviceWorker:'serviceWorker' in navigator,wasm:typeof WebAssembly!=='undefined'},
 gpu:{webgpu:'gpu' in navigator},
 quantum:{simulator:!!globalThis.AKSIQuantumReasoner,hardware:false,advantage:false},
 proof:{graph:!!globalThis.AKSIProofGraph,passport:!!globalThis.AKSIPassport,sha256:!!globalThis.crypto?.subtle},
 identity:{webCrypto:!!globalThis.crypto?.subtle},
 agents:{mcp:'MCP' in globalThis,a2a:'A2A' in globalThis},
 privacy:{offlineCapable:true,networkOptional:true},
 pqc:{nativeBrowserSupport:false,standards:['ML-KEM','ML-DSA','SLH-DSA'],implementation:'not bundled'}
};
 if(caps.local.wasm){try{caps.local.wasmThreads=typeof SharedArrayBuffer!=='undefined'}catch{caps.local.wasmThreads=false}}
 if(caps.gpu){try{const adapter=await navigator.gpu.requestAdapter();caps.gpu.adapter=!!adapter;caps.gpu.features=adapter?[...adapter.features]:[]}catch{caps.gpu.adapter=false}}
 return caps}
function classify(c){return Object.fromEntries(Object.entries(c).map(([k,v])=>[k,typeof v==='object'&&v!==null&&!Array.isArray(v)?{...v}:v]))}
async function status(){const c=await detect();const s={protocol:'AKSI-FRONTIER/1',timestamp:new Date().toISOString(),capabilities:classify(c),principles:['capability detection over claims','local-first','human approval for consequential actions','integrity is not truth','simulation is not hardware']};window.dispatchEvent(new CustomEvent('aksi:frontier',{detail:s}));return s}
function mount(){const host=document.querySelector('[data-view="status"] .panel-pad')||document.querySelector('[data-view="home"]');if(!host||document.querySelector('[data-frontier]'))return;const box=document.createElement('section');box.dataset.frontier='1';box.className='frontier-panel';box.innerHTML='<div class="eyebrow">AKSI FRONTIER</div><h2>Что реально доступно этому устройству</h2><div id="frontierGrid">Проверка…</div><small>АКСИ не показывает функцию как доступную, если среда её не предоставляет.</small>';host.appendChild(box);status().then(s=>{const c=s.capabilities;const rows=[['Web Crypto',c.local.webCrypto],['IndexedDB',c.local.indexedDB],['WebAssembly',c.local.wasm],['WebGPU',c.gpu.webgpu&&c.gpu.adapter],['AKSI-Q simulation',c.quantum.simulator],['Proof Graph',c.proof.graph],['Decision Passport',c.proof.passport],['MCP runtime',c.agents.mcp],['A2A runtime',c.agents.a2a],['PQC native',c.pqc.nativeBrowserSupport]];document.querySelector('#frontierGrid').innerHTML=rows.map(([n,v])=>`<div class="frontier-row"><span>${n}</span><b>${v?'AVAILABLE':'NOT ACTIVE'}</b></div>`).join('')})}
document.addEventListener('DOMContentLoaded',mount);window.AKSIFrontier={detect,status};
})();
