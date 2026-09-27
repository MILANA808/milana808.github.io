/**
 * AKSI-СМЫСЛ / MATRIX-MIND v2.0
 * Deterministic geometric cognition demo.
 * No server. No external API. No probabilistic text generation.
 *
 * INPUT -> S(t+1) -> Hebbian memory -> cosine resonance -> phrase
 *                         \-> SHA-256 proof
 */
(function (G) {
  "use strict";

  var VER = "2.0.0-geometric";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var DIM = 4;
  var KEY = "aksi_matrix_mind_v2";

  // The four controls are the canonical basis of the 4D semantic space.
  var ZONES = {
    "кто ты":  [1, 0, 0, 0],
    "алфавит": [0, 1, 0, 0],
    "запомни": [0, 0, 1, 0],
    "math":    [0, 0, 0, 1]
  };

  // Fixed semantic matrix: every answer has a fixed ideal vector.
  // There is no LLM and no generated wording in this layer.
  var CONCEPTS = [
    { id:"identity", v:[1,0,0,0],
      text:"Я АКСИ-СМЫСЛ. Мой ответ выбирается геометрическим резонансом в 4D-пространстве." },
    { id:"identity-detail", v:[0.94,0.06,0,0],
      text:"АКСИ работает локально: состояние S, память 4×4 и фиксированная матрица понятий." },
    { id:"alphabet", v:[0,1,0,0],
      text:"Русский алфавит содержит 33 буквы: А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я." },
    { id:"alphabet-detail", v:[0.08,0.92,0,0],
      text:"Гласные: А Е Ё И О У Ы Э Ю Я. Ъ и Ь — знаки, остальные 21 буква — согласные." },
    { id:"memory", v:[0,0,1,0],
      text:"Память АКСИ обновляется правилом Хебба: состояние S оставляет след в матрице 4×4." },
    { id:"memory-detail", v:[0.04,0.04,0.92,0],
      text:"Каждый новый импульс изменяет синаптическую матрицу. Состояние сохраняется локально в браузере." },
    { id:"math", v:[0,0,0,1],
      text:"Математический контур: S нормализуется, затем сравнивается с фиксированными векторами по скалярному произведению." },
    { id:"math-detail", v:[0.05,0.05,0.05,0.85],
      text:"Косинусное сходство для единичных векторов равно их скалярному произведению." },
    { id:"balance", v:[0.5,0.5,0,0],
      text:"Состояние находится между зонами идентичности и алфавита: ответ определяется расстоянием до фиксированных понятий." },
    { id:"greeting", v:[0.7,0,0.3,0],
      text:"Привет. Новый импульс изменит S, запишется в память и изменит ближайшую смысловую зону." },
    { id:"formula", v:[0.1,0.1,0,0.8],
      text:"AKSI = геометрическое состояние + память + проверяемый след операции." }
  ];

  var S = [1,0,0,0];
  var W = zeroMatrix();
  var t = 0;
  var lastInput = [0,0,0,0];
  var lastZone = "кто ты";
  var lastAnswer = "";

  function zeroMatrix() {
    var m = [], i, j;
    for (i=0;i<DIM;i++) {
      m[i] = [];
      for (j=0;j<DIM;j++) m[i][j] = 0;
    }
    return m;
  }

  function clone(v) { return v.slice(); }

  function norm(v) {
    var q = 0, i, out = [];
    for (i=0;i<DIM;i++) q += (v[i] || 0) * (v[i] || 0);
    q = Math.sqrt(q);
    if (!q) return [0,0,0,0];
    for (i=0;i<DIM;i++) out[i] = v[i] / q;
    return out;
  }

  function add(a,b) {
    var o=[],i;
    for(i=0;i<DIM;i++) o[i]=(a[i]||0)+(b[i]||0);
    return o;
  }

  function dot(a,b) {
    var s=0,i;
    for(i=0;i<DIM;i++) s+=(a[i]||0)*(b[i]||0);
    return s;
  }

  function cosine(a,b) {
    var na=norm(a), nb=norm(b);
    return dot(na,nb);
  }

  // Exact requirement: S(t+1) = normalize(S(t) + input).
  function applyInput(input) {
    S = norm(add(S,input));
    lastInput = clone(input);
    t += 1;
    return clone(S);
  }

  // Continuous Hebbian update. Diagonal is kept at zero.
  function hebbBake(v) {
    var x=norm(v),i,j;
    for(i=0;i<DIM;i++) {
      for(j=0;j<DIM;j++) {
        if(i===j) W[i][j]=0;
        else W[i][j] += x[i]*x[j];
      }
    }
    // Gentle decay prevents unbounded growth while preserving history.
    for(i=0;i<DIM;i++) for(j=0;j<DIM;j++) W[i][j]*=0.985;
  }

  function choosePhrase() {
    var best=null, i, score;
    for(i=0;i<CONCEPTS.length;i++) {
      score=cosine(S,CONCEPTS[i].v);
      if(!best || score>best.score)
        best={index:i,score:score,id:CONCEPTS[i].id,text:CONCEPTS[i].text,v:clone(CONCEPTS[i].v)};
    }
    return best;
  }

  function canonicalMemory() {
    return W.map(function(row){
      return row.map(function(x){ return Number(x.toFixed(12)); });
    });
  }

  function canonicalState() {
    return {
      S:S.map(function(x){return Number(x.toFixed(12));}),
      memory:canonicalMemory(),
      identity:DID,
      t:t,
      input:lastInput.map(function(x){return Number(x.toFixed(12));}),
      zone:lastZone
    };
  }

  function fallbackHash(str) {
    // Only a compatibility fallback. SHA-256 is used in normal browsers.
    var h=2166136261>>>0,i;
    for(i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    return ("00000000"+h.toString(16)).slice(-8);
  }

  async function proof() {
    var payload=JSON.stringify(canonicalState());
    var bytes=new TextEncoder().encode(payload);
    if(G.crypto && G.crypto.subtle){
      var digest=await G.crypto.subtle.digest("SHA-256",bytes);
      var hex=Array.from(new Uint8Array(digest)).map(function(b){
        return b.toString(16).padStart(2,"0");
      }).join("");
      return {alg:"SHA-256",hash:hex,payload:payload};
    }
    return {alg:"FNV-1a fallback (not cryptographic)",hash:fallbackHash(payload),payload:payload};
  }

  function save() {
    try {
      G.localStorage.setItem(KEY,JSON.stringify({
        S:S,W:W,t:t,lastInput:lastInput,lastZone:lastZone,lastAnswer:lastAnswer
      }));
    } catch(e) {}
  }

  function restore() {
    try {
      var raw=G.localStorage.getItem(KEY);
      if(!raw) return;
      var p=JSON.parse(raw);
      if(p && Array.isArray(p.S) && p.S.length===DIM) S=p.S;
      if(p && Array.isArray(p.W) && p.W.length===DIM) W=p.W;
      if(p && typeof p.t==="number") t=p.t;
      if(p && Array.isArray(p.lastInput)) lastInput=p.lastInput;
      if(p && p.lastZone) lastZone=p.lastZone;
      if(p && p.lastAnswer) lastAnswer=p.lastAnswer;
    } catch(e) {}
  }

  function zoneFor(text) {
    var s=String(text||"").trim().toLowerCase();
    if(ZONES[s]) return {name:s,v:clone(ZONES[s])};
    if(/кто\s+ты|who\s+are\s+you/.test(s)) return {name:"кто ты",v:clone(ZONES["кто ты"])};
    if(/алфавит|азбук|букв/.test(s)) return {name:"алфавит",v:clone(ZONES["алфавит"])};
    if(/запомни|remember/.test(s)) return {name:"запомни",v:clone(ZONES["запомни"])};
    if(/math|математ|посчитай|вычисли/.test(s)) return {name:"math",v:clone(ZONES.math)};
    // Unknown text does not get an invented semantic vector.
    return {name:"neutral",v:[0,0,0,0]};
  }

  async function think(input) {
    var z=zoneFor(input);
    var vector=clone(z.v);

    // The four canonical controls always perform the exact state transition.
    applyInput(vector);
    hebbBake(S);

    var selected=choosePhrase();
    lastZone=z.name;
    lastAnswer=selected.text;
    save();

    var p=await proof();

    var result={
      ok:true,
      version:VER,
      did:DID,
      button:z.name,
      input:clone(vector),
      S:clone(S),
      memory:canonicalMemory(),
      answer:selected.text,
      concept:selected.id,
      conceptVector:clone(selected.v),
      similarity:Number(selected.score.toFixed(9)),
      proof:{alg:p.alg,hash:p.hash},
      t:t
    };

    render(result);
    return result;
  }

  function fmt(v) {
    return "["+v.map(function(x){return Number(x).toFixed(3);}).join(", ")+"]";
  }

  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function renderMemory(m) {
    var el=document.getElementById("vec-memory");
    if(!el) return;
    var html="<table class='mem'><tbody>",i,j,x,a;
    for(i=0;i<DIM;i++){
      html+="<tr>";
      for(j=0;j<DIM;j++){
        x=Number(m[i][j]||0);
        a=Math.min(.65,Math.abs(x)/2);
        html+="<td style='background:rgba(126,182,255,"+a.toFixed(3)+")'>"+x.toFixed(3)+"</td>";
      }
      html+="</tr>";
    }
    html+="</tbody></table>";
    el.innerHTML=html;
  }

  function renderSVG() {
    var svg=document.getElementById("mind-svg");
    if(!svg) return;
    var cx=180,cy=180,r=125;
    var pts=[
      [cx,cy-r],
      [cx+r,cy],
      [cx,cy+r],
      [cx-r,cy]
    ];
    var labels=["WHO","ABC","MEM","MATH"];
    var html="";
    for(var i=0;i<4;i++){
      html+="<line x1='"+cx+"' y1='"+cy+"' x2='"+pts[i][0]+"' y2='"+pts[i][1]+"' stroke='rgba(126,182,255,.22)'/>";
      html+="<circle cx='"+pts[i][0]+"' cy='"+pts[i][1]+"' r='7' fill='rgba(126,182,255,.65)'/>";
      html+="<text x='"+pts[i][0]+"' y='"+(pts[i][1]+(i===0?-14:i===2?24:4))+"' text-anchor='middle' fill='#8b93a7' font-size='10'>"+labels[i]+"</text>";
    }
    var px=cx+S[0]*r, py=cy-S[1]*r;
    html+="<circle cx='"+px.toFixed(2)+"' cy='"+py.toFixed(2)+"' r='10' fill='#3dd68c'/>";
    html+="<line x1='"+cx+"' y1='"+cy+"' x2='"+px.toFixed(2)+"' y2='"+py.toFixed(2)+"' stroke='#3dd68c' stroke-width='3'/>";
    svg.innerHTML=html;
  }

  function render(r) {
    var ans=document.getElementById("ans");
    var input=document.getElementById("vec-input");
    var s=document.getElementById("vec-S");
    var id=document.getElementById("identity");
    var pr=document.getElementById("proof");
    if(ans) ans.textContent=r.answer;
    if(input) input.textContent=fmt(r.input);
    if(s) s.textContent=fmt(r.S);
    if(id) id.textContent=r.did;
    renderMemory(r.memory);
    if(pr) pr.innerHTML="proof · "+esc(r.proof.alg)+" · <b>"+esc(r.proof.hash)+"</b><br/>similarity = "+r.similarity+" · t = "+r.t;
    renderSVG();
  }

  function bind() {
    restore();
    render({
      answer:lastAnswer||"Я АКСИ-СМЫСЛ. Нажмите одну из четырёх зон.",
      input:lastInput,S:S,memory:canonicalMemory(),did:DID,
      proof:{alg:"ready",hash:"—"},similarity:"—",t:t
    });

    var q=document.getElementById("q"), go=document.getElementById("go");
    if(go) go.addEventListener("click",function(){think(q?q.value:"");});
    if(q) q.addEventListener("keydown",function(e){if(e.key==="Enter") think(q.value);});

    document.querySelectorAll("[data-zone]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var z=btn.getAttribute("data-zone");
        if(q) q.value=z;
        think(z);
      });
    });
  }

  restore();
  if(typeof document!=="undefined"){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bind);
    else setTimeout(bind,0);
  }

  G.AKSI_SMYSL={
    version:VER,did:DID,
    think:think,
    getS:function(){return clone(S);},
    getW:function(){return W.map(clone);},
    zones:ZONES,
    concepts:CONCEPTS,
    status:function(){return {version:VER,did:DID,dim:DIM,t:t,concepts:CONCEPTS.length};}
  };
})(typeof globalThis!=="undefined"?globalThis:window);
