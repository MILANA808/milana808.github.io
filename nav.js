(function(){
  if(window.__AKSI_NAV)return;window.__AKSI_NAV=1;
  var items=[
    {href:"/",label:"Дом",icon:"⌂"},
    {href:"/drive/",label:"Путь",icon:"▶"},
    {href:"/route/",label:"A→B",icon:"➤"},
    {href:"/solar/",label:"Космос",icon:"✧"},
    {href:"/aksi/",label:"Чат",icon:"✦"},
    {href:"/citizen/",label:"ID",icon:"◎"}
  ];
  var path=location.pathname.replace(/\/+$/,"")||"/";
  var css=".aksi-nav{position:fixed;bottom:0;left:0;right:0;z-index:9999;display:flex;justify-content:center;padding:8px 2px calc(8px + env(safe-area-inset-bottom));background:rgba(2,6,23,.94);border-top:1px solid rgba(148,163,184,.12);backdrop-filter:blur(16px)}.aksi-nav a{flex:1;max-width:64px;text-align:center;text-decoration:none;color:#94a3b8;font-size:9px;padding:4px 0;border-radius:12px}.aksi-nav a span{display:block;font-size:14px;margin-bottom:2px;line-height:1}.aksi-nav a.on,.aksi-nav a:hover{color:#e2e8f0}.aksi-nav a.on{background:rgba(168,85,247,.2)}body{padding-bottom:64px!important}";
  var s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
  var n=document.createElement("nav");n.className="aksi-nav";
  items.forEach(function(it){
    var a=document.createElement("a");a.href=it.href;
    var p=it.href.replace(/\/+$/,"")||"/";
    if(path===p||(p!=="/"&&path.indexOf(p)===0))a.className="on";
    a.innerHTML="<span>"+it.icon+"</span>"+it.label;n.appendChild(a);
  });
  document.body.appendChild(n);
})();
