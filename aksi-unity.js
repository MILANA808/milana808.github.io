(function(){"use strict";
var S={entropy:null,bits:null,eqs:null,lastGate:null,did:null,chain:[],T:1.2,energy:null,mag:null,Cv:null,phase:"—",Tc:2,spins:null,N:16,H_eff:null};
var bus={};function on(e,f){(bus[e]||(bus[e]=[])).push(f)}
function emit(e,d){S.chain.push({t:Date.now(),ev:e,d:d||null});if(S.chain.length>50)S.chain=S.chain.slice(-50);(bus[e]||[]).forEach(function(f){try{f(d)}catch(x){}});paintTop();paintChain()}
function $(i){return document.getElementById(i)}
function set(i,t){var e=$(i);if(e)e.textContent=t}
function paintTop(){
set("msk",new Date().toLocaleTimeString("ru-RU",{timeZone:"Europe/Moscow",hour:"2-digit",minute:"2-digit",second:"2-digit"})+" MSK");
set("qEnt","H="+(S.entropy==null?"—":S.entropy.toFixed(2)));
set("eqsLive","EQS="+(S.eqs==null?"—":S.eqs));
set("gateLive","gate="+(S.lastGate||"—"));
set("phaseLive","φ="+(S.phase||"—"));
var b=$("sharedBox");
if(b)b.textContent="T="+S.T.toFixed(2)+" · φ="+S.phase+" · m="+(S.mag==null?"—":S.mag.toFixed(3))+" · H_eff="+(S.H_eff==null?"—":S.H_eff.toFixed(3))+" · EQS="+(S.eqs==null?"—":S.eqs)+" · gate="+(S.lastGate||"—");
}
function paintChain(){var el=$("chainLog");if(!el)return;el.textContent=S.chain.slice(-14).map(function(c){return c.ev+(c.d&&c.d.note?" · "+c.d.note:"")}).join("\n")||"пусто — «Связать всё»"}
function go(name){
document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.getAttribute("data-p")===name)});
document.querySelectorAll(".bnav button").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-go")===name)});
try{history.replaceState(null,"","#"+name)}catch(e){}
window.scrollTo(0,0);
if(name==="world")requestAnimationFrame(worldFrame);
if(name==="phase")drawPhaseChart();
}
function b64(u8){var s="";u8.forEach(function(x){s+=String.fromCharCode(x)});return btoa(s)}
async function ensureDid(){
if(S.did&&S._priv)return;
var kp=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
S._priv=kp.privateKey;S._pub=kp.publicKey;
var raw=new Uint8Array(await crypto.subtle.exportKey("raw",kp.publicKey));
S.did="did:aksi:p256:"+b64(raw).replace(/[^a-zA-Z0-9]/g,"").slice(0,22);
set("didShort",S.did.slice(0,18)+"…");set("didFull",S.did);
}
async function signPayload(obj){
await ensureDid();
var msg=new TextEncoder().encode(JSON.stringify(obj));
var sig=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},S._priv,msg));
return b64(sig);
}
var J=1.0;
function textToSpins(text,N){N=N||16;var bytes=new TextEncoder().encode(String(text||"aksi")||"aksi");if(!bytes.length)bytes=new Uint8Array([1]);var spins=new Int8Array(N);for(var i=0;i<N;i++){var bit=(bytes[i%bytes.length]>>(i%8))&1;spins[i]=bit?1:-1}return spins}
function isingEnergy(spins){var E=0,n=spins.length;for(var i=0;i<n;i++)E-=J*spins[i]*spins[(i+1)%n];return E}
function magnetization(spins){var s=0;for(var i=0;i<spins.length;i++)s+=spins[i];return s/spins.length}
function metropolisSweep(spins,T){var n=spins.length,beta=1/Math.max(T,1e-6);for(var step=0;step<n;step++){var i=(Math.random()*n)|0;var left=spins[(i-1+n)%n],right=spins[(i+1)%n];var dE=2*J*spins[i]*(left+right);if(dE<=0||Math.random()<Math.exp(-beta*dE))spins[i]=-spins[i]}return spins}
function runGibbsAtT(spins0,T,sweeps){sweeps=sweeps||80;var spins=new Int8Array(spins0),burn=(sweeps/3)|0,sumM=0,sumE=0,sumE2=0,cnt=0;for(var i=0;i<sweeps;i++){metropolisSweep(spins,T);if(i>=burn){var m=magnetization(spins),E=isingEnergy(spins);sumM+=Math.abs(m);sumE+=E;sumE2+=E*E;cnt++}}var meanM=sumM/cnt,meanE=sumE/cnt,varE=Math.max(0,sumE2/cnt-meanE*meanE);return{spins:spins,mag:meanM,energy:meanE,Cv:varE/(T*T),T:T}}
function classifyPhase(mag,Cv,T,Tc){var near=Math.abs(T-Tc)/Tc<0.35;if(mag>0.55&&T<Tc*1.1)return"ORDERED";if(mag<0.25&&T>Tc*0.9)return"DISORDERED";if(near||(Cv>0.15&&mag>0.2&&mag<0.6))return"CRITICAL";return mag>=0.4?"ORDERED":"DISORDERED"}
function phaseDiagram(text){var base=textToSpins(text,S.N),pts=[],Tmin=0.3,Tmax=3.5,steps=12;for(var k=0;k<=steps;k++){var T=Tmin+(Tmax-Tmin)*(k/steps);var r=runGibbsAtT(base,T,50);pts.push({T:T,m:r.mag,E:r.energy,Cv:r.Cv})}return pts}
function applyPhaseFromText(text,T){T=T==null?S.T:T;S.T=T;S.Tc=2*J;var base=textToSpins(text,S.N);var r=runGibbsAtT(base,T,100);S.spins=r.spins;S.mag=r.mag;S.energy=r.energy;S.Cv=r.Cv;S.phase=classifyPhase(r.mag,r.Cv,T,S.Tc);var up=0;for(var i=0;i<r.spins.length;i++)if(r.spins[i]>0)up++;var p=up/r.spins.length,Sspin=0;if(p>1e-9&&p<1-1e-9)Sspin=-p*Math.log2(p)-(1-p)*Math.log2(1-p);S.H_eff=r.energy-T*Sspin*r.spins.length*0.15;paintPhaseUI();emit("phase",{note:S.phase+" T="+T.toFixed(2)+" m="+r.mag.toFixed(3),phase:S.phase});return r}
function paintPhaseUI(){
set("phT",S.T.toFixed(3));set("phM",S.mag==null?"—":S.mag.toFixed(4));set("phE",S.energy==null?"—":S.energy.toFixed(4));
set("phCv",S.Cv==null?"—":S.Cv.toFixed(4));set("phTc",S.Tc.toFixed(3));set("phPhase",S.phase);set("phHeff",S.H_eff==null?"—":S.H_eff.toFixed(4));
var badge=$("phBadge");if(badge){badge.textContent=S.phase;badge.className="pill "+(S.phase==="ORDERED"?"ok":S.phase==="CRITICAL"?"warn":"bad")}
var strip=$("spinStrip");if(strip&&S.spins){strip.innerHTML="";for(var i=0;i<S.spins.length;i++){var d=document.createElement("i");d.style.background=S.spins[i]>0?"#22d3ee":"#e879f9";strip.appendChild(d)}}
drawPhaseChart();
}
var _diagramCache=null;
function drawPhaseChart(){
var c=$("phaseChart");if(!c)return;var ctx=c.getContext("2d"),dpr=Math.min(devicePixelRatio||1,2),w=c.clientWidth||320,h=c.clientHeight||140;
c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#0a0f1c";ctx.fillRect(0,0,w,h);
var text=($("phaseIn")&&$("phaseIn").value)||"aksi";
if(!_diagramCache||_diagramCache.text!==text)_diagramCache={text:text,pts:phaseDiagram(text)};
var pts=_diagramCache.pts;if(!pts.length)return;
var Tmin=pts[0].T,Tmax=pts[pts.length-1].T;
function xT(T){return 20+(w-36)*((T-Tmin)/(Tmax-Tmin||1))}
function yM(m){return h-16-(h-28)*Math.min(1,Math.max(0,m))}
ctx.strokeStyle="rgba(251,191,36,.5)";ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(xT(S.Tc),8);ctx.lineTo(xT(S.Tc),h-8);ctx.stroke();ctx.setLineDash([]);
ctx.strokeStyle="#22d3ee";ctx.lineWidth=2;ctx.beginPath();pts.forEach(function(p,i){var x=xT(p.T),y=yM(p.m);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();
ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(xT(S.T),yM(S.mag||0),4,0,Math.PI*2);ctx.fill();
ctx.fillStyle="#8b9bb8";ctx.font="10px ui-monospace,monospace";ctx.fillText("m(T)",8,14);ctx.fillText("Tc",xT(S.Tc)+4,14);
}
var Q={n:4,dim:16,state:null};
function qInit(){Q.state=new Float64Array(Q.dim*2);Q.state[0]=1;paintQ();emit("quantum",{note:"|0…0⟩"})}
function qNorm(){var s=0,i;for(i=0;i<Q.dim;i++)s+=Q.state[2*i]*Q.state[2*i]+Q.state[2*i+1]*Q.state[2*i+1];s=Math.sqrt(s)||1;for(i=0;i<Q.dim*2;i++)Q.state[i]/=s}
function applyH(qubit){var dim=Q.dim,bit=1<<(Q.n-1-qubit),next=new Float64Array(Q.state),s2=Math.SQRT1_2;for(var i=0;i<dim;i++){if(i&bit)continue;var i0=i,i1=i|bit,a0=Q.state[2*i0],b0=Q.state[2*i0+1],a1=Q.state[2*i1],b1=Q.state[2*i1+1];next[2*i0]=s2*(a0+a1);next[2*i0+1]=s2*(b0+b1);next[2*i1]=s2*(a0-a1);next[2*i1+1]=s2*(b0-b1)}Q.state=next;qNorm()}
function qAllH(){for(var q=0;q<Q.n;q++)applyH(q);paintQ();emit("quantum",{note:"H⊗n"})}
function cnot(c,t){var cb=1<<(Q.n-1-c),tb=1<<(Q.n-1-t),next=new Float64Array(Q.state.length);for(var i=0;i<Q.dim;i++){if(i&cb){var k=i^tb;next[2*k]=Q.state[2*i];next[2*k+1]=Q.state[2*i+1]}else{next[2*i]=Q.state[2*i];next[2*i+1]=Q.state[2*i+1]}}Q.state=next;qNorm()}
function qBell(){qInit();applyH(0);for(var t=1;t<Q.n;t++)cnot(0,t);paintQ();emit("quantum",{note:"Bell-сеть"})}
function vonNeumann(){var probs=[],i,p,H=0;for(i=0;i<Q.dim;i++){p=Q.state[2*i]*Q.state[2*i]+Q.state[2*i+1]*Q.state[2*i+1];probs.push(p);if(p>1e-14)H-=p*Math.log2(p)}return{H:H,probs:probs}}
function qCollapse(){var v=vonNeumann(),r=Math.random(),acc=0,idx=0;for(var i=0;i<v.probs.length;i++){acc+=v.probs[i];if(r<=acc){idx=i;break}}Q.state=new Float64Array(Q.dim*2);Q.state[2*idx]=1;var bits=idx.toString(2).padStart(Q.n,"0");S.entropy=v.H;S.bits=bits;paintQ();emit("quantum-collapse",{note:"collapse "+bits+" H="+v.H.toFixed(3),bits:bits,H:v.H});return{bits:bits,H:v.H}}
function paintQ(){var v=vonNeumann();S.entropy=v.H;set("qHval",v.H.toFixed(4));set("qBits",S.bits||"—");set("qPur",S.bits?"1.000":"—");var bars=$("qBars");if(!bars)return;bars.innerHTML="";var maxp=Math.max.apply(null,v.probs.concat([1e-9]));v.probs.forEach(function(p){var i=document.createElement("i");i.style.height=Math.max(2,(p/maxp)*90)+"%";bars.appendChild(i)});paintTop()}
function computeEQS(text){text=String(text||"");var coherence=S.phase==="ORDERED"?0.9:S.phase==="CRITICAL"?0.55:0.35;if(S.mag!=null)coherence=0.4*coherence+0.6*Math.min(1,S.mag);var resonance=S.entropy==null?0.5:Math.max(0.2,1-S.entropy/4);var consistency=/[а-яА-Яa-zA-Z]{3,}/.test(text)?0.7:0.4;if(S.H_eff!=null&&S.H_eff<0)consistency=Math.min(1,consistency+0.15);var integrity=S.bits?0.75:0.45;var novelty=Math.min(1,text.length/80);var eqs=Math.round(100*(0.28*coherence+0.22*resonance+0.22*consistency+0.18*integrity+0.1*novelty));eqs=Math.max(0,Math.min(100,eqs));S.eqs=eqs;set("eqsVal",String(eqs));set("eqsVerdict",eqs>=70?"ALLOW-ready":eqs>=45?"REVIEW":"WEAK");set("eqsAxes",JSON.stringify({coherence:coherence,resonance:resonance,consistency:consistency,integrity:integrity,phase:S.phase}));emit("eqs",{note:"EQS="+eqs+" φ="+S.phase,eqs:eqs});paintTop();return eqs}
function simpleMath(text){var m=String(text).replace(/\s/g,"").match(/^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)$/);if(!m)return null;var a=+m[1],b=+m[3],op=m[2];if(op==="+")return a+b;if(op==="-")return a-b;if(op==="*")return a*b;if(op==="/")return b!==0?a/b:null;return null}
async function runGate(claim){claim=String(claim||"").trim();var trace=[];trace.push("[1] claim: "+claim.slice(0,80));if(S.phase==="—"||S.mag==null){applyPhaseFromText(claim,S.T);trace.push("[2] Gibbs+фаза: "+S.phase+" m="+S.mag.toFixed(3))}else trace.push("[2] фаза: "+S.phase);if(S.entropy==null){qBell();qCollapse();trace.push("[3] квант "+S.bits)}else trace.push("[3] H="+S.entropy.toFixed(3));var eqs=computeEQS(claim);trace.push("[4] EQS="+eqs);var math=simpleMath(claim);if(math!=null)trace.push("[4b] math="+math);var decision="REVIEW";if(eqs>=70&&S.phase!=="DISORDERED")decision="ALLOW";else if(eqs<45||S.phase==="DISORDERED")decision="BLOCK";if(math!=null&&eqs>=50)decision="ALLOW";S.lastGate=decision;var body={system:"AKSI-UNITY-v1",claim:claim,decision:decision,eqs:eqs,phase:S.phase,T:S.T,mag:S.mag,H_eff:S.H_eff,quantum:{H:S.entropy,bits:S.bits},did:S.did,ts:new Date().toISOString()};body.signature=await signPayload(body);set("trace",trace.join("\n"));var out=$("out");if(out){out.className="msg "+(decision==="ALLOW"?"allow":decision==="BLOCK"?"block":"");out.innerHTML="<span class=\"pill "+(decision==="ALLOW"?"ok":decision==="BLOCK"?"bad":"warn")+"\">"+decision+"</span> EQS "+eqs+" · φ "+S.phase+"<div class=\"meta\">"+JSON.stringify(body).slice(0,260)+"…</div>"}emit("gate",{note:decision+" EQS="+eqs,decision:decision});paintTop();worldSetGate(decision);try{localStorage.setItem("aksi_unity_last",JSON.stringify(body))}catch(e){}return body}
var W={pts:[],gate:null};
function worldInit(){W.pts=[];for(var i=0;i<48;i++)W.pts.push({x:Math.random(),y:Math.random(),vx:(Math.random()-0.5)*0.004,vy:(Math.random()-0.5)*0.004})}
function worldSetGate(g){W.gate=g}
function worldFrame(){var c=$("worldC");if(!c)return;var ctx=c.getContext("2d"),dpr=Math.min(devicePixelRatio||1,2),w=c.clientWidth||360,h=220;c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#05010f";ctx.fillRect(0,0,w,h);var speed=1+(S.entropy||0)*0.4;if(S.phase==="CRITICAL")speed*=1.5;if(S.phase==="ORDERED")speed*=0.7;var col=W.gate==="ALLOW"?"#34d399":W.gate==="BLOCK"?"#f87171":"#818cf8";W.pts.forEach(function(p){p.x+=p.vx*speed;p.y+=p.vy*speed;if(p.x<0||p.x>1)p.vx*=-1;if(p.y<0||p.y>1)p.vy*=-1;p.x=Math.max(0,Math.min(1,p.x));p.y=Math.max(0,Math.min(1,p.y));ctx.beginPath();ctx.fillStyle=col;ctx.globalAlpha=0.75;ctx.arc(p.x*w,p.y*h,2.5,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;if(document.querySelector('.panel.on[data-p="world"]'))requestAnimationFrame(worldFrame)}
async function linkAll(){var claim=($("claim")&&$("claim").value)||($("phaseIn")&&$("phaseIn").value)||"АКСИ единство";emit("pipeline",{note:"старт"});applyPhaseFromText(claim,S.T);qBell();qCollapse();computeEQS(claim);await runGate(claim);emit("pipeline",{note:"готово φ="+S.phase+" gate="+S.lastGate});go("home")}
function boot(){
document.querySelectorAll(".bnav button").forEach(function(b){b.addEventListener("click",function(){go(b.getAttribute("data-go"))})});
document.querySelectorAll("[data-jump]").forEach(function(b){b.addEventListener("click",function(){go(b.getAttribute("data-jump"))})});
var hash=(location.hash||"").replace("#","");if(hash)go(hash);
ensureDid();qInit();worldInit();
if($("btnLinkAll"))$("btnLinkAll").addEventListener("click",function(){linkAll()});
var ts=$("tempSlider");if(ts)ts.addEventListener("input",function(){S.T=parseFloat(ts.value)||1.2;set("phT",S.T.toFixed(3))});
if($("btnPhase"))$("btnPhase").addEventListener("click",function(){_diagramCache=null;applyPhaseFromText(($("phaseIn")&&$("phaseIn").value)||"aksi",S.T)});
if($("btnScan"))$("btnScan").addEventListener("click",function(){_diagramCache=null;drawPhaseChart();emit("phase",{note:"scan m(T)"})});
if($("qInit"))$("qInit").addEventListener("click",qInit);
if($("qH"))$("qH").addEventListener("click",qAllH);
if($("qEntangle"))$("qEntangle").addEventListener("click",qBell);
if($("qCollapse"))$("qCollapse").addEventListener("click",qCollapse);
if($("wPulse"))$("wPulse").addEventListener("click",function(){go("world");worldFrame()});
if($("wReset"))$("wReset").addEventListener("click",function(){worldInit()});
if($("algoRun"))$("algoRun").addEventListener("click",function(){computeEQS(($("algoIn")&&$("algoIn").value)||"")});
if($("btnRun"))$("btnRun").addEventListener("click",function(){runGate(($("claim")&&$("claim").value)||"")});
if($("btnClear"))$("btnClear").addEventListener("click",function(){if($("claim"))$("claim").value="";set("trace","Ожидание…");if($("out")){$("out").className="msg";$("out").textContent="Ещё нет receipt."}});
if($("btnRotate"))$("btnRotate").addEventListener("click",function(){S.did=null;S._priv=null;ensureDid()});
if($("btnVerify"))$("btnVerify").addEventListener("click",function(){try{var o=JSON.parse(($("verifyBox")&&$("verifyBox").value)||"");set("verifyOut",o.signature&&o.decision?"OK · "+o.decision+" · φ="+(o.phase||"—"):"нет signature")}catch(e){set("verifyOut","невалидный JSON")}});
applyPhaseFromText("АКСИ",S.T);setInterval(paintTop,1000);paintTop();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.AKSIUnity={applyPhaseFromText:applyPhaseFromText,computeEQS:computeEQS,runGate:runGate,linkAll:linkAll,state:function(){return S}};
})();
