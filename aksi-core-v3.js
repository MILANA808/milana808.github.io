/* AKSI Core v3 — model-independent, local-first decision infrastructure.
 * Scientific boundary: the quantum layer is quantum-inspired/quantum-like,
 * not quantum hardware and not a claim of quantum advantage.
 */
(function(){'use strict';
const VERSION='3.0.0';
const MODES=['auto','deterministic','exploratory','offline','hybrid'];
const now=()=>new Date().toISOString();
const canonical=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((a,x)=>(a[x]=v[x],a),{}):v);
async function sha256(value){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:canonical(value)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function seeded(seed){let s=0;for(const c of String(seed))s=(s*31+c.charCodeAt(0))>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296}}
function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x))}
function normalize(xs){const z=xs.reduce((a,x)=>a+x,0)||1;return xs.map(x=>x/z)}
function classify(c){if(c.source&&c.source.url)return 'SOURCE';if(c.type==='fact')return 'FACT';if(c.type==='hypothesis')return 'HYPOTHESIS';if(c.type==='inference')return 'INFERENCE';return 'UNCERTAIN'}
function score(c){const evidence=clamp(Number(c.evidence??c.src??.5));const coherence=clamp(Number(c.coherence??c.coh??.5));const agreement=clamp(Number(c.agreement??c.eqs??.5));const freshness=clamp(Number(c.freshness??.5));const provenance=clamp(Number(c.provenance??(c.source?.url?0.8:.25)));return .30*evidence+.22*coherence+.22*agreement+.14*freshness+.12*provenance}
function calibrate(candidates,opts={}){const xs=candidates.map(score);const classical=normalize(xs);const lambda=clamp(opts.lambda??.25);const cf=clamp(opts.counterfactual??0);const phases=candidates.map((c,i)=>Math.PI*(1-clamp(Number(c.agreement??c.eqs??.5)))*lambda+i*.000001);const amps=candidates.map((c,i)=>{const r=Math.sqrt(classical[i]);return {re:r*Math.cos(phases[i]),im:r*Math.sin(phases[i])}});const masses=amps.map((a,i)=>{let m=a.re*a.re+a.im*a.im;for(let j=0;j<amps.length;j++)if(i!==j)m+=lambda*2*(a.re*amps[j].re+a.im*amps[j].im);m+=cf*(1-classical[i]);return Math.max(0,m)});const quantum=normalize(masses);return {scores:xs,classical,phases,amplitudes:amps,quantum,divergence:quantum.map((p,i)=>p-classical[i]),lambda,counterfactual:cf}}
function collapse(probs,seed){const r=seeded(seed)();let a=0;for(let i=0;i<probs.length;i++){a+=probs[i];if(r<=a)return i}return probs.length-1}
async function buildReceipt(input){const manifest={protocol:'AKSI-VAI/1',version:VERSION,timestamp:now(),mode:input.mode||'deterministic',task:input.task,seed:input.seed??null,parameters:input.parameters||{},candidates:input.candidates||[],calibration:input.calibration||null,result:input.result||null,evidence:input.evidence||[],events:input.events||[]};const payloadHash=await sha256(manifest);return {...manifest,payload_hash:payloadHash,receipt_hash:await sha256({payload_hash:payloadHash,previous_receipt_hash:input.previous_receipt_hash||null}),previous_receipt_hash:input.previous_receipt_hash||null}}
async function run(task,candidates,options={}){const mode=options.mode||'deterministic';if(!MODES.includes(mode))throw Error('Unsupported AKSI mode');const seed=options.seed??(mode==='exploratory'?crypto.randomUUID():'AKSI:'+task);const calibration=calibrate(candidates,options);const index=collapse(calibration.quantum,seed);const result={answer:candidates[index]?.text||'',index,label:classify(candidates[index]||{}),probability:calibration.quantum[index]||0,confidence:score(candidates[index]||{})};const receipt=await buildReceipt({task,candidates,mode,seed,parameters:{lambda:calibration.lambda,counterfactual:calibration.counterfactual},calibration,result,evidence:candidates.map(c=>c.source||null)});return {protocol:'AKSI-CORE/3',version:VERSION,task,mode,seed,candidates,calibration,result,receipt}}
window.AKSICoreV3={VERSION,MODES,sha256,canonical,score,calibrate,buildReceipt,run};
window.dispatchEvent(new CustomEvent('aksi:core-v3-ready',{detail:{version:VERSION}}));
})();
