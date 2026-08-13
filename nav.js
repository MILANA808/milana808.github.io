(function(){
  if(window.__AKSI_NAV)return;window.__AKSI_NAV=1;
  var items=[
    {href:"/",label:"Дом",icon:"⌂"},
    {href:"/strand/",label:"Нить",icon:" favour"},
    {href:"/aksi/",label:"Чат",icon:"✦"},
    {href:"/dreams/",label:"Сны",icon:"☁"},
    {href:"/net/",label:"Сеть",icon:"◈"},
    {href:"/backup/",label:"Бэкап",icon:"⇩"}
  ];
  var path=location.pathname.replace(/\/+$/,"")||"/";
  var css=".aksi-nav{position:fixed;bottom:0;left:0;right:0;z-index:9999;display:flex;justify-content:center;padding:8px 4px calc(8px + env(safe-area-inset-bottom));background:rgba(246,243,255,.95);border-top:1px solid #e8e0f7;backdrop-filter:blur(14px)}.aksi-nav a{flex:1;max-width:64px;text-align:center;text-decoration:none;color:#6b6280;font-size:9px;padding:4px 0;border-radius:12px;font-weight:600}.aksi-nav a span{display:block;font-size:15px;margin-bottom:2px;line-height:1}.aksi-nav a.on{color:#5b21b6;background:rgba(124,58,237,.12)}body{padding-bottom:64px!important}";
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
