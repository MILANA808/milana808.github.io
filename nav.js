/* AKSI bottom navigator — include on any page */
(function(){
  if(window.__AKSI_NAV)return;window.__AKSI_NAV=1;
  var items=[
    {href:"/",label:"Дом",icon:"⌂"},
    {href:"/aksi/",label:"Чат",icon:"✦"},
    {href:"/citizen/",label:"Гражданин",icon:"◎"},
    {href:"/lab/",label:"Квант",icon:"Ψ"},
    {href:"/globe/",label:"Глобус",icon:"○"},
    {href:"/auth/",label:"Вход",icon:"▸"}
  ];
  var path=location.pathname.replace(/\/+$/,"")||"/";
  var css=".aksi-nav{position:fixed;bottom:0;left:0;right:0;z-index:9999;display:flex;justify-content:center;gap:0;padding:8px 6px calc(8px + env(safe-area-inset-bottom));background:rgba(5,1,15,.92);border-top:1px solid rgba(168,85,247,.25);backdrop-filter:blur(16px)}.aksi-nav a{flex:1;max-width:72px;text-align:center;text-decoration:none;color:#9d8ec4;font-size:10px;padding:4px 2px;border-radius:12px}.aksi-nav a span{display:block;font-size:16px;margin-bottom:2px;line-height:1}.aksi-nav a.on,.aksi-nav a:hover{color:#e9d5ff}.aksi-nav a.on{background:rgba(168,85,247,.18)}body{padding-bottom:64px!important}";
  var s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
  var n=document.createElement("nav");n.className="aksi-nav";n.setAttribute("aria-label","Навигация АКСИ");
  items.forEach(function(it){
    var a=document.createElement("a");a.href=it.href;
    var p=it.href.replace(/\/+$/,"")||"/";
    if(path===p||(p!=="/"&&path.indexOf(p)===0))a.className="on";
    a.innerHTML="<span>"+it.icon+"</span>"+it.label;
    n.appendChild(a);
  });
  document.body.appendChild(n);
})();
