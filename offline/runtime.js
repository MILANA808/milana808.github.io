/* AKSI Offline Runtime v0.1 — browser-only, no network required.
   Uses a local Web Worker and a deterministic reasoning layer.
   This is an offline runtime shell, not a bundled LLM. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="aksi-offline-memory-v1";
let state=JSON.parse(localStorage.getItem(KEY)||'{"messages":[],"facts":[],"sessions":0}');
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function msk(){return new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone:"Europe/Moscow"}).format(new Date())+" МСК"}
function remember(text){const clean=text.trim();if(clean.length>2&&!state.facts.includes(clean))state.facts.push(clean.slice(0,300));state.facts=state.facts.slice(-100);save()}
function answer(q){
 const l=q.toLowerCase();
 if(/кто ты|что ты/.test(l)) return "Я AKSI Offline — локальный runtime. Я могу отвечать без Интернета, хранить локальную память и запускать проверяемые процедуры. Сейчас я не использую удалённую LLM: это честный автономный режим.";
 if(/время|сколько времени/.test(l)) return "Сейчас "+msk()+". Время вычислено локально с часов устройства и приведено к часовому поясу Москвы.";
 if(/помнишь|память/.test(l)) return state.facts.length?("Локальная память содержит "+state.facts.length+" записей. Последние: "+state.facts.slice(-5).join(" | ")):"Память пока пуста.";
 if(/гипотез|эксперимент|провер/.test(l)) return "Я могу построить проверяемую цепочку: вопрос → конкурирующие гипотезы → различающий эксперимент → наблюдение → обновление. Важно: согласие гипотезы с наблюдением не равно доказательству истины.";
 if(/без интернет|офлайн|offline/.test(l)) return "Да. Эта страница не требует сетевого запроса для своего runtime: ответ формируется локальным JavaScript, а память хранится в браузере.";
 return "Я получила вопрос локально. В автономном режиме без подключённой языковой модели я не буду притворяться, что обладаю полноценными знаниями LLM. Я могу выполнить локальные правила, память и Discovery-процедуры. Следующий этап — встроить в этот runtime локальную LLM.";
}
function render(){const box=$("chat");box.innerHTML=state.messages.map(x=>'<div class="msg '+x.role+'"><span>'+x.roleLabel+'</span><p>'+x.text.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+'</p></div>').join("");box.scrollTop=box.scrollHeight;$("memory").textContent="локальная память: "+state.facts.length+" записей";$("clock").textContent=msk()}
function send(){const input=$("input"),q=input.value.trim();if(!q)return;state.messages.push({role:"user",roleLabel:"Вы",text:q});remember(q);state.messages.push({role:"assistant",roleLabel:"AKSI",text:answer(q)});state.sessions++;save();input.value="";render()}
document.addEventListener("DOMContentLoaded",()=>{render();$("send").onclick=send;$("input").addEventListener("keydown",e=>{if(e.key==="Enter")send()});$("clear").onclick=()=>{state={messages:[],facts:[],sessions:0};save();render()};setInterval(()=>{$("clock").textContent=msk()},1000)});
})();