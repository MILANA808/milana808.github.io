(()=>{'use strict';
const toast=(title,text)=>{let x=document.querySelector('.wow-toast');if(!x){x=document.createElement('div');x.className='wow-toast';document.body.appendChild(x)}x.innerHTML=`<b>${title}</b><br>${text}`;x.classList.add('on');clearTimeout(window.__aksiToast);window.__aksiToast=setTimeout(()=>x.classList.remove('on'),3200)};
const updateClock=()=>{const el=document.querySelector('[data-wow-clock]');if(el)el.textContent=new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())};
window.addEventListener('aksi:ready',()=>toast('AKSI CORE','Контур инициализирован. Состояние читается локально.'));
window.addEventListener('aksi:control-ready',()=>toast('CONTROL PLANE','Capabilities синхронизированы.'));
window.addEventListener('aksi:quantum-ready',()=>toast('QUANTUM RUNTIME','Локальный state-vector runtime готов.'));
document.addEventListener('click',e=>{const b=e.target.closest('[data-wow-action]');if(!b)return;const a=b.dataset.wowAction;if(a==='proof')document.querySelector('[data-nav="trust"]')?.click();if(a==='chat')document.querySelector('[data-nav="chat"]')?.click();if(a==='pulse')toast('SYSTEM PULSE','Проверка интерфейса запущена. Откройте Status для подробного скана.')});
setInterval(updateClock,1000);updateClock();
})();
