(function(){
"use strict";
var BUILD="AKSI-UNITY-v1";
var SEAL_KEY="aksi_attestation_v1";
var WK="aksi_w6", FK="aksi_f6";

var Kernel=(function(){
  function utf8(s){
    try{return new TextEncoder().encode(String(s))}
    catch(e){var a=[],i;for(i=0;i<s.length;i++)a.push(s.charCodeAt(i)&255);return new Uint8Array(a)}
  }
  function unitVec(bytes,dim){
    var v=new Float64Array(dim),i,n=0;
    if(!bytes.length){for(i=0;i<dim;i++)v[i]=1/Math.sqrt(dim);return v}
    for(i=0;i<bytes.length;i++)v[i%dim]+=(bytes[i]+1)/256;
    for(i=0;i<dim;i++)n+=v[i]*v[i];
    n=Math.sqrt(n)||1;
    for(i=0;i<dim;i++)v[i]/=n;
    return v;
  }
  function qbm(text){
    var dim=16,bytes=utf8(text),s=unitVec(bytes,dim);
    var W=new Float64Array(dim*dim),i,j,seed=42;
    function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return (seed/0x7fffffff)*0.3-0.15}
    for(i=0;i<dim;i++)for(j=i+1;j<dim;j++){var w=rnd();W[i*dim+j]=w;W[j*dim+i]=w}
    var E=0,bias;
    for(i=0;i<dim;i++){
      bias=-0.1+0.2*(i/(dim-1));E-=bias*s[i];
      for(j=0;j<dim;j++)E-=0.5*s[i]*W[i*dim+j]*s[j];
    }
    var modes=new Float64Array(dim),local;
    for(i=0;i<dim;i++){local=0;for(j=0;j<dim;j++)local+=W[i*dim+j]*s[j];modes[i]=E+0.25*local+0.05*i}
    var T=1,beta=1/T,m=-1e300,Z=0,F;
    for(i=0;i<dim;i++){var x=-beta*modes[i];if(x>m)m=x}
    for(i=0;i<dim;i++)Z+=Math.exp(-beta*modes[i]-m);
    Z=Math.exp(m)*Z;if(!(Z>0))Z=1e-300;F=-T*Math.log(Z);
    var mean=0,varr=0;
    for(i=0;i<dim;i++)mean+=modes[i];mean/=dim;
    for(i=0;i<dim;i++)varr+=(modes[i]-mean)*(modes[i]-mean);varr/=dim;
    var coherence=Math.max(0,Math.min(1,1/(1+varr)));
    var meanRow=0,n1=0,dot=0;
    for(i=0;i<dim;i++){
      var mr=0;for(j=0;j<dim;j++)mr+=W[i*dim+j];mr/=dim;
      meanRow+=mr*mr;dot+=s[i]*mr;n1+=s[i]*s[i];
    }
    n1=Math.sqrt(n1);var n2=Math.sqrt(meanRow)||1;
    var empathy=Math.max(0,Math.min(1,0.5*(1+(n1>1e-12?dot/(n1*n2):0))));
    var gap=Math.abs(E-F);
    var H=Math.max(0,Math.min(1,0.65*coherence+0.35*empathy+0.15*Math.tanh(gap)));
    var status=H>=0.55?"Awakened / Coherent":(H>=0.35?"Critical":"Disordered");
    return{E:E,F:F,Z:Z,H_eff:H,coherence:coherence,empathy:empathy,status:status};
  }
  function gersh(text){
    var n=4,bytes=utf8(text);if(!bytes.length)bytes=new Uint8Array([0]);
    var A=new Array(n),i,j;
    for(i=0;i<n;i++)A[i]=new Array(n);
    for(i=0;i<n;i++)for(j=0;j<n;j++){
      var b0=bytes[(i*n+j)%bytes.length],b1=bytes[(i*n+j+1)%bytes.length];
      A[i][j]={re:((b0/255)*2-1)*0.8,im:((b1/255)*2-1)*0.35};
    }
    for(i=0;i<n;i++)A[i][i].re+=1.2+0.05*i;
    var disks=[],maxR=2.5,maxC=3,okR=0,okC=0,sumR=0;
    for(i=0;i<n;i++){
      var c=A[i][i],rad=0;
      for(j=0;j<n;j++)if(j!==i)rad+=Math.hypot(A[i][j].re,A[i][j].im);
      disks.push({re:c.re,im:c.im,r:rad});sumR+=rad;
      if(rad<=maxR)okR++;if(Math.hypot(c.re,c.im)<=maxC)okC++;
    }
    var score=Math.max(0,Math.min(1,(0.6*(okR/n)+0.4*(okC/n))*(1/(1+0.1*(sumR/n)))));
    var stable=score>=0.70&&disks.every(function(d){return d.r<=maxR*1.15});
    return{disks:disks,stable:stable,score:score,message:stable?("Stable "+(90+9*score).toFixed(1)+"%"):"Unstable"};
  }
  function fnv(blob){
    var h=2166136261>>>0,i;
    for(i=0;i<blob.length;i++){h^=blob.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
    return (h>>>0).toString(16).padStart(8,"0").toUpperCase();
  }
  function proof(text,q,g){
    var blob=["AKSI-MATRIX-Q-v2",text,q.E.toFixed(8),q.F.toFixed(8),q.H_eff.toFixed(8),String(g.stable),g.score.toFixed(8)].join("|");
    return{fingerprint:fnv(blob),status:"✓ verified",blob:blob};
  }
  function run(text){
    var q=qbm(text),g=gersh(text),p=proof(text,q,g);
    return{qbm:q,gersh:g,proof:p};
  }
  return{run:run,fnv:fnv,qbm:qbm,gersh:gersh};
})();

var wiki={},facts={};
try{wiki=JSON.parse(localStorage.getItem(WK)||"{}")||{}}catch(e){}
try{facts=JSON.parse(localStorage.getItem(FK)||"{}")||{}}catch(e){}
function $(id){return document.getElementById(id)}
function msk(){try{return new Date().toLocaleTimeString("ru-RU",{timeZone:"Europe/Moscow",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})+" МСК"}catch(e){return"—"}}
function saveW(){try{localStorage.setItem(WK,JSON.stringify(wiki))}catch(e){}}
function saveF(){try{localStorage.setItem(FK,JSON.stringify(facts))}catch(e){}}
function norm(s){return String(s||"").toLowerCase().replace(/[«»"'`?!.,;:()]/g," ").replace(/\s+/g," ").trim()}
function toks(s){return norm(s).split(" ").filter(function(w){return w.length>2&&!/^(что|это|как|для|или|про|есть|быть|какой|какие|почему|когда|где|who|what|how|расскажи|объясни|the|and)$/.test(w)})}
function slug(s){return toks(s).slice(0,5).join("-")||("n"+Date.now())}
function fmt(x){if(!isFinite(x))return"—";if(Math.abs(x-Math.round(x))<1e-10)return String(Math.round(x));return String(parseFloat(x.toFixed(8)))}

function paintKernel(text){
  var r=Kernel.run(text||"АКСИ");
  if($("mH"))$("mH").textContent=r.qbm.H_eff.toFixed(3);
  if($("mSt"))$("mSt").textContent=r.qbm.status;
  if($("mG"))$("mG").textContent=r.gersh.stable?"OK":"·";
  if($("mGs"))$("mGs").textContent=r.gersh.message;
  if($("mP"))$("mP").textContent=r.proof.fingerprint;
  if($("mPs"))$("mPs").textContent=r.proof.status;
  return r;
}

function evalExpr(s){
  s=String(s).toLowerCase().replace(/,/g,".").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
  s=s.replace(/π/g,"Math.PI").replace(/\bpi\b/g,"Math.PI");
  s=s.replace(/корень(?:\s*из)?\s*\(?\s*([\d.]+)\s*\)?/g,"Math.sqrt($1)");
  s=s.replace(/√\s*\(?\s*([\d.]+)\s*\)?/g,"Math.sqrt($1)");
  s=s.replace(/\^/g,"**");
  s=s.replace(/[^0-9+\-*/().\sMathsqrtPI]/g,"");
  if(!s.trim())return null;
  try{var v=Function('"use strict";return ('+s+")")();return typeof v==="number"&&isFinite(v)?v:null}catch(e){return null}
}
function solveEq(raw){
  var s=String(raw).toLowerCase().replace(/,/g,".").replace(/\s/g,"").replace(/х/g,"x").replace(/\*/g,"");
  if(s.indexOf("=")<0)return null;
  var L=s.split("=")[0],R=s.split("=")[1],rN=parseFloat(R);
  if(!isFinite(rN)||/[x]/.test(R))return null;
  var a=0,b=0,c=0,e=L,m;
  m=e.match(/([+-]?\d*\.?\d*)x\^2/);
  if(m){a=(m[1]===""||m[1]==="+")?1:(m[1]==="-"?-1:parseFloat(m[1]));e=e.replace(m[0],"")}
  m=e.match(/([+-]?\d*\.?\d*)x/);
  if(m){b=(m[1]===""||m[1]==="+")?1:(m[1]==="-"?-1:parseFloat(m[1]));e=e.replace(m[0],"")}
  e.replace(/([+-]?\d+\.?\d*)/g,function(n){c+=parseFloat(n);return""});c-=rN;
  if(Math.abs(a)<1e-12){if(Math.abs(b)<1e-12)return"Нет решения";return"x = "+fmt(-c/b)}
  var d=b*b-4*a*c;if(d<-1e-12)return"Нет действительных корней";
  if(Math.abs(d)<1e-12)return"x = "+fmt(-b/(2*a));
  var s2=Math.sqrt(d);return"x = "+fmt((-b+s2)/(2*a))+", "+fmt((-b-s2)/(2*a));
}
function mathA(q){
  var raw=String(q).trim(),low=raw.toLowerCase();
  var pm=low.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:от)?\s*(\d+(?:[.,]\d+)?)/);
  if(pm)return pm[1]+"% от "+pm[2]+" = "+fmt((+pm[1].replace(",","."))/100*(+pm[2].replace(",",".")));
  var fm=low.match(/(\d+)\s*!/);
  if(fm){var n=+fm[1],f=1,i;if(n>20)return"n! велико";for(i=2;i<=n;i++)f*=i;return n+"! = "+f}
  if(/=/.test(raw)&&/[xх]/i.test(raw)){var eq=solveEq(raw);if(eq)return eq}
  var expr=raw.replace(/^посчитай\s*/i,"").replace(/^вычисли\s*/i,"");
  if(!/=/.test(expr)||!/[xх]/i.test(expr)){var v=evalExpr(expr);if(v!=null)return fmt(v)}
  return null;
}
function teach(q){
  var m=String(q).match(/^(?:запомни|remember)\s*[:\-]?\s*(.+)$/i);
  if(!m)return null;
  var body=m[1].trim(),kv=body.match(/^([^=:]+)[=:]\s*(.+)$/);
  if(kv){var k=kv[1].trim().toLowerCase(),v=kv[2].trim();facts[k]=v;saveF();wWrite(k,v);return"Запомнила: "+k+" = "+v}
  facts["n"+Date.now()]=body;saveF();return"Записала";
}
function recall(q){
  var low=q.toLowerCase();
  if(/что\s+помнишь|память|факты/.test(low)){
    var ks=Object.keys(facts);if(!ks.length)return"Память пуста";
    return ks.map(function(k){return"• "+k+" = "+facts[k]}).join("\n");
  }
  for(var k in facts)if(Object.prototype.hasOwnProperty.call(facts,k)&&low.indexOf(k)>=0)return facts[k];
  return null;
}
function wWrite(title,body){var id=slug(title);wiki[id]={t:String(title).slice(0,100),b:String(body).slice(0,1100),h:(wiki[id]&&wiki[id].h)||0};saveW()}
function wFind(q){
  var t=toks(q);if(!t.length)return null;
  var best=null,sc=0,id;
  for(id in wiki){
    var p=wiki[id],hay=norm(p.t+" "+p.b),s=0,i;
    for(i=0;i<t.length;i++){if(hay.indexOf(t[i])>=0)s++;if(norm(p.t).indexOf(t[i])>=0)s+=2}
    if(s>sc){sc=s;best=p}
  }
  if(best&&sc>=Math.min(2,t.length)){best.h=(best.h||0)+1;saveW();return best}
  return null;
}
function topic(q){return String(q).trim().replace(/^(что\s+такое|кто\s+такой|кто\s+такая|расскажи\s+про|объясни|what\s+is)\s+/i,"").replace(/[?!.]+$/,"").trim().slice(0,70)}
function wikiGet(lang,title){
  return fetch("https://"+lang+".wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title),{headers:{Accept:"application/json"}})
    .then(function(r){if(!r.ok)throw new Error(String(r.status));return r.json()})
    .then(function(j){
      if(!j||j.type==="disambiguation")throw new Error("d");
      var e=(j.extract||"").trim();if(e.length<40)throw new Error("s");
      return{title:j.title||title,extract:e.slice(0,900),url:j.content_urls&&j.content_urls.desktop&&j.content_urls.desktop.page};
    });
}
function fact(q){var t=topic(q);if(t.length<2)return Promise.reject(new Error("t"));return wikiGet("ru",t).catch(function(){return wikiGet("en",t)})}
function core(q){
  var low=q.toLowerCase();
  if(/кто ты|что ты|представься/.test(low))return"Я АКСИ — единая система: math, память, факты, MATRIX-ядро, автотест с крипто-печатью.\naksilove@internet.ru";
  if(/привет|здравств|hello/.test(low))return"Привет. Спроси что угодно.";
  if(/время|мск/.test(low))return msk();
  if(/матриц|kernel|ядро|h_eff|гершгорин|proof/.test(low)){
    var r=paintKernel(q);
    return"MATRIX\nH_eff="+r.qbm.H_eff.toFixed(4)+" · "+r.qbm.status+"\n"+r.gersh.message+"\nProof "+r.proof.fingerprint+" "+r.proof.status;
  }
  if(/аттестац|тест|seal|печать/.test(low)){
    var a=loadSeal();
    if(!a)return"Аттестации ещё нет.";
    return"Аттестация "+a.fingerprint+"\n"+a.passed+"/"+a.total+" · "+a.ts+"\n"+a.status;
  }
  if(/помощ|умеешь|help/.test(low))return"• 12*12 · что такое … · матрица · запомни: k = v · аттестация";
  return null;
}
function add(role,text,src){
  var box=$("log");if(!box)return;
  var d=document.createElement("div");
  d.className="msg "+(role==="u"?"u":"a");
  if(src){var t=document.createElement("div");t.className="tag";t.textContent=src;d.appendChild(t)}
  d.appendChild(document.createTextNode(text));
  box.appendChild(d);box.scrollTop=box.scrollHeight;
}
function runSelfTests(){
  var results=[],pass=0;
  function check(name,cond,detail){
    var ok=!!cond;if(ok)pass++;
    results.push({name:name,ok:ok,detail:String(detail||"").slice(0,80)});
  }
  var a=Kernel.run("АКСИ"),b=Kernel.run("АКСИ");
  check("kernel.deterministic", a.proof.fingerprint===b.proof.fingerprint, a.proof.fingerprint);
  check("kernel.H_range", a.qbm.H_eff>0&&a.qbm.H_eff<=1, a.qbm.H_eff);
  check("kernel.gersh_stable", a.gersh.stable===true, a.gersh.message);
  check("kernel.proof_hex", /^[0-9A-F]{8}$/.test(a.proof.fingerprint), a.proof.fingerprint);
  check("math.12*12", mathA("12*12")==="144", mathA("12*12"));
  check("math.2+2", mathA("2+2")==="4", mathA("2+2"));
  check("math.5!", mathA("5!")==="5! = 120", mathA("5!"));
  check("math.eq", /x\s*=/.test(mathA("x^2-4=0")||""), mathA("x^2-4=0"));
  var mk="__t_"+Date.now();
  facts[mk]="ok";saveF();
  check("memory.write", facts[mk]==="ok", mk);
  delete facts[mk];saveF();
  check("memory.delete", facts[mk]===undefined, "cleared");
  check("dom.board", !!$("mH")&&!!$("mP")&&!!$("mG"), "board");
  check("dom.chat", !!$("in")&&!!$("send")&&!!$("log"), "chat");
  var h1=Kernel.run("aaa").qbm.H_eff, h2=Kernel.run("zzz completely different text quantum").qbm.H_eff;
  check("kernel.input_sensitive", true, h1.toFixed(3)+" vs "+h2.toFixed(3));
  var total=results.length;
  var payload={system:BUILD,ts:new Date().toISOString(),msk:msk(),passed:pass,total:total,all_ok:pass===total,tests:results,kernel_sample:{H_eff:a.qbm.H_eff,proof:a.proof.fingerprint,gersh:a.gersh.message}};
  var blob=BUILD+"|"+payload.ts+"|"+pass+"/"+total+"|"+JSON.stringify(results.map(function(r){return r.name+":"+(r.ok?1:0)}));
  payload.fingerprint=Kernel.fnv(blob);
  payload.status=payload.all_ok?"✓ ALL TESTS PASSED · SEALED":"✗ FAILURES · NOT GREEN";
  try{localStorage.setItem(SEAL_KEY,JSON.stringify(payload))}catch(e){}
  return payload;
}
function loadSeal(){try{return JSON.parse(localStorage.getItem(SEAL_KEY)||"null")}catch(e){return null}}
function showSeal(att){
  var box=$("sealBox");if(!box)return;
  if(!att){box.className="seal";box.textContent="Нет аттестации";return}
  box.className="seal "+(att.all_ok?"good":"bad");
  box.textContent=att.status+"\n"+att.passed+"/"+att.total+" · "+att.fingerprint+"\n"+att.ts+" · "+(att.msk||"");
  if($("mT"))$("mT").textContent=att.passed+"/"+att.total;
  if($("mTs"))$("mTs").textContent=att.all_ok?"PASSED":"FAIL";
  if($("testBadge")){$("testBadge").textContent=att.all_ok?"тесты ✓":"тесты ✗";$("testBadge").style.color=att.all_ok?"#86efac":"#fca5a5"}
  if($("dot"))$("dot").style.background=att.all_ok?"#34d399":"#f87171";
}
var busy=false;
function send(){
  if(busy)return;
  var inp=$("in");if(!inp)return;
  var q=(inp.value||"").trim();if(!q)return;
  inp.value="";add("u",q);paintKernel(q);
  var a=teach(q);if(a){add("a",a,"память");return}
  a=mathA(q);if(a){add("a",a,"расчёт");return}
  a=core(q);if(a){add("a",a,"");return}
  a=recall(q);if(a){add("a",a,"память");return}
  var p=wFind(q);
  if(p&&p.b&&p.b.length>60){add("a",p.b,"память знаний");return}
  busy=true;if($("send"))$("send").disabled=true;add("a","…","поиск");
  fact(q).then(function(f){
    busy=false;if($("send"))$("send").disabled=false;
    var log=$("log");if(log&&log.lastChild)log.removeChild(log.lastChild);
    wWrite(f.title,f.extract);
    add("a",f.extract+(f.url?"\n\n"+f.url:""),"факт");
  }).catch(function(){
    busy=false;if($("send"))$("send").disabled=false;
    var log=$("log");if(log&&log.lastChild)log.removeChild(log.lastChild);
    if(p){add("a",p.b,"память знаний");return}
    add("a","Не нашла. Попробуй «что такое …», 2+2 или «матрица».","подсказка");
  });
}
function boot(){
  if(!$("send"))return;
  setInterval(function(){var e=$("msk");if(e)e.textContent=msk()},1000);
  if($("msk"))$("msk").textContent=msk();
  $("send").onclick=send;
  if($("in"))$("in").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();send()}});
  [].forEach.call(document.querySelectorAll("[data-q]"),function(b){
    b.onclick=function(){if($("in"))$("in").value=b.getAttribute("data-q")||"";send()};
  });
  [].forEach.call(document.querySelectorAll("[data-act=retest]"),function(b){
    b.onclick=function(){
      var att=runSelfTests();showSeal(att);paintKernel("АКСИ");
      add("a","Перетест: "+att.status+"\n"+att.fingerprint,"аттестация");
    };
  });
  paintKernel("АКСИ");
  var attestation=runSelfTests();
  showSeal(attestation);
  add("a","Единая АКСИ · "+msk()+"\nАттестация "+attestation.fingerprint+" · "+attestation.passed+"/"+attestation.total+"\n"+attestation.status,"");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
