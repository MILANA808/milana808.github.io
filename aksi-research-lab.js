(function(root){
"use strict";
const KEY="aksi.research.lab.v1";
const api={
 bayes(prior,likelihood,falsePositive){
  const p=Number(prior),l=Number(likelihood),f=Number(falsePositive);
  if(!Number.isFinite(p)||!Number.isFinite(l)||!Number.isFinite(f)||p<0||p>1||l<0||l>1||f<0||f>1)throw new Error("Вероятности должны находиться в диапазоне от 0 до 1.");
  const denominator=l*p+f*(1-p);
  if(denominator===0)throw new Error("Свидетельство имеет нулевую вероятность в заданной модели.");
  return {prior:p,likelihood:l,falsePositive:f,evidenceProbability:denominator,posterior:l*p/denominator};
 },
 gradientDescent(start,rate,iterations){
  let x=Number(start),a=Number(rate),n=Number(iterations||40);
  if(!Number.isFinite(x)||!Number.isFinite(a)||a<=0||a>=1||!Number.isInteger(n)||n<1||n>200)throw new Error("Некорректные параметры оптимизации.");
  const rows=[];
  for(let i=0;i<=n;i++){const loss=(x-3)**2;rows.push({step:i,x,loss});if(i<n)x-=a*2*(x-3);}
  return {function:"f(x)=(x-3)^2",rows,minimumX:x,minimumLoss:(x-3)**2};
 },
 makeFolds(size,k){
  if(!Number.isInteger(size)||!Number.isInteger(k)||size<k||k<2||k>size)throw new Error("Размер выборки должен быть не меньше числа folds.");
  const folds=Array.from({length:k},()=>[]);
  for(let i=0;i<size;i++)folds[i%k].push(i);
  const flat=folds.flat();
  return {folds,uniqueCount:new Set(flat).size,allSamples:flat.length,disjoint:new Set(flat).size===size,complete:flat.length===size};
 },
 runSelfChecks(){
  const checks=[];
  const add=(name,fn)=>{try{const result=fn();checks.push({name,ok:!!result.ok,detail:result.detail||""})}catch(e){checks.push({name,ok:false,detail:String(e.message||e)})}};
  add("Bayes normalization",()=>{const r=api.bayes(.2,.8,.1);return{ok:Math.abs(r.posterior-0.6666666667)<1e-8,detail:"P(A|B)≈"+r.posterior.toFixed(6)}});
  add("Convex gradient descent",()=>{const r=api.gradientDescent(-4,.15,40);return{ok:r.minimumLoss<1e-8,detail:"x≈"+r.minimumX.toFixed(8)+", loss≈"+r.minimumLoss.toExponential(2)}});
  add("Five-fold partition",()=>{const r=api.makeFolds(20,5);return{ok:r.disjoint&&r.complete&&r.uniqueCount===20,detail:"20 элементов распределены без пересечений"}});
  const s=root.AKSISemanticReasoning;
  add("Semantic graph",()=>({ok:!!(s&&s.concepts&&s.concepts.length),detail:s?s.version+" · "+s.concepts.length+" concepts":"module missing"}));
  const l=root.AKSISymbolicInference;
  add("Symbolic inference",()=>{if(!l)return{ok:false,detail:"module missing"};const r=l.infer("логика: факт: снег белый; если снег белый, то снег отражает свет; следует ли снег отражает свет?");return{ok:r.ok&&r.status==="proven",detail:r.status||"no status"}});
  const q=root.AKSI_QUANTUM;
  add("Quantum simulator",()=>{if(!q)return{ok:false,detail:"module missing"};const r=q.bell("phi+").probs();return{ok:r.length===4&&Math.abs(r[0]-.5)<1e-8&&Math.abs(r[3]-.5)<1e-8,detail:"Bell probabilities "+JSON.stringify(r)}});
  const c=root.AKSICoreV3;
  add("Core v3",()=>({ok:!!(c&&typeof c.run==="function"&&typeof c.buildReceipt==="function"),detail:c?"AKSI Core v"+c.VERSION:"module missing"}));
  return checks;
 },
 init(){
  const $=id=>document.getElementById(id);
  if(!$("systemStatus"))return;
  let runs=[],receipts=[];
  try{const saved=JSON.parse(localStorage.getItem(KEY)||"{}");runs=Array.isArray(saved.runs)?saved.runs:[];receipts=Array.isArray(saved.receipts)?saved.receipts:[]}catch(_){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({runs,receipts}));}catch(e){$("systemStatus").textContent="Локальное хранилище недоступно: "+e.message;}};
  const record=(kind,result)=>{runs.push({id:runs.length+1,at:new Date().toISOString(),kind,result});runs=runs.slice(-100);$("testCount").textContent=String(runs.length);save();};
  const show=(id,value)=>{$(id).textContent=typeof value==="string"?value:JSON.stringify(value,null,2);};
  const modules=[["AKSISemanticReasoning",root.AKSISemanticReasoning],["AKSINativeLanguageCore",root.AKSINativeLanguageCore],["AKSISymbolicInference",root.AKSISymbolicInference],["AKSI_QUANTUM",root.AKSI_QUANTUM],["AKSICoreV3",root.AKSICoreV3]];
  const available=modules.filter(x=>!!x[1]);
  $("moduleCount").textContent=String(available.length)+"/"+modules.length;
  $("systemStatus").textContent="Загружено "+available.length+" из "+modules.length+" модулей. Self-check выполняется локально.";
  $("systemStatus").className="status "+(available.length===modules.length?"ok":"warn");
  const checks=api.runSelfChecks(),passed=checks.filter(x=>x.ok).length;
  $("systemStatus").textContent+=" Самопроверка: "+passed+"/"+checks.length+".";
  show("semanticOutput","Пока нет ответа.");
  $("semanticRun").addEventListener("click",()=>{
   const question=$("semanticQuestion").value.trim(),sem=root.AKSISemanticReasoning,native=root.AKSINativeLanguageCore;
   let r=native&&native.answer(question);
   if(!r||!r.handled)r=sem&&sem.answer(question);
   if(!r)r={status:"unsupported_question",text:"Этот тип вопроса пока не поддержан локальным языковым ядром."};
   const result={status:r.status||"unknown",text:r.text||"",proof:r.proof||[]};
   show("semanticOutput",result);record("semantic",result);
  });
  $("logicRun").addEventListener("click",()=>{
   const r=root.AKSISymbolicInference?root.AKSISymbolicInference.infer($("logicInput").value):{ok:false,text:"Модуль символического вывода не загружен."};
   show("logicOutput",r);record("symbolic-inference",r);
  });
  $("bayesRun").addEventListener("click",()=>{
   try{const r=api.bayes($("prior").value,$("sensitivity").value,$("falsePositive").value);r.interpretation="При этих предположениях апостериорная вероятность гипотезы равна "+(100*r.posterior).toFixed(2)+"%.";show("bayesOutput",r);record("bayes",r);}
   catch(e){show("bayesOutput","Ошибка: "+e.message);}
  });
  $("optRun").addEventListener("click",()=>{
   try{const r=api.gradientDescent($("startX").value,$("rate").value,40);const last=r.rows[r.rows.length-1];show("optOutput",{function:r.function,steps:r.rows.length-1,start:r.rows[0],finish:last,minimumX:r.minimumX,minimumLoss:r.minimumLoss});record("gradient-descent",{minimumX:r.minimumX,minimumLoss:r.minimumLoss,steps:40});}
   catch(e){show("optOutput","Ошибка: "+e.message);}
  });
  $("bellRun").addEventListener("click",()=>{
   try{const c=root.AKSI_QUANTUM.bell("phi+");const r={engine:"AKSI_QUANTUM "+root.AKSI_QUANTUM.version,model:"classical state-vector simulation",state:c.summary(),probabilities:c.probs(),circuit:c.circuitString(),boundary:"Это программная симуляция, не квантовое оборудование."};show("quantumOutput",r);record("quantum-bell",r);}
   catch(e){show("quantumOutput","Ошибка: "+e.message);}
  });
  $("foldRun").addEventListener("click",()=>{
   try{const r=api.makeFolds(20,5);r.note="Демонстрация разбиения индексов, а не измерение качества модели.";show("foldOutput",r);record("fold-partition",r);}
   catch(e){show("foldOutput","Ошибка: "+e.message);}
  });
  $("receiptRun").addEventListener("click",async()=>{
   try{
    if(!root.AKSICoreV3)throw new Error("AKSI Core v3 не загружен.");
    const input={protocol:"AKSI-RESEARCH/1",created_at:new Date().toISOString(),task:$("task").value,risk:$("risk").value,checks,runs};
    const receipt=await root.AKSICoreV3.buildReceipt({task:input.task,mode:"deterministic",seed:"AKSI-RESEARCH-v1",parameters:{risk:input.risk},candidates:[{type:"fact",text:"Сводка экспериментов создана из локального журнала",evidence:1,coherence:1,agreement:1,freshness:1,provenance:1}],result:{run_count:runs.length,checks_passed:passed,checks_total:checks.length},events:runs});
    const full={...input,core_receipt:receipt};receipts.push(full);receipts=receipts.slice(-30);save();$("receiptCount").textContent=String(receipts.length);show("receiptOutput",full);
   }catch(e){show("receiptOutput","Не удалось создать receipt: "+e.message);}
  });
  $("exportRun").addEventListener("click",()=>{
   const data={schema:"AKSI-RESEARCH-LOG/1",exported_at:new Date().toISOString(),runs,receipts};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="aksi-research-log.json";a.click();URL.revokeObjectURL(url);
  });
  $("verifyRun").addEventListener("click",async()=>{
   try{if(!root.crypto||!crypto.subtle)throw new Error("WebCrypto недоступен.");const data=JSON.stringify({runs,receipts});const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(data));const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");show("receiptOutput",{schema:"AKSI-RESEARCH-LOG/1",sha256:hash,run_count:runs.length,receipt_count:receipts.length,scope:"Контрольная сумма текущего локального журнала. Не доказывает истинность, авторство или доверенное время."});}
   catch(e){show("receiptOutput","Ошибка проверки: "+e.message);}
  });
  $("clearRun").addEventListener("click",()=>{
   if(!confirm("Удалить локальный журнал исследований AKSI в этом браузере?"))return;
   runs=[];receipts=[];save();$("testCount").textContent="0";$("receiptCount").textContent="0";show("receiptOutput","Локальный журнал очищен.");
  });
  $("testCount").textContent=String(runs.length);$("receiptCount").textContent=String(receipts.length);
  $("semanticRun").disabled=!root.AKSISemanticReasoning;
  $("logicRun").disabled=!root.AKSISymbolicInference;
  $("bellRun").disabled=!root.AKSI_QUANTUM;
  $("receiptRun").disabled=!root.AKSICoreV3;
  window.addEventListener("error",e=>{const el=$("systemStatus");if(el)el.textContent="Ошибка модуля: "+String(e.message||"неизвестная ошибка");});
 }
};
const exported={...api};
root.AKSIResearchLab=exported;
if(typeof module==="object"&&module.exports)module.exports=exported;
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",api.init);else api.init();}
})(typeof window!=="undefined"?window:globalThis);