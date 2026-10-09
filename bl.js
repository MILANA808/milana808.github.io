(function(){
var b=(window.__B||[]).join('');
try{
  var bin=atob(b), u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  var code=new TextDecoder().decode(u);
  var s=document.createElement('script');s.textContent=code;document.body.appendChild(s);
}catch(e){console.error(e);var el=document.getElementById('sharedBox');if(el)el.textContent='load error: '+e.message}
})();
