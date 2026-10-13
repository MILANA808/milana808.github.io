/*!
 * AKSI Open Training Lab — transparent character n-gram model
 * Classical CPU model. No hidden corpus, API, pretrained weights, or claims of neural training.
 */
(function(root){
 "use strict";
 const VERSION="0.1.0", SCHEMA="AKSI-CHAR-NGRAM/1", STORE="aksi_char_ngram_model_v1";
 const DEFAULT_CORPUS=[
  "АКСИ — локальный интеллектуальный проект. Проверяемые знания важнее громких обещаний.",
  "Хороший ответ разделяет факты, предположения и неизвестное. Источник нужно проверять.",
  "Модель учится на примерах текста. Данные обучения и проверки должны быть разделены.",
  "Математика позволяет измерять ошибку. Низкая ошибка на обучении не гарантирует качество на новых данных.",
  "Память хранит опыт, но сохранённый текст не становится истинным автоматически.",
  "Открытая разработка показывает корпус, параметры, метрики и ограничения.",
  "Язык состоит из последовательностей символов и слов. Контекст помогает выбирать следующий символ.",
  "Эксперимент должен быть воспроизводимым: фиксированный seed, известные данные и сохранённая конфигурация."
 ];
 const clean=s=>String(s==null?"":s).replace(/\r/g,"").slice(0,500000);
 const chars=s=>Array.from(s);
 function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
 function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
 async function sha256(s){
  const bytes=new TextEncoder().encode(String(s));
  if(root.crypto&&root.crypto.subtle){const digest=await root.crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}
  if(typeof require==="function"){try{return require("node:crypto").createHash("sha256").update(String(s),"utf8").digest("hex");}catch(_){}}
  throw new Error("SHA-256 недоступен в этой среде.");
 }
 function splitLines(corpus,seed,ratio){
  const lines=clean(corpus).split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const r=rng(seed), tagged=lines.map((text,index)=>({text,index,key:r()}));
  tagged.sort((a,b)=>a.key-b.key);
  if(tagged.length<3)return {train:tagged.map(x=>x.text),test:[],total:lines.length};
  let n=Math.max(1,Math.min(tagged.length-1,Math.floor(tagged.length*ratio)));
  return {train:tagged.slice(0,n).sort((a,b)=>a.index-b.index).map(x=>x.text),test:tagged.slice(n).sort((a,b)=>a.index-b.index).map(x=>x.text),total:lines.length};
 }
 function fresh(order){return {schema:SCHEMA,version:VERSION,order,counts:{},totals:{},vocabulary:[],trainedChars:0,corpusDigest:null,seed:null,trainedAt:null,metrics:null};}
 function contextKey(arr,order){return arr.slice(-order).join("");}
 function addText(model,text){const a=chars(text);for(let i=0;i<a.length;i++){const ctx=contextKey(a.slice(0,i),model.order),ch=a[i];if(!model.counts[ctx])model.counts[ctx]={};model.counts[ctx][ch]=(model.counts[ctx][ch]||0)+1;model.totals[ctx]=(model.totals[ctx]||0)+1;model.trainedChars++;}}
 function probability(model,ctx,ch){const row=model.counts[ctx]||{},total=model.totals[ctx]||0,v=Math.max(1,model.vocabulary.length);return ((row[ch]||0)+0.25)/(total+0.25*v);}
 function evaluate(model,lines){let loss=0,n=0,unknown=0;for(const line of lines){const a=chars(line);for(let i=0;i<a.length;i++){const ctx=contextKey(a.slice(0,i),model.order);const p=probability(model,ctx,a[i]);loss-=Math.log(p);n++;if(!model.vocabulary.includes(a[i]))unknown++;}}const mean=n?loss/n:null;return {characters:n,crossEntropy:mean,perplexity:mean===null?null:Number(Math.exp(Math.min(mean,50)).toFixed(6)),unknownCharacters:unknown};}
 async function train(opts){
  opts=opts||{};const corpus=clean(opts.corpus==null?DEFAULT_CORPUS.join("\n"):opts.corpus);
  const order=Math.max(1,Math.min(5,Number(opts.order)||3)),seed=Number(opts.seed)||14021995,ratio=Math.max(.5,Math.min(.9,Number(opts.trainRatio)||.8));
  const split=splitLines(corpus,seed,ratio);if(!split.train.length)throw new Error("Добавь хотя бы одну непустую строку.");
  const model=fresh(order);model.seed=seed;model.vocabulary=Array.from(new Set(chars(split.train.join("\n")))).sort();
  model.corpusDigest="sha256:"+await sha256(corpus);
  const total=split.train.length;
  for(let i=0;i<total;i++){addText(model,split.train[i]+"\n");if(opts.onProgress)opts.onProgress({stage:"training",done:i+1,total,percent:Math.round((i+1)/total*100)});if(i%8===7)await new Promise(resolve=>setTimeout(resolve,0));}
  model.trainedAt=new Date().toISOString();
  model.metrics={split:{total:split.total,train:split.train.length,test:split.test.length,seed,trainRatio:ratio},train:evaluate(model,split.train),test:split.test.length?evaluate(model,split.test):null};
  model.trainingManifest={schema:"AKSI-TRAINING-MANIFEST/1",corpusDigest:model.corpusDigest,order,seed,trainRatio:ratio,trainLineHashes:await Promise.all(split.train.map(async x=>"sha256:"+await sha256(x))),testLineHashes:await Promise.all(split.test.map(async x=>"sha256:"+await sha256(x))),trainExamples:split.train,testExamples:split.test,datasetDisclosure:"Training and test text are included in exported model for reproducibility. Export may contain user-provided text.",hashAlgorithm:"SHA-256"};
  return {model,split};
 }
 function generate(model,prompt,opts){
  opts=opts||{};if(!model||model.schema!==SCHEMA||!model.trainedChars)throw new Error("Сначала обучи модель.");
  const max=Math.max(1,Math.min(1200,Number(opts.maxChars)||240)),temperature=Math.max(.15,Math.min(2,Number(opts.temperature)||.85));
  const rand=rng(Number(opts.seed)||hash(String(prompt||"")+":"+model.seed)),out=chars(clean(prompt||""));
  const known=new Set(model.vocabulary),start=out.slice(-model.order);
  if(!start.length)out.push("А","К","С","И",":"," ");
  for(let i=0;i<max;i++){
   const ctx=contextKey(out,model.order);let row=model.counts[ctx];
   if(!row){let found=false;for(let k=Math.min(model.order-1,out.length);k>=0;k--){const r=model.counts[contextKey(out,k)];if(r){row=r;found=true;break;}}if(!found)row=model.counts[""]||{};}
   const entries=Object.entries(row||{}).filter(([ch])=>known.has(ch));if(!entries.length)break;
   const weights=entries.map(([ch,n])=>Math.pow(n,1/temperature)),sum=weights.reduce((a,b)=>a+b,0);let x=rand()*sum,chosen=entries[entries.length-1][0];
   for(let j=0;j<entries.length;j++){x-=weights[j];if(x<=0){chosen=entries[j][0];break;}}
   out.push(chosen);if(/[.!?\n]/.test(chosen)&&i>40&&rand()<.15)break;
  }
  return {text:out.join(""),model:"AKSI character n-gram "+VERSION,order:model.order,trainedCharacters:model.trainedChars,warning:"Экспериментальная статистическая генерация; возможен бессвязный текст. Это не нейросеть и не фактологическая система."};
 }
 function save(model){try{root.localStorage.setItem(STORE,JSON.stringify(model));return true;}catch(e){return false;}}
 function load(){try{const m=JSON.parse(root.localStorage.getItem(STORE)||"null");return m&&m.schema===SCHEMA?m:null;}catch(e){return null;}}
 function exportModel(model){return JSON.stringify({format:SCHEMA,exportedAt:new Date().toISOString(),model},null,2);}
 function importModel(raw){const data=typeof raw==="string"?JSON.parse(raw):raw;const m=data.model||data;if(!m||m.schema!==SCHEMA||!m.counts||!Array.isArray(m.vocabulary))throw new Error("Файл не распознан как модель AKSI.");return m;}
 root.AKSI_TRAINING_LAB={version:VERSION,defaultCorpus:DEFAULT_CORPUS.join("\n"),train,generate,save,load,exportModel,importModel,evaluate,splitLines,hash};
 if(typeof module==="object"&&module.exports)module.exports=root.AKSI_TRAINING_LAB;
})(typeof window!=="undefined"?window:globalThis);
