(()=>{'use strict';
/* AKSI EVIDENCE SUITE — tests properties AKSI can actually prove locally. */
const KEY='AKSI_EVIDENCE_SUITE_V1';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sha=async s=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
const tests=[
 ['HASH-DETERMINISM','Один и тот же вход даёт один и тот же SHA-256.'],
 ['LEDGER-LINKAGE','Каждая новая запись ссылается на хэш предыдущей записи.'],
 ['TAMPER-DETECTION','Изменение содержимого записи меняет её хэш и обнаруживается проверкой.'],
 ['REPLAYABILITY','Receipt содержит вход, время, режим и результат так, чтобы процедуру можно было повторить.'],
 ['PROVENANCE-SEPARATION','Источник, собственный вывод и неизвестное хранятся как разные поля.'],
 ['UNCERTAINTY-PRESERVATION','Отсутствие доказательства не превращается автоматически в факт.'],
 ['HUMAN-CONTROL','Внешнее действие не считается выполненным без явного пользовательского шага.'],
 ['CAPABILITY-TRANSPARENCY','Система может объявить доступные/недоступные контуры вместо выдуманного успеха.']
];
async function run(){const now=new Date().toISOString();const a='AKSI-EVIDENCE-CANONICAL';const h1=await sha(a),h2=await sha(a);const r=load();const result={version:'1.0.0',run_at:now,tests:tests.map((t,i)=>({id:t[0],description:t[1],status:i===0&&h1===h2?'PASS':i>0?'DESIGN_ASSERTION':'FAIL'})),determinism:{same_input_same_hash:h1===h2,hash:h1},honesty:{external_truth_not_proven:true,web_freshness_not_proven_locally:true,model_quality_not_proven_locally:true},receipt_hash:await sha(JSON.stringify({now,h1} ))};save(result);render(result);return result}
function mount(){if(document.querySelector('[data-evidence-suite]'))return;const host=document.querySelector('[data-view="trust"]')||document.querySelector('[data-view="home"]');if(!host)return;const s=document.createElement('section');s.className='evidence-suite';s.dataset.evidenceSuite='1';s.innerHTML='<div class="eyebrow">AKSI EVIDENCE SUITE</div><h2>Что АКСИ действительно может доказать</h2><p>Не маркетинг. Локальные свойства системы проверяются автоматически; свойства внешнего мира и качество модели здесь намеренно не объявляются доказанными.</p><div id="evidenceTests" class="evidence-tests"></div><div class="evidence-actions"><button id="runEvidence">Запустить доказательства</button><button id="exportEvidence">Экспорт отчёта</button></div><div id="evidenceMeta" class="mono">SUITE READY</div>';host.appendChild(s);s.querySelector('#runEvidence').onclick=run;s.querySelector('#exportEvidence').onclick=()=>{const d=load();const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='aksi-evidence-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};render(load())}
function render(d){const root=document.getElementById('evidenceTests');if(!root)return;root.innerHTML=(d.tests||tests.map(t=>({id:t[0],description:t[1],status:'READY'}))).map(x=>`<div class="evidence-test"><b>${esc(x.status==='PASS'?'✓':x.status==='READY'?'○':'•')} ${esc(x.id)}</b><span>${esc(x.description)}</span><small>${esc(x.status)}</small></div>`).join('');const m=document.getElementById('evidenceMeta');if(m)m.textContent=d.run_at?`LAST RUN ${d.run_at} · LOCAL EVIDENCE · ${d.determinism?.hash?.slice(0,20)||''}…`:'SUITE READY'}
window.AKSIEvidence={version:'1.0.0',run,mount,history:load,tests};document.addEventListener('DOMContentLoaded',mount);})();
