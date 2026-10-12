/*!
 * AKSI Native DNA-Topology Engine v0.1.0
 * Pure JavaScript / CPU. No remote API and no downloaded model weights.
 * This is a small retrieval-and-recombination generator, NOT a neural language model.
 */
(function (root) {
  "use strict";
  const VERSION = "0.1.0";
  const KEY = "aksi_native_dna_topology_v1";
  const STOP = new Set(("и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему когда даже ну ли если или ни быть был него до вас опять уж вам сказал там этот").split(" "));
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const clean = (s,n)=>String(s==null?"":s).replace(/\s+/g," ").trim().slice(0,n||5000);
  function tokens(s) {
    return (clean(s,5000).toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu)||[])
      .filter(t=>t.length>1&&!STOP.has(t)).slice(0,160);
  }
  function hash(s) {
    let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function base(t) { return ["A","C","G","T"][hash(t)%4]; }
  function complement(seq) {
    const m={A:"T",T:"A",C:"G",G:"C"};
    return seq.split("").reverse().map(x=>m[x]||"N").join("");
  }
  // A transparent knot-like feature signature. This is NOT a Jones polynomial.
  function topology(ts) {
    const seq=ts.slice(0,96).map(base).join("");
    let crossings=0,writhe=0;
    for(let i=1;i<seq.length;i++) if(seq[i]===seq[i-1]) {crossings++;writhe+=(seq[i]==="A"||seq[i]==="G")?1:-1;}
    const pairings=[];
    for(let i=0;i+3<seq.length;i++) if(seq[i]===seq[i+3]&&seq[i+1]!==seq[i+2]) pairings.push(i);
    return {sequence:seq,complement:complement(seq),length:seq.length,crossings,writhe,loopCount:pairings.length,invariant:"AKSI-DNA-SIGNATURE/1",note:"Эвристический цифровой отпечаток последовательности; не биологическая ДНК и не многочлен Джонса."};
  }
  function jaccard(a,b) {
    const A=new Set(a),B=new Set(b);if(!A.size||!B.size)return 0;
    let n=0;A.forEach(x=>{if(B.has(x))n++;});return n/(A.size+B.size-n);
  }
  let memory={schema:"AKSI-NATIVE-MEMORY/1",episodes:[],ratings:{},learned:[]};
  function load() {
    try {const x=root.localStorage&&root.localStorage.getItem(KEY);if(x){const p=JSON.parse(x);if(p&&p.schema===memory.schema)memory=Object.assign(memory,p);}}catch(_){}
  }
  load();
  function save(){try{root.localStorage.setItem(KEY,JSON.stringify(memory));return true;}catch(_){return false;}}
  function corpus() {
    const out=[];
    const seed=Array.isArray(root.__AKSI_SEED)?root.__AKSI_SEED:[];
    seed.forEach((x,i)=>{if(x&&x.q&&x.a)out.push({id:"seed-"+i,q:clean(x.q),a:clean(x.a,1800),tokens:tokens(x.q+" "+x.a),source:"built-in"});});
    memory.learned.forEach((x,i)=>{if(x&&x.q&&x.a)out.push({id:"learned-"+i,q:x.q,a:x.a,tokens:tokens(x.q+" "+x.a),source:"user-feedback"});});
    memory.episodes.slice(-200).forEach((x,i)=>{if(x&&x.q&&x.a)out.push({id:"episode-"+i,q:x.q,a:x.a,tokens:tokens(x.q+" "+x.a),source:"local-episode"});});
    return out;
  }
  function rank(query) {
    const q=tokens(query), rows=corpus().map(item=>{
      const qscore=jaccard(q,tokens(item.q));
      const ascore=jaccard(q,item.tokens);
      const learned=memory.ratings[item.id]||0;
      return Object.assign({},item,{score:Number((0.72*qscore+0.28*ascore+learned*0.025).toFixed(5))});
    }).sort((a,b)=>b.score-a.score);
    return {queryTokens:q,items:rows.slice(0,5),best:rows[0]||null};
  }
  function splitSentences(s){return clean(s,5000).match(/[^.!?]+[.!?]?/g)||[];}
  function compose(query, ranked) {
    const best=ranked.best, q=ranked.queryTokens;
    if(best&&best.score>=0.28) {
      const related=ranked.items.filter(x=>x.score>=Math.max(0.16,best.score*0.55));
      let body=best.a;
      if(related.length>1&&best.score<0.65){
        const extra=splitSentences(related[1].a).filter(s=>tokens(s).some(t=>q.includes(t))).slice(0,1).join(" ");
        if(extra&&!body.includes(extra))body=body+" "+extra;
      }
      return {text:body,mode:"retrieval_recombination",confidence:best.score,matched:related.map(x=>({question:x.q,score:x.score,source:x.source})),disclaimer:best.source==="user-feedback"?"Ответ опирается на локальный материал, отмеченный пользователем; оценка не подтверждает истинность.":null};
    }
    const snippets=ranked.items.filter(x=>x.score>0.04).slice(0,3);
    if(snippets.length){
      const selected=[];
      snippets.forEach(x=>splitSentences(x.a).forEach(s=>{
        const ts=tokens(s), overlap=ts.filter(t=>q.includes(t)).length;
        if(overlap)selected.push({s,score:overlap/Math.max(1,ts.length),source:x.q});
      }));
      selected.sort((a,b)=>b.score-a.score);
      if(selected.length>=1){
        const sentences=selected.slice(0,3).map(x=>x.s.trim()).filter(Boolean);
        return {text:"Я собрала ответ из близких фрагментов локальной базы. Совпадение неполное, поэтому проверь вывод.\n\n"+Array.from(new Set(sentences)).join(" "),mode:"semantic_recombination",confidence:snippets[0].score,matched:snippets.map(x=>({question:x.q,score:x.score,source:x.source}))};
      }
    }
    const queryText=clean(query,400);
    const intro="Я — АКСИ с собственным локальным генератором. Я разобрала запрос на смысловые признаки и сопоставила их с моей небольшой памятью, но надёжного знания для уверенного ответа пока недостаточно.";
    const follow="Могу продолжить, если ты уточнишь цель или добавишь пример/источник. Новые знания не считаются проверенными только потому, что попали в память.";
    return {text:intro+"\n\nЗапрос: «"+queryText+"».\n\n"+follow,mode:"transparent_abstention",confidence:0,matched:[]};
  }
  function generate(query, options) {
    options=options||{};
    const q=clean(query,1200);
    if(!q)return {text:"Напиши вопрос — я обработаю его локально.",mode:"empty"};
    const ts=tokens(q), ranked=rank(q), dna=topology(ts);
    const result=compose(q,ranked);
    const out={
      text:result.text,source:"aksi-native-dna-topology",model:"AKSI Native Generator "+VERSION,
      core:"AKSI Unified Adaptive Core + Native DNA-Topology Engine",
      mode:result.mode,confidence:result.confidence,matched:result.matched,
      dna:{length:dna.length,crossings:dna.crossings,writhe:dna.writhe,loopCount:dna.loopCount,invariant:dna.invariant,note:dna.note},
      observer:{queryTokenCount:ts.length,selectedMemoryItems:result.matched.length,selection:"query-conditioned classical retrieval and recombination"},
      limitations:["No WebLLM, remote model, or downloaded neural weights are used.","This is a small retrieval/recombination generator, not a trained neural language model.","DNA/knot values are heuristic text fingerprints, not biological or quantum processes.","Confidence is a retrieval-overlap score, not probability of truth."]
    };
    memory.episodes.push({q,a:result.text,mode:result.mode,at:new Date().toISOString(),tokens:ts.slice(0,80)});
    if(memory.episodes.length>200)memory.episodes=memory.episodes.slice(-200);
    save();
    return out;
  }
  function feedback(query, answer, rating) {
    rating=Number(rating);if(rating!==1&&rating!==-1)throw new RangeError("rating must be 1 or -1");
    const q=clean(query,1200),a=clean(answer,5000);
    const ep=memory.episodes.slice().reverse().find(x=>x.q===q&&x.a===a);
    if(!ep)return {ok:false,reason:"episode_not_found"};
    const key=ep.mode+":"+hash(q+"|"+a);
    memory.ratings[key]=clamp((memory.ratings[key]||0)+rating,-4,4);
    const matched=rank(q).items[0];
    if(matched&&rating>0&&!memory.learned.some(x=>x.q===q&&x.a===a)){
      memory.learned.push({q,a,at:new Date().toISOString()});
      memory.learned=memory.learned.slice(-100);
    }
    ep.rating=rating;ep.ratingAt=new Date().toISOString();
    return {ok:true,persisted:save(),rating:rating,learned:rating>0};
  }
  function stats(){return {version:VERSION,mode:"offline-retrieval-recombination",seedItems:Array.isArray(root.__AKSI_SEED)?root.__AKSI_SEED.length:0,learnedItems:memory.learned.length,episodes:memory.episodes.length,feedbackKeys:Object.keys(memory.ratings).length,storageKey:KEY};}
  function clearMemory(){memory={schema:"AKSI-NATIVE-MEMORY/1",episodes:[],ratings:{},learned:[]};return {ok:true,persisted:save()};}
  root.AKSI_DNA_TOPOLOGY={version:VERSION,generate,feedback,stats,clearMemory,tokens,topology,rank};
  if(typeof module==="object"&&module.exports)module.exports=root.AKSI_DNA_TOPOLOGY;
})(typeof window!=="undefined"?window:globalThis);
