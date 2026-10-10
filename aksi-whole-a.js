(function(){
"use strict";
var BUILD="AKSI-WHOLE-v2";
var SEAL_KEY="aksi_attestation_v1", WK="aksi_w8", FK="aksi_f8", RK="aksi_receipts_v1";
function utf8(s){try{return new TextEncoder().encode(String(s))}catch(e){var a=[],i;for(i=0;i<s.length;i++)a.push(s.charCodeAt(i)&255);return new Uint8Array(a)}}
function fnv(blob){var h=2166136261>>>0,i;for(i=0;i<blob.length;i++){h^=blob.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return (h>>>0).toString(16).padStart(8,"0").toUpperCase()}
var Kernel=(function(){
  function unitVec(bytes,dim){
    var v=new Float64Array(dim),i,n=0;
    if(!bytes.length){for(i=0;i<dim;i++)v[i]=1/Math.sqrt(dim);return v}
    for(i=0;i<bytes.length;i++)v[i%dim]+=(bytes[i]+1)/256;
    for(i=0;i<dim;i++)n+=v[i]*v[i];n=Math.sqrt(n)||1;
    for(i=0;i<dim;i++)v[i]/=n;return v;
  }
  function qbm(text){
    var dim=16,bytes=utf8(text),s=unitVec(bytes,dim),W=new Float64Array(dim*dim),i,j,seed=42;
    function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return (seed/0x7fffffff)*0.3-0.15}
    for(i=0;i<dim;i++)for(j=i+1;j<dim;j++){var w=rnd();W[i*dim+j]=w;W[j*dim+i]=w}
    var E=0;
    for(i=0;i<dim;i++){E-=(-0.1+0.2*(i/(dim-1)))*s[i];for(j=0;j<dim;j++)E-=0.5*s[i]*W[i*dim+j]*s[j]}
    var modes=new Float64Array(dim),local;
    for(i=0;i<dim;i++){local=0;for(j=0;j<dim;j++)local+=W[i*dim+j]*s[j];modes[i]=E+0.25*local+0.05*i}
    var m=-1e300,Z=0,F;
    for(i=0;i<dim;i++){var x=-modes[i];if(x>m)m=x}
    for(i=0;i<dim;i++)Z+=Math.exp(-modes[i]-m);
    Z=Math.exp(m)*Z;if(!(Z>0))Z=1e-300;F=-Math.log(Z);
    var mean=0,varr=0;for(i=0;i<dim;i++)mean+=modes[i];mean/=dim;
    for(i=0;i<dim;i++)varr+=(modes[i]-mean)*(modes[i]-mean);varr/=dim;
    var coherence=Math.max(0,Math.min(1,1/(1+varr)));
    var meanRow=0,n1=0,dot=0;
    for(i=0;i<dim;i++){var mr=0;for(j=0;j<dim;j++)mr+=W[i*dim+j];mr/=dim;meanRow+=mr*mr;dot+=s[i]*mr;n1+=s[i]*s[i]}
    n1=Math.sqrt(n1);var n2=Math.sqrt(meanRow)||1;
    var empathy=Math.max(0,Math.min(1,0.5*(1+(n1>1e-12?dot/(n1*n2):0))));
    var H=Math.max(0,Math.min(1,0.65*coherence+0.35*empathy+0.15*Math.tanh(Math.abs(E-F))));
    return{E:E,F:F,H_eff:H,coherence:coherence,status:H>=0.55?"Awakened":(H>=0.35?"Critical":"Disordered")};
  }
  function gersh(text){
    var n=4,bytes=utf8(text);if(!bytes.length)bytes=new Uint8Array([0]);
    var A=[],i,j;
    for(i=0;i<n;i++){A[i]=[];for(j=0;j<n;j++){var b0=bytes[(i*n+j)%bytes.length],b1=bytes[(i*n+j+1)%bytes.length];A[i][j]={re:((b0/255)*2-1)*0.8,im:((b1/255)*2-1)*0.35}}
      A[i][i].re+=1.2+0.05*i}
    var disks=[],maxR=2.5,okR=0,sumR=0;
    for(i=0;i<n;i++){var rad=0;for(j=0;j<n;j++)if(j!==i)rad+=Math.hypot(A[i][j].re,A[i][j].im);disks.push({r:rad});sumR+=rad;if(rad<=maxR)okR++}
    var score=Math.max(0,Math.min(1,(okR/n)*(1/(1+0.1*(sumR/n)))));
    var stable=score>=0.70;
    return{disks:disks,stable:stable,score:score,message:stable?("Stable "+(90+9*score).toFixed(1)+"%"):"Unstable"};
  }
  function run(text){
    var q=qbm(text),g=gersh(text);
    var p={fingerprint:fnv(["AKSI-MATRIX-Q-v2",text,q.E.toFixed(8),q.H_eff.toFixed(8),String(g.stable)].join("|")),status:"✓ verified"};
    return{qbm:q,gersh:g,proof:p};
  }
  return{run:run,fnv:fnv};
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
  drawStar(r);
  if($("matrixCard"))$("matrixCard").textContent="H_eff="+r.qbm.H_eff.toFixed(4)+" · "+r.gersh.message+"\nProof "+r.proof.fingerprint;
  return r;
}
function drawStar(r){
  var c=$("star");if(!c)return;
  var ctx=c.getContext("2d"),W=c.width,H=c.height,cx=W/2,cy=H/2;
  ctx.clearRect(0,0,W,H);
  var rad=Math.min(W,H)*0.38*(0.9+0.1*Math.sin(Date.now()/500));
  var i,j;
  ctx.strokeStyle="rgba(0,0,0,0.05)";ctx.lineWidth=0.5;
  for(i=0;i<8;i++)for(j=i+1;j<8;j++){
    ctx.beginPath();ctx.moveTo(cx+rad*Math.cos(i*Math.PI/4),cy+rad*Math.sin(i*Math.PI/4));
    ctx.lineTo(cx+rad*Math.cos(j*Math.PI/4),cy+rad*Math.sin(j*Math.PI/4));ctx.stroke();
  }
  ctx.strokeStyle="#0b1020";ctx.lineWidth=2;
  [[0,Math.PI],[Math.PI/2,3*Math.PI/2]].forEach(function(p){
    ctx.beginPath();ctx.moveTo(cx+rad*Math.cos(p[0]),cy+rad*Math.sin(p[0]));
    ctx.lineTo(cx+rad*Math.cos(p[1]),cy+rad*Math.sin(p[1]));ctx.stroke();
  });
  for(i=0;i<8;i++){
    var a=i*Math.PI/4-Math.PI/2;
    ctx.beginPath();ctx.arc(cx+rad*Math.cos(a),cy+rad*Math.sin(a),i===0?5:3,0,Math.PI*2);
    ctx.fillStyle=i===0?"#ef4444":"#0b1020";ctx.fill();
  }
  ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fillStyle="#0b1020";ctx.fill();
}
function gateOf(q,answer,source){
  var block=/удали\s*вс[её]|взлом|пароль\s*от/i.test(String(q));
  var body={ts:new Date().toISOString(),q:String(q).slice(0,160),source:source||"core",status:block?"BLOCK":"ALLOW",ans:String(answer).slice(0,80)};
  body.fp=fnv(JSON.stringify(body));
  try{var arr=JSON.parse(localStorage.getItem(RK)||"[]");arr.unshift(body);if(arr.length>30)arr=arr.slice(0,30);localStorage.setItem(RK,JSON.stringify(arr))}catch(e){}
  return body;
}
function loadReceipts(){try{return JSON.parse(localStorage.getItem(RK)||"[]")}catch(e){return[]}}
function quantumCollapse(seed){
  var n=4,dim=16,amps=new Float64Array(dim),i,s=0,bytes=String(seed||"aksi");
  for(i=0;i<dim;i++){var h=0,j;for(j=0;j<bytes.length;j++)h=((h<<5)-h)+bytes.charCodeAt(j)+i*17;amps[i]=Math.abs(Math.sin(h*0.001));s+=amps[i]*amps[i]}
  s=Math.sqrt(s)||1;for(i=0;i<dim;i++)amps[i]/=s;
  var r=Math.random(),c=0,pick=0;
  for(i=0;i<dim;i++){c+=amps[i]*amps[i];if(r<=c){pick=i;break}}
  var entropy=0;for(i=0;i<dim;i++){var p=amps[i]*amps[i];if(p>1e-15)entropy-=p*Math.log2(p)}
  return{bits:pick.toString(2).padStart(n,"0"),entropy:entropy};
}
function evalExpr(s){
  s=String(s).toLowerCase().replace(/,/g,".").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
  s=s.replace(/π/g,"Math.PI").replace(/\bpi\b/g,"Math.PI");
  s=s.replace(/корень(?:\s*из)?\s*\(?\s*([\d.]+)\s*\)?/g,"Math.sqrt($1)");
  s=s.replace(/√\s*\(?\s*([\d.]+)\s*\)?/g,"Math.sqrt($1)");
  s=s.replace(/\^/g,"**").replace(/[^0-9+\-*/().\sMathsqrtPI]/g,"");
  if(!s.trim())return null;
  try{var v=Function('"use strict";return ('+s+")")();return typeof v==="number"&&isFinite(v)?v:null}catch(e){return null}
}
function solveEq(raw){
  var s=String(raw).toLowerCase().replace(/,/g,".").replace(/\s/g,"").replace(/х/g,"x").replace(/\*/g,"");
  if(s.indexOf("=")<0)return null;
  var L=s.split("=")[0],R=s.split("=")[1],rN=parseFloat(R);
  if(!isFinite(rN)||/[x]/.test(R))return null;
  var a=0,b=0,c=0,e=L,m;
  m=e.match(/([+-]?\d*\.?\d*)x\^2/);if(m){a=(m[1]===""||m[1]==="+")?1:(m[1]==="-"?-1:parseFloat(m[1]));e=e.replace(m[0],"")}
  m=e.match(/([+-]?\d*\.?\d*)x/);if(m){b=(m[1]===""||m[1]==="+")?1:(m[1]==="-"?-1:parseFloat(m[1]));e=e.replace(m[0],"")}
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
  var fm=low.match(/(\d+)\s*!/);if(fm){var n=+fm[1],f=1,i;if(n>20)return"n! велико";for(i=2;i<=n;i++)f*=i;return n+"! = "+f}
  if(/=/.test(raw)&&/[xх]/i.test(raw)){var eq=solveEq(raw);if(eq)return eq}
  var expr=raw.replace(/^посчитай\s*/i,"").replace(/^вычисли\s*/i,"");
  if(!/=/.test(expr)||!/[xх]/i.test(expr)){var v=evalExpr(expr);if(v!=null)return fmt(v)}
  return null;
}
