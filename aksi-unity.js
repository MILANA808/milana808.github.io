(function(){"use strict";
var parts=["/aksi-p0.js?v=10","/aksi-p1.js?v=10","/aksi-p2.js?v=10"], i=0, code="";
function next(){
  if(i>=parts.length){ try{ (0,eval)(code+"\n//# sourceURL=aksi-unity.js"); }catch(e){ console.error(e); } return; }
  fetch(parts[i++]).then(function(r){return r.text()}).then(function(t){ code+=t; next(); }).catch(function(e){ console.error(e); });
}
next();
})();
