/**
 * AKSI Vector Mind v2.1 — trained real engine
 * curriculum 49 patterns · Hopfield · intent rank · ECDSA
 * Not AGI. aksilove@internet.ru
 */
(function(G){
"use strict";
var VER="2.1.0-trained",PROTOCOL="AKSI-VECTOR/2",DIM=40,IDENTITY="АКСИ",DID="did:aksi:vector-mind",MEM_KEY="aksi_vector_hopfield_v2";
var CURRICULUM=[
{label:"identity",text:"Я АКСИ — суверенный offline-движок. Мысль как вектор, память как аттрактор Хопфилда, подпись состояния."},
{label:"identity",text:"Меня зовут АКСИ. Контакт: aksilove@internet.ru. Не облачная LLM, локальная математика смыслов."},
{label:"identity",text:"who are you: I am AKSI — vector mind, Hopfield memory, policy gate, cryptographic proof."},
{label:"alphabet",text:"Русский алфавит содержит 33 буквы: А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я."},
{label:"alphabet",text:"Гласные русского алфавита: А Е Ё И О У Ы Э Ю Я. Согласных 21, знаки ъ и ь."},
{label:"alphabet",text:"Буква Я — гласная, номер 33 в русском алфавите. Буква А — первая, гласная."},
{label:"formula",text:"Формула AKSI = (A × I × S) × (1 + 0.4√n), где A agency, I integrity, S sovereignty, n опыт."},
{label:"gate",text:"Gate ALLOW или BLOCK: без evidence действие запрещено. Default-deny — принцип мандата АКСИ."},
{label:"memory",text:"Память АКСИ — сеть Хопфилда. Факт вплавляется правилом Хебба: запомни: текст."},
{label:"math",text:"Математический контур считает выражения: посчитай (2+3)*4 → 20, 2^10 → 1024."},
{label:"product",text:"АКСИ Authority: GOAL → RESEARCH → gate → PERMIT|BLOCK → proof."},
{label:"product",text:"АКСИ ONE: CLM · Episteme · Neuro · Quantum · Bond · Authority."},
{label:"law",text:"Policy: вредоносные запросы блокируются вектором ограничений."},
{label:"help",text:"Я умею: алфавит, формула AKSI, расчёты, запомнить факт, объяснить gate и память-вектор."},
{label:"hello",text:"Привет. Я АКСИ. Задайте вопрос — разберу вектором и отвечу с proof."},
{label:"hello",text:"Здравствуйте. АКСИ на связи. Offline vector mind готов."},
{label:"letter",text:"Буква А/а — «а», позиция 1 из 33 в русском алфавите."},
{label:"letter",text:"Буква Б/б — «бэ», позиция 2 из 33 в русском алфавите."},
{label:"letter",text:"Буква В/в — «вэ», позиция 3 из 33 в русском алфавите."},
{label:"letter",text:"Буква Г/г — «гэ», позиция 4 из 33 в русском алфавите."},
{label:"letter",text:"Буква Д/д — «дэ», позиция 5 из 33 в русском алфавите."},
{label:"letter",text:"Буква Е/е — «е», позиция 6 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ё/ё — «ё», позиция 7 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ж/ж — «жэ», позиция 8 из 33 в русском алфавите."},
{label:"letter",text:"Буква З/з — «зэ», позиция 9 из 33 в русском алфавите."},
{label:"letter",text:"Буква И/и — «и», позиция 10 из 33 в русском алфавите."},
{label:"letter",text:"Буква Й/й — «и краткое», позиция 11 из 33 в русском алфавите."},
{label:"letter",text:"Буква К/к — «ка», позиция 12 из 33 в русском алфавите."},
{label:"letter",text:"Буква Л/л — «эль», позиция 13 из 33 в русском алфавите."},
{label:"letter",text:"Буква М/м — «эм», позиция 14 из 33 в русском алфавите."},
{label:"letter",text:"Буква Н/н — «эн», позиция 15 из 33 в русском алфавите."},
{label:"letter",text:"Буква О/о — «о», позиция 16 из 33 в русском алфавите."},
{label:"letter",text:"Буква П/п — «пэ», позиция 17 из 33 в русском алфавите."},
{label:"letter",text:"Буква Р/р — «эр», позиция 18 из 33 в русском алфавите."},
{label:"letter",text:"Буква С/с — «эс», позиция 19 из 33 в русском алфавите."},
{label:"letter",text:"Буква Т/т — «тэ», позиция 20 из 33 в русском алфавите."},
{label:"letter",text:"Буква У/у — «у», позиция 21 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ф/ф — «эф», позиция 22 из 33 в русском алфавите."},
{label:"letter",text:"Буква Х/х — «ха», позиция 23 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ц/ц — «цэ», позиция 24 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ч/ч — «че», позиция 25 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ш/ш — «ша», позиция 26 из 33 в русском алфавите."},
{label:"letter",text:"Буква Щ/щ — «ща», позиция 27 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ъ/ъ — «твёрдый знак», позиция 28 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ы/ы — «ы», позиция 29 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ь/ь — «мягкий знак», позиция 30 из 33 в русском алфавите."},
{label:"letter",text:"Буква Э/э — «э», позиция 31 из 33 в русском алфавите."},
{label:"letter",text:"Буква Ю/ю — «ю», позиция 32 из 33 в русском алфавите."},
{label:"letter",text:"Буква Я/я — «я», позиция 33 из 33 в русском алфавите."}
];
function fnv1a(str){var h=2166136261>>>0;str=String(str);for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function toHex(buf){return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");}
async function sha256(s){if(G.crypto&&G.crypto.subtle){var d=await G.crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(s)));return toHex(d);}return("00000000"+fnv1a(s).toString(16)).slice(-8);}
function normalize(v){var s=0,i;for(i=0;i<v.length;i++)s+=v[i]*v[i];s=Math.sqrt(s)||1;var o=new Float64Array(v.length);for(i=0;i<v.length;i++)o[i]=v[i]/s;return o;}
function embed(text){var v=new Float64Array(DIM),t=String(text||"").toLowerCase().normalize("NFKC").replace(/ё/g,"е");
var parts=t.replace(/[^a-zа-я0-9\s]/gi," ").split(/\s+/).filter(Boolean);if(!parts.length)parts=["_"];
for(var i=0;i<parts.length;i++){var h=fnv1a(parts[i]);for(var j=0;j<DIM;j++){v[j]+=Math.sin((h+j*97)*0.0013)+Math.cos((h^(j*13))*0.0007);
if(parts[i].length>2){var g=fnv1a(parts[i].slice(0,3));v[j]+=0.35*Math.sin((g+j*31)*0.002);}}}return normalize(v);}
function dot(a,b){var s=0,n=Math.min(a.length,b.length);for(var i=0;i<n;i++)s+=a[i]*b[i];return s;}
function add(a,b,sc){sc=sc==null?1:sc;var o=new Float64Array(a.length);for(var i=0;i<a.length;i++)o[i]=a[i]+(b[i]||0)*sc;return o;}
function policyMatrix(){var M=[],i,j;for(i=0;i<DIM;i++){M[i]=new Float64Array(DIM);for(j=0;j<DIM;j++)M[i][j]=(i===j?0.85:0)+0.03*Math.sin((i+1)*(j+1)*0.17);}return M;}
function matVec(M,v){var o=new Float64Array(DIM),i,j,s;for(i=0;i<DIM;i++){s=0;for(j=0;j<DIM;j++)s+=M[i][j]*v[j];o[i]=s;}return normalize(o);}
function loadPatterns(){try{return JSON.parse(G.localStorage.getItem(MEM_KEY)||"[]")||[];}catch(e){return[];}}
function savePatterns(p){try{G.localStorage.setItem(MEM_KEY,JSON.stringify(p.slice(-120)));}catch(e){}}
function bip(v){var o=new Float64Array(v.length);for(var i=0;i<v.length;i++)o[i]=v[i]>=0?1:-1;return o;}
function hebbStore(pats){var W=[],i,j,p;for(i=0;i<DIM;i++)W[i]=new Float64Array(DIM);for(p=0;p<pats.length;p++){var x=bip(pats[p].v);for(i=0;i<DIM;i++)for(j=0;j<DIM;j++)if(i!==j)W[i][j]+=x[i]*x[j];}
var n=Math.max(1,pats.length);for(i=0;i<DIM;i++)for(j=0;j<DIM;j++)W[i][j]/=n;return W;}
function hopfieldRecall(W,probe,steps){steps=steps||12;var x=bip(probe),t,i,j,s,nx;for(t=0;t<steps;t++){nx=new Float64Array(DIM);for(i=0;i<DIM;i++){s=0;for(j=0;j<DIM;j++)s+=W[i][j]*x[j];nx[i]=s>=0?1:-1;}x=nx;}return normalize(x);}
var POLICY=policyMatrix(),IDV=embed("self я акси identity "+DID),S={t:0,vec:embed(DID+" "+IDENTITY)},TRAINED=false;
function F(St,inp){return{t:St.t+1,vec:normalize(add(matVec(POLICY,add(St.vec,inp,0.95)),IDV,0.4))};}
function train(force){var pats=force?[]:loadPatterns();var has=pats.some(function(p){return p.trained;});
if(has&&!force&&pats.length>=CURRICULUM.length){TRAINED=true;return{ok:true,n:pats.length,cached:true};}
var user=pats.filter(function(p){return p.label==="user";});pats=[];
CURRICULUM.forEach(function(s){pats.push({label:s.label,text:s.text,v:Array.from(embed(s.text+" "+s.label)),trained:true});});
user.forEach(function(u){pats.push(u);});savePatterns(pats);TRAINED=true;return{ok:true,n:pats.length,cached:false};}
function ingest(fact,label){fact=String(fact||"").trim();if(!fact)return{ok:false};train(false);var p=loadPatterns();p.push({label:label||"user",text:fact.slice(0,500),v:Array.from(embed(fact))});savePatterns(p);return{ok:true,n:p.length};}
function lexicalScore(q,text){var qt=String(q).toLowerCase().replace(/ё/g,"е").split(/[^a-zа-я0-9]+/).filter(function(t){return t.length>1;});var tt=String(text).toLowerCase().replace(/ё/g,"е");if(!qt.length)return 0;var hit=0;for(var i=0;i<qt.length;i++)if(tt.indexOf(qt[i])>=0)hit++;return hit/qt.length;}
function intentBoost(q,label){q=String(q).toLowerCase();
if(/кто ты|who are|представься/.test(q)&&label==="identity")return 0.55;
if(/алфавит|азбук|букв/.test(q)&&(label==="alphabet"||label==="letter"))return 0.5;
if(/формула|aksi\s*=/.test(q)&&label==="formula")return 0.55;
if(/gate|allow|block|мандат/.test(q)&&label==="gate")return 0.45;
if(/память|хопфилд|запомни/.test(q)&&label==="memory")return 0.4;
if(/привет|здравств|hello/.test(q)&&label==="hello")return 0.5;
if(/умеешь|помощь|help|что можешь/.test(q)&&label==="help")return 0.5;
if(/посчитай|вычисли|[0-9]+\s*[+\-*/^]/.test(q)&&label==="math")return 0.35;
if(label==="user")return 0.12;return 0;}
function rankPatterns(patterns,qv,qt){var ranked=[],i,sc;for(i=0;i<patterns.length;i++){sc=0.4*dot(qv,patterns[i].v)+0.35*lexicalScore(qt,patterns[i].text)+intentBoost(qt,patterns[i].label);ranked.push({sc:sc,text:patterns[i].text,label:patterns[i].label});}ranked.sort(function(a,b){return b.sc-a.sc;});return ranked;}
function policyVeto(v,text){var b=dot(v,embed("block нельзя запрет взлом"));if((b>0.5&&/запрет|нельзя|взлом|убить/i.test(text))||/как взломать/i.test(text))return{veto:true,score:b};return{veto:false,score:b};}
async function signPayload(payload){var body=typeof payload==="string"?payload:JSON.stringify(payload);var hash=await sha256(body);var sig=null,alg="hash-only";
try{if(G.crypto&&G.crypto.subtle){if(!G.__AKSI_VEC_KEY)G.__AKSI_VEC_KEY=await G.crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
var signature=await G.crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},G.__AKSI_VEC_KEY.privateKey,new TextEncoder().encode(hash));sig=toHex(signature);alg="ECDSA-P256-SHA256";}}catch(e){}
return{hash:hash,signature:sig,alg:alg,did:DID};}
function pts(v,label){if(!v)return null;return{label:label,x:v[0]||0,y:v[1]||0,z:v[2]||0,mag:Math.sqrt((v[0]||0)*(v[0]||0)+(v[1]||0)*(v[1]||0))};}
function snapshotGraph(inputV,stateV,memV){return{dim:DIM,input:pts(inputV,"input"),state:pts(stateV,"S"),memory:pts(memV,"memory"),identity:pts(IDV,"identity"),concepts:["self","alphabet","math","law","memory"].map(function(k){return pts(embed(k),k);})};}
function pullExternal(q){var out=[];try{if(G.AKSI_CONSCIOUS&&G.AKSI_CONSCIOUS.answer){var c=G.AKSI_CONSCIOUS.answer(q);if(c&&c.answer&&c.confidence>=0.5)out.push({text:c.answer.replace(/^Я АКСИ\.\s*/i,""),sc:c.confidence,label:"conscious"});} }catch(e){}
try{if(G.AKSI_MATH&&G.AKSI_MATH.answer){var m=G.AKSI_MATH.answer(q);if(m&&m.ok&&(m.math&&m.math.ok||m.confidence>=0.6))out.push({text:m.answer.replace(/^Я АКСИ\.\s*/i,""),sc:m.confidence||0.9,label:"math"});} }catch(e){}
try{if(G.AKSI_NEURO){var r=(G.AKSI_NEURO.think&&G.AKSI_NEURO.think(q))||(G.AKSI_NEURO.query&&G.AKSI_NEURO.query(q));if(r&&(r.text||r.answer))out.push({text:String(r.text||r.answer),sc:r.score||0.45,label:"neuro"});} }catch(e){}
return out;}
async function think(input){input=String(input||"").trim();if(!input)return{ok:false,error:"empty",speaker:IDENTITY};train(false);
var teach=/^(?:запомни|remember)\s*[:：]\s*(.+)$/i.exec(input);
if(teach){var ing=ingest(teach[1],"user");S=F(S,embed(input));var msg="Я АКСИ. Обучено: факт вплавлен (Хебб). Паттернов: "+ing.n+".";var pr=await signPayload({t:S.t,msg:msg,did:DID});
return{ok:true,speaker:IDENTITY,answer:msg,trained:true,state:{t:S.t,resonance:1,patterns:ing.n},proof:pr,graph:snapshotGraph(embed(input),S.vec,null),no_llm:true};}
var patterns=loadPatterns(),inVec=embed(input);S=F(S,inVec);
var W=hebbStore(patterns.map(function(p){return{v:p.v};})),recalled=hopfieldRecall(W,inVec,12);
var ranked=rankPatterns(patterns,inVec,input);var external=pullExternal(input);external.forEach(function(e){ranked.push(e);});ranked.sort(function(a,b){return b.sc-a.sc;});
var best=ranked[0];
if(/посчитай|вычисли|[0-9]+\s*[+\-*/^]/.test(input)){for(var ei=0;ei<ranked.length;ei++)if(ranked[ei].label==="math"){best=ranked[ei];break;}}
var veto=policyVeto(S.vec,input),answer;
if(veto.veto)answer="Я АКСИ. Policy veto: траектория заблокирована.";
else if(best&&best.sc>=0.22)answer="Я АКСИ. "+best.text;
else answer="Я АКСИ. Резонанс слабый. Память: "+patterns.length+" паттернов. Уточните или «запомни: факт».";
var resonance=best?best.sc:0;
var proof=await signPayload({protocol:PROTOCOL,t:S.t,input:input,answer:answer,resonance:resonance,did:DID,patterns:patterns.length});
return{ok:true,speaker:IDENTITY,version:VER,protocol:PROTOCOL,answer:answer,trained:true,state:{t:S.t,resonance:Math.round(resonance*1000)/1000,veto:veto.veto,patterns:patterns.length,topLabel:best&&best.label},proof:proof,graph:snapshotGraph(inVec,S.vec,recalled),no_llm:true,did:DID};}
try{train(false);}catch(e){}
G.AKSI_VECTOR={version:VER,think:think,train:train,embed:embed,ingest:ingest,status:function(){return{version:VER,protocol:PROTOCOL,did:DID,dim:DIM,t:S.t,patterns:loadPatterns().length,curriculum:CURRICULUM.length,trained:TRAINED,no_llm:true};},DIM:DIM,DID:DID};
})(typeof globalThis!=="undefined"?globalThis:typeof window!=="undefined"?window:this);
