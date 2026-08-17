(function(){
  if(window.__AKSI_SIDE_NAV)return;window.__AKSI_SIDE_NAV=1;
  var path=location.pathname.replace(/\/+$/,"")||"/";
  var home=path==="/"||path==="";
  var items=[
    {href:"/",label:"Главная",ic:"⌂"},
    {href:home?"#chat":"/#chat",label:"Чат",ic:"💬"},
    {href:home?"#search":"/#search",label:"Поиск",ic:"🔍"},
    {href:home?"#notes":"/#notes",label:"Заметки",ic:"📝"},
    {href:home?"#quantum":"/#quantum",label:"Квант",ic:"⚛"},
    {href:home?"#tools":"/#tools",label:"Счёт",ic:"∑"},
    {href:home?"#id":"/#id",label:"DID",ic:"🛡"},
    {href:"/matrix/",label:"MATRIX",ic:"▣"},
    {href:"/lab/",label:"Lab",ic:"⚗"},
    {href:"/globe/",label:"Глобус",ic:"🌐"},
    {href:"/hub/",label:"Хаб",ic:"▦"},
    {href:"/about/",label:"О проекте",ic:"ℹ"}
  ];
  var css=
    "#aksi-side{position:fixed;top:50%;right:8px;transform:translateY(-50%);z-index:9999;"+
    "display:flex;flex-direction:column;gap:4px;max-height:88vh;overflow-y:auto;"+
    "padding:6px;border-radius:16px;background:rgba(255,255,255,.95);"+
    "border:1px solid #e2e8f0;box-shadow:0 8px 28px rgba(15,23,42,.1);"+
    "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}"+
    "#aksi-side a{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:10px;"+
    "text-decoration:none;color:#0f172a;font-size:12px;font-weight:700;white-space:nowrap}"+
    "#aksi-side a:hover{background:#eef2ff;color:#6d28d9}"+
    "#aksi-side a.on{background:#6d28d9;color:#fff}"+
    "#aksi-side .ic{width:18px;text-align:center;font-size:14px}"+
    "#aksi-side .lab{display:inline}"+
    "#aksi-fab{display:none;position:fixed;right:12px;bottom:78px;z-index:10000;"+
    "width:48px;height:48px;border-radius:50%;border:0;background:linear-gradient(135deg,#7c3aed,#4f46e5);"+
    "color:#fff;font-size:20px;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(109,40,217,.35)}"+
    "@media(max-width:720px){"+
    "#aksi-side{right:0;top:0;bottom:0;transform:none;max-height:none;width:min(78vw,280px);"+
    "border-radius:0;padding:56px 12px 20px;transition:transform .2s ease;transform:translateX(105%)}"+
    "#aksi-side.open{transform:translateX(0)}"+
    "#aksi-fab{display:grid;place-items:center}"+
    "}"+
    "@media(min-width:721px){body{padding-right:118px!important}}";
  var st=document.createElement("style");st.id="aksi-side-css";st.textContent=css;document.head.appendChild(st);
  var nav=document.createElement("nav");nav.id="aksi-side";nav.setAttribute("aria-label","Навигация АКСИ");
  items.forEach(function(it){
    var a=document.createElement("a");a.href=it.href;
    var p=(it.href.split("#")[0]||"/").replace(/\/+$/,"")||"/";
    if(p!=="/"&&path.indexOf(p)===0)a.className="on";
    else if(p==="/"&&home&&it.href==="/")a.className="on";
    a.innerHTML="<span class=\"ic\">"+it.ic+"</span><span class=\"lab\">"+it.label+"</span>";
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
  var fab=document.createElement("button");fab.id="aksi-fab";fab.type="button";fab.setAttribute("aria-label","Меню");fab.textContent="☰";
  fab.onclick=function(){nav.classList.toggle("open")};
  document.body.appendChild(fab);
  document.addEventListener("click",function(e){
    if(window.innerWidth>720)return;
    if(!nav.classList.contains("open"))return;
    if(nav.contains(e.target)||fab.contains(e.target))return;
    nav.classList.remove("open");
  });
  if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){});
})();
