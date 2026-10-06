/** AKSI Super Mind v1 — answers via fabric */
(function(G){
"use strict";
var VERSION="mind-1.0.0";
function hash(s){var h=2166136261>>>0,t=String(s),i;for(i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function tryMath(q){
  var s=String(q).toLowerCase().replace(/,/g,".").replace(/\s+/g," ").trim();
  var m,n,r,x,p,base,v,expr,val;
  m=s.match(/x\s*\^\s*2\s*=\s*([0-9.]+)|x\s*\*\*\s*2\s*=\s*([0-9.]+)|x²\s*=\s*([0-9.]+)|x\s*\^\s*2\s*-\s*([0-9.]+)\s*=\s*0/i);
  if(m){n=parseFloat(m[1]||m[2]||m[3]||m[4]);r=Math.sqrt(n);return{ok:true,kind:"quad",value:[r,-r],expr:"x²="+n,steps:["x² = "+n,"x = ±√"+n,"x ∈ {"+r+", "+(-r)+"}"]};}
  m=s.match(/(?:корень|sqrt)\s*(?:из\s*)?([0-9.]+)/i);
  if(m){x=parseFloat(m[1]);r=Math.sqrt(x);return{ok:true,kind:"sqrt",value:r,expr:"√"+x,steps:["√"+x+" = "+r]};}
  m=s.match(/([0-9.]+)\s*%\s*(?:от\s*)?([0-9.]+)/);
  if(m){p=parseFloat(m[1]);base=parseFloat(m[2]);v=base*p/100;return{ok:true,kind:"pct",value:v,steps:[p+"% от "+base+" = "+v]};}
  m=s.match(/(?:посчитай|вычисли|сколько\s*будет)?\s*([0-9.]+\s*[+\-*/^]\s*[0-9.]+(?:\s*[+\-*/^]\s*[0-9.]+)*)/i);
  if(m){try{expr=m[1].replace(/\^/g,"**").replace(/\s+/g,"");if(!/^[\d.+\-*/()]+$/.test(expr.replace(/\*\*/g,"")))return null;val=Function('"use strict";return ('+expr+')')();if(typeof val==="number"&&isFinite(val))return{ok:true,kind:"arith",value:val,expr:expr,steps:["parse: "+expr,"eval → "+val]};}catch(e){}}
  return null;
}
var TOPICS=[
{re:/суперпозиц|superpos/i,title:"Суперпозиция",body:"Суперпозиция — линейная комбинация базисных состояний с амплитудами; вероятность |α|². В АКСИ — statevector и коллапс shot."},
{re:/кубит|qubit/i,title:"Кубит",body:"Кубит: α|0⟩+β|1⟩. n кубитов → 2ⁿ амплитуд. Fabric использует 4-кубитный сид."},
{re:/permit|пермит|допуск/i,title:"Permit",body:"Permit — default-deny. Без ALLOW действие не исполняется; выдаётся receipt."},
{re:/экзокортекс|exocortex/i,title:"Экзокортекс",body:"S-вектор, опыт, цель, Permit, ECDSA-цепь. ‖S‖≈1, Σp=1, verifyChain."},
{re:/акси|aksi/i,title:"АКСИ",body:"Суверенный контур: runtime, quantum seed, Permit, чеки, Super fabric."},
{re:/энтропи|entropy/i,title:"Энтропия",body:"S=−Σ pᵢ log₂ pᵢ. Высокая S — больше неопределённости до коллапса."},
{re:/коллапс|collapse|измерен/i,title:"Коллапс",body:"Выбор базиса с вероятностью |амплитуда|². Сид стадии pipeline."},
{re:/суперкомпьютер|fabric|кластер|gpu/i,title:"Super Fabric",body:"Виртуальный кластер: jobs, GPU-ноды, matmul, quantum, Exocortex."},
{re:/математик|уравнен|корень/i,title:"Математика",body:"Арифметика, %, √, x²=n на fabric. Сложный CAS — следующий модуль."}
];
function extractKeys(q){var stop=/^(и|в|на|по|что|как|это|для|the|a|an|is|are|what|how)$/i;return String(q).toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(function(w){return w.length>2&&!stop.test(w)}).slice(0,12)}
function synthesize(q,quantum){
  var keys=extractKeys(q),bits=quantum&&quantum.bits?quantum.bits:"----",seed=quantum&&quantum.seed?quantum.seed:hash(q),path=seed%5,topics=[],math=tryMath(q),lines=[];
  TOPICS.forEach(function(t){if(t.re.test(q))topics.push(t)});
  lines.push("АКСИ Super Mind · ответ через fabric");
  lines.push("Q-seed |"+bits+"⟩ · path="+path);
  if(math&&math.ok){lines.push("");lines.push("【Математика】");math.steps.forEach(function(s){lines.push("  · "+s)});lines.push("Итог: "+(Array.isArray(math.value)?math.value.join(", "):math.value))}
  if(topics.length){lines.push("");lines.push("【Резонанс】");topics.forEach(function(t){lines.push("▸ "+t.title);lines.push(t.body)})}
  lines.push("");lines.push("【Синтез】");
  if(keys.length)lines.push("Опора: "+keys.slice(0,8).join(", ")+".");
  var templates=[
    "Job на Super: постановка → quantum → mind → вывод. Стадии в журнале fabric.",
    "Композиция: math + резонанс + quantum path. Не чёрный ящик GPT.",
    "Прозрачность: экспорт и подпись Exocortex. Ценность — доказуемый путь.",
    "Свободный LLM — /llm/ как workload. Здесь математико-логический контур.",
    "Permit отделяет ответ от действия: текст свободно, действие — ALLOW."
  ];
  lines.push(templates[path]);
  if(!math&&!topics.length){lines.push("");lines.push("Уточни: 12*12, x^2=4, суперпозиция, Permit, АКСИ.");}
  lines.push("");lines.push("— mind "+VERSION+" · через Super");
  return{text:lines.join("\n"),math:math,topics:topics.map(function(t){return t.title}),keys:keys,path:path};
}
G.AKSI_SUPER_MIND={version:VERSION,synthesize:synthesize,tryMath:tryMath,extractKeys:extractKeys};
})(typeof window!=="undefined"?window:globalThis);
