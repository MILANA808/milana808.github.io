(function(){
var n=3,parts=new Array(n),done=0;
function tryRun(){if(done<n)return;var s=document.createElement("script");s.textContent=parts.join("");document.body.appendChild(s)}
for(var i=0;i<n;i++){(function(i){
fetch("/aksi-unity.p"+i+".js?v=7").then(function(r){return r.text()}).then(function(t){parts[i]=t;done++;tryRun()}).catch(function(e){console.error(e)});
})(i)}
})();
