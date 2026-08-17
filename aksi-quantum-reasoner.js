(()=>{'use strict';
/* AKSI Quantum Reasoner v1
 * Honest 3-qubit state-vector simulator. This is simulation, not quantum hardware.
 * It does NOT claim quantum advantage. AKSI uses it as an uncertainty/alternative-state
 * explorer and records a deterministic summary that can be attached to Proof Graphs.
 */
const SQRT1_2=Math.SQRT1_2;
const H=[[SQRT1_2,SQRT1_2],[SQRT1_2,-SQRT1_2]];
const I=[[1,0],[0,1]];
const X=[[0,1],[1,0]],Z=[[1,0],[0,-1]],Y=[[0,[0,-1]],[ [0,1],0]];
const mul=(a,b)=>a.map(r=>b[0].map((_,j)=>r.reduce((s,_,k)=>s+((a[r.indexOf(r)]?.[k]??0)*(b[k]?.[j]??0)),0)));
function mm(a,b){const out=Array.from({length:a.length},()=>Array(b[0].length).fill(0));for(let i=0;i<a.length;i++)for(let k=0;k<b.length;k++)for(let j=0;j<b[0].length;j++)out[i][j]+=a[i][k]*b[k][j];return out}
function kron(a,b){const o=Array.from({length:a.length*b.length},()=>Array(a[0].length*b[0].length).fill(0));for(let i=0;i<a.length;i++)for(let j=0;j<a[0].length;j++)for(let k=0;k<b.length;k++)for(let l=0;l<b[0].length;l++)o[i*b.length+k][j*b[0].length+l]=a[i][j]*b[k][l];return o}
const vnorm=v=>Math.sqrt(v.reduce((s,x)=>s+x*x,0));
const apply=(m,v)=>m.map(r=>r.reduce((s,x,i)=>s+x*v[i],0));
const normalize=v=>{const n=vnorm(v)||1;return v.map(x=>x/n)};
const entropy=p=>p.filter(x=>x>1e-12).reduce((s,x)=>s-x*Math.log2(x),0);
function tokenize(q){return [...String(q).toLowerCase().matchAll(/[a-zа-яё0-9]{3,}/giu)].map(x=>x[0]).slice(0,12)}
function seed(q){let h=2166136261;for(const c of String(q))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function run(question){const s=seed(question), bits=[s&1,(s>>>1)&1,(s>>>2)&1];let state=Array(8).fill(0);state[(bits[0]<<2)|(bits[1]<<1)|bits[2]]=1;
// Put the three qubits into a superposition, then entangle them with CNOT-like permutation.
state=apply(kron(kron(H,H),H),state);
const perm=state.map((_,i)=>{const a=(i>>2)&1,b=(i>>1)&1,c=i&1;const nb=b^a;return {i:(a<<2)|(nb<<1)|c,v:state[i]}});const ent=Array(8).fill(0);perm.forEach(x=>ent[x.i]=x.v);state=normalize(ent);
const probs=state.map(x=>x*x);const top=probs.map((p,i)=>({state:i.toString(2).padStart(3,'0'),probability:p})).sort((a,b)=>b.probability-a.probability).slice(0,4);
const toks=tokenize(question);const result={protocol:'AKSI-QREASONER/1',simulation:'3-qubit state-vector',hardware:false,quantum_advantage_claim:false,input_tokens:toks,seed:s,entropy:entropy(probs),top_states:top,measurement:'computational basis',interpretation:'Alternative states are explored as a simulation. The distribution is not evidence that any claim is true.',limitations:['3 qubits only','classical browser simulation','no quantum hardware','no claim of quantum supremacy','probabilities depend on deterministic input seed']};return result}
function render(r){const host=document.querySelector('[data-view="chat"],[data-view="home"]');if(!host)return;let box=document.querySelector('[data-qreasoner]');if(!box){box=document.createElement('section');box.dataset.qreasoner='1';box.className='qreasoner-panel';host.appendChild(box)}box.innerHTML=`<div class="eyebrow">AKSI-Q REASONER</div><h2>Проверка альтернативных состояний</h2><p>Это честная симуляция 3 кубитов. Она помогает исследовать альтернативы и неопределённость, но не доказывает истинность ответа.</p><div class="qstates">${r.top_states.map(x=>`<div><b>|${x.state}⟩</b><span>${(x.probability*100).toFixed(1)}%</span></div>`).join('')}</div><small>entropy ${r.entropy.toFixed(4)} · classical simulation · no quantum advantage claim</small>`}
window.AKSIQuantumReasoner={run,render,explain:r=>r?.interpretation};
document.addEventListener('DOMContentLoaded',()=>{const btn=document.createElement('button');btn.id='aksiQReasonerRun';btn.textContent='Прогнать ответ через AKSI-Q';btn.onclick=()=>{const q=document.querySelector('#chatInput')?.value||document.querySelector('#userInput')?.value||'current response';const r=run(q);render(r);window.dispatchEvent(new CustomEvent('aksi:q-result',{detail:r}))};const trust=document.querySelector('[data-view="trust"] .panel-pad');if(trust)trust.appendChild(btn)})
})();
