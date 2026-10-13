/* AKSI Visible Neural Lab: tiny trainable character MLP, CPU-only, deterministic. */
(function(root){
"use strict";
const VERSION="0.1.0", SCHEMA="AKSI-CHAR-MLP/1";
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
const chars=s=>Array.from(String(s));
const clean=s=>String(s==null?"":s).replace(/\r/g,"").slice(0,200000);
function rng(seed){let x=(Number(seed)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function splitLines(corpus,seed,ratio){
 const lines=clean(corpus).split(/\n+/).map(x=>x.trim()).filter(Boolean),r=rng(seed);
 const a=lines.map((text,index)=>({text,index,k:r()})).sort((x,y)=>x.k-y.k);
 if(a.length<3)return {train:a.map(x=>x.text),test:[],total:lines.length};
 const n=Math.max(1,Math.min(a.length-1,Math.floor(a.length*ratio)));
 return {train:a.slice(0,n).sort((x,y)=>x.index-y.index).map(x=>x.text),test:a.slice(n).sort((x,y)=>x.index-y.index).map(x=>x.text),total:lines.length};
}
function softmax(logits){let max=-Infinity;for(const x of logits)if(x>max)max=x;let sum=0;const p=new Float64Array(logits.length);for(let i=0;i<p.length;i++){p[i]=Math.exp(Math.max(-60,logits[i]-max));sum+=p[i];}for(let i=0;i<p.length;i++)p[i]/=sum;return p;}
function makeExamples(lines,map,ctxSize){const ex=[];for(const line of lines){const a=chars(line+"\n").map(c=>map.get(c));for(let i=0;i<a.length;i++){const ctx=new Int32Array(ctxSize);for(let j=0;j<ctxSize;j++){const p=i-ctxSize+j;ctx[j]=p<0?0:(a[p]??0);}if(a[i]!=null)ex.push({ctx,y:a[i]-1});}}return ex;}
function forward(m,ctx){
 const {vocabSize:V,inputSize:I,hidden:H,contextSize:C,W1,b1,W2,b2}=m, h=new Float64Array(H);
 for(let j=0;j<H;j++){let z=b1[j];for(let k=0;k<C;k++){const base=k*I+ctx[k];z+=W1[j*I*C+base];}h[j]=Math.tanh(z);}
 const logits=new Float64Array(V);for(let v=0;v<V;v++){let z=b2[v],base=v*H;for(let j=0;j<H;j++)z+=W2[base+j]*h[j];logits[v]=z;}
 return {h,p:softmax(logits)};
}
function evaluate(m,lines){const ex=makeExamples(lines,m.charToId,m.contextSize);let loss=0,correct=0;for(const e of ex){const p=forward(m,e.ctx).p;loss-=Math.log(Math.max(1e-12,p[e.y]));let best=0;for(let i=1;i<p.length;i++)if(p[i]>p[best])best=i;if(best===e.y)correct++;}return {characters:ex.length,crossEntropy:ex.length?loss/ex.length:null,perplexity:ex.length?Math.exp(Math.min(50,loss/ex.length)):null,top1Accuracy:ex.length?correct/ex.length:null};}
async function train(opts){
 opts=opts||{};const corpus=clean(opts.corpus==null?DEFAULT_CORPUS.join("\n"):opts.corpus);
 const seed=Number(opts.seed)||14021995,ratio=Math.max(.5,Math.min(.9,Number(opts.trainRatio)||.8)),epochs=Math.max(1,Math.min(30,Math.floor(Number(opts.epochs)||8))),hidden=Math.max(8,Math.min(48,Math.floor(Number(opts.hidden)||24))),contextSize=Math.max(2,Math.min(6,Math.floor(Number(opts.contextSize)||4))),lr=Math.max(.0005,Math.min(.1,Number(opts.learningRate)||.025));
 const split=splitLines(corpus,seed,ratio);if(!split.train.length)throw Error("Добавь хотя бы одну непустую строку.");
 const vocabulary=Array.from(new Set(chars(corpus))).sort(),charToId=new Map(vocabulary.map((c,i)=>[c,i+1])),V=vocabulary.length,I=V+1;
 if(V<2)throw Error("Добавь больше разных символов в корпус.");
 const rand=rng(seed),scale=Math.sqrt(2/(contextSize*I+hidden)),W1=new Float64Array(hidden*contextSize*I),b1=new Float64Array(hidden),W2=new Float64Array(V*hidden),b2=new Float64Array(V);
 for(let i=0;i<W1.length;i++)W1[i]=(rand()*2-1)*scale;
 for(let i=0;i<W2.length;i++)W2[i]=(rand()*2-1)*Math.sqrt(2/(hidden+V));
 const m={schema:SCHEMA,version:VERSION,algorithm:"character-level one-hidden-layer tanh MLP + softmax; SGD + backpropagation",seed,epochs,hidden,contextSize,learningRate:lr,vocabulary,charToId,vocabSize:V,inputSize:I,W1:Array.from(W1),b1:Array.from(b1),W2:Array.from(W2),b2:Array.from(b2),trainedAt:null,history:[],corpusLines:split.total,trainedCharacters:0};
 const examples=makeExamples(split.train,charToId,contextSize);if(!examples.length)throw Error("Недостаточно символов для обучения.");
 // Mutable typed arrays are kept in the working model; export converts them to plain arrays.
 m.W1=W1;m.b1=b1;m.W2=W2;m.b2=b2;
 for(let ep=0;ep<epochs;ep++){
  for(let n=examples.length-1;n>0;n--){const j=Math.floor(rand()*(n+1));[examples[n],examples[j]]=[examples[j],examples[n]];}
  let loss=0;
  for(let q=0;q<examples.length;q++){
   const e=examples[q],{h,p}=forward(m,e.ctx);loss-=Math.log(Math.max(1e-12,p[e.y]));
   const dz2=p;dz2[e.y]-=1;
   const dh=new Float64Array(hidden);
   for(let v=0;v<V;v++){const d=dz2[v];b2[v]-=lr*d;const base=v*hidden;for(let j=0;j<hidden;j++){dh[j]+=W2[base+j]*d;W2[base+j]-=lr*d*h[j];}}
   for(let j=0;j<hidden;j++){const dz=dh[j]*(1-h[j]*h[j]);b1[j]-=lr*dz;for(let k=0;k<contextSize;k++)W1[j*contextSize*I+k*I+e.ctx[k]]-=lr*dz;}
  }
  m.history.push({epoch:ep+1,trainCrossEntropy:loss/examples.length});
  if(opts.onProgress)opts.onProgress({epoch:ep+1,epochs,loss:loss/examples.length,percent:Math.round((ep+1)/epochs*100)});
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 m.trainedAt=new Date().toISOString();m.trainedCharacters=examples.length;
 m.metrics={split:{total:split.total,train:split.train.length,test:split.test.length,seed,trainRatio:ratio},train:evaluate(m,split.train),test:split.test.length?evaluate(m,split.test):null};
 return {model:m,split};
}
function generate(m,prompt,opts){
 opts=opts||{};if(!m||m.schema!==SCHEMA||!m.W1)throw Error("Сначала обучи нейросеть.");
 const max=Math.max(1,Math.min(1000,Number(opts.maxChars)||200)),temp=Math.max(.1,Math.min(2,Number(opts.temperature)||.8)),r=rng(Number(opts.seed)||m.seed),V=m.vocabSize,H=m.hidden,C=m.contextSize,I=m.inputSize;
 const map=new Map(m.vocabulary.map((c,i)=>[c,i+1])),out=chars(clean(prompt||"")),ctx=new Int32Array(C);
 for(let n=0;n<max;n++){
  const ids=out.slice(-C).map(c=>map.get(c)||0);ctx.fill(0);for(let j=0;j<ids.length;j++)ctx[C-ids.length+j]=ids[j];
  const {h}=forward(m,ctx),logits=new Float64Array(V);
  for(let v=0;v<V;v++){let z=m.b2[v],base=v*H;for(let j=0;j<H;j++)z+=m.W2[base+j]*h[j];logits[v]=z/temp;}
  const p=softmax(logits);let x=r(),sum=0,pick=V-1;for(let i=0;i<V;i++){sum+=p[i];if(x<=sum){pick=i;break;}}
  out.push(m.vocabulary[pick]);
 }
 return {text:out.join(""),model:"AKSI tiny character MLP "+VERSION,algorithm:m.algorithm,warning:"Маленькая учебная нейросеть; возможен бессвязный текст. Это не большая языковая модель и не фактологический проверяющий модуль."};
}
function serializable(m){return {...m,charToId:Object.fromEntries(m.charToId instanceof Map?m.charToId:Object.entries(m.charToId||{})),W1:Array.from(m.W1),b1:Array.from(m.b1),W2:Array.from(m.W2),b2:Array.from(m.b2)};}
function exportModel(m){return JSON.stringify({format:SCHEMA,exportedAt:new Date().toISOString(),model:serializable(m)},null,2);}
function importModel(raw){const d=typeof raw==="string"?JSON.parse(raw):raw,m=d.model||d;if(m.schema!==SCHEMA||!Array.isArray(m.W1)||!Array.isArray(m.W2)||!Array.isArray(m.vocabulary))throw Error("Файл не распознан как нейросеть AKSI.");return {...m,W1:Float64Array.from(m.W1),b1:Float64Array.from(m.b1),W2:Float64Array.from(m.W2),b2:Float64Array.from(m.b2),charToId:new Map(Object.entries(m.charToId||Object.fromEntries(m.vocabulary.map((c,i)=>[c,i+1]))).map(([k,v])=>[k,Number(v)]))};}
const STORE="aksi_visible_neural_model_v1";
function saveLocal(m){try{root.localStorage.setItem(STORE,exportModel(m));return true;}catch(e){return false;}}
function loadLocal(){try{const raw=root.localStorage.getItem(STORE);return raw?importModel(raw):null;}catch(e){return null;}}
const api={version:VERSION,defaultCorpus:DEFAULT_CORPUS.join("\n"),train,generate,evaluate,exportModel,importModel,splitLines,serializable,saveLocal,loadLocal};
root.AKSI_NEURAL_LAB=api;if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
