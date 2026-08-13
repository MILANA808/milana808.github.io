(function(){
  if(window.__AKSI_NAV)return;window.__AKSI_NAV=1;
  var path=location.pathname.replace(/\/+$/,"")||"/";
  var items=[
    {href:"/",label:"Дом",ic:"⌂"},
    {href:"/aksi/",label:"Чат",ic:"✦"},
    {href:"/drive/",label:"Путь",ic:"➤"},
    {href:"/net/",label:"Сеть",ic:"◈"},
    {href:"/live/",label:"Live",ic:"◎"}
  ];
  // dark pages keep dark nav
  var dark=/^\\/(drive|live|wow|strand|dreams)/.test(path);
  var css=
    ".m-nav{position:fixed;left:0;right:0;bottom:0;z-index:10000;display:flex;justify-content:space-around;"+
    "align-items:stretch;min-height:56px;padding-bottom:env(safe-area-inset-bottom,0px);"+
    "backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}"+
    (dark
      ?".m-nav{background:rgba(15,23,42,.94);border-top:1px solid #334155}.m-nav a{color:#94a3b8}.m-nav a.on{color:#22d3ee}"
      :".m-nav{background:rgba(255,255,255,.94);border-top:1px solid #e5ddf5}.m-nav a{color:#6b6285}.m-nav a.on{color:#7c3aed}")+
    ".m-nav a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;"+
    "text-decoration:none;font-size:10px;font-weight:600;min-height:52px;padding:6px 2px 4px;max-width:84px}"+
    ".m-nav a .ic{font-size:18px;line-height:1}"+
    "body{padding-bottom:calc(56px + env(safe-area-inset-bottom,0px))!important}";
  var s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
  var n=document.createElement("nav");n.className="m-nav";n.setAttribute("aria-label","Меню");
  items.forEach(function(it){
    var a=document.createElement("a");a.href=it.href;
    var p=it.href.replace(/\/+$/,"")||"/";
    if(path===p||(p!=="/"&&path.indexOf(p)===0))a.className="on";
    a.innerHTML="<span class=\"ic\">"+it.ic+"</span>"+it.label;
    n.appendChild(a);
  });
  document.body.appendChild(n);
  // SW
  if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){});
})();
