(function(){
Promise.all([0,1,2,3].map(function(i){return fetch("/k"+i+".txt?v=6").then(function(r){return r.text()})}))
.then(function(parts){
  var b64=parts.join("");
  var bin=atob(b64);
  var u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  var code=new TextDecoder().decode(u);
  var s=document.createElement("script");
  s.textContent=code;
  document.body.appendChild(s);
}).catch(function(e){
  console.error(e);
  var el=document.getElementById("sharedBox");
  if(el)el.textContent="ошибка ядра: "+e.message;
});
})();
