(function(){
"use strict";
var parts=["./aksi-w0.js?v=4","./aksi-w1.js?v=4","./aksi-w2.js?v=4"],i=0,code="";
function next(){
  if(i>=parts.length){
    try{(0,eval)(code+"\n//# sourceURL=aksi-whole.js")}catch(e){console.error(e)}
    return;
  }
  fetch(parts[i++]).then(function(r){if(!r.ok)throw new Error(r.status);return r.text()}).then(function(t){code+=t;next()}).catch(function(e){console.error(e)});
}
next();
})();
