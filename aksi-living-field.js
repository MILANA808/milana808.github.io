/* AKSI Living Field v1 — procedural cinematic motion, no external assets or trackers. */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.getElementById('aksi-living-field')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'aksi-living-field';
  canvas.setAttribute('aria-hidden', 'true');
  const css = document.createElement('style');
  css.textContent = `
    body{isolation:isolate}
    #aksi-living-field{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:.34;mix-blend-mode:screen}
    #aksi-living-control{position:fixed;z-index:99;right:14px;bottom:14px;display:flex;align-items:center;gap:9px;padding:9px 12px;border:1px solid rgba(123,220,255,.28);border-radius:999px;background:rgba(7,10,24,.82);color:#dff8ff;font:11px/1.2 ui-monospace,monospace;letter-spacing:.08em;backdrop-filter:blur(16px);box-shadow:0 0 28px rgba(90,106,255,.15);cursor:pointer}
    #aksi-living-control i{width:7px;height:7px;border-radius:50%;background:#66f6d1;box-shadow:0 0 12px #66f6d1;display:inline-block}
    @media(max-width:600px){#aksi-living-field{opacity:.23}#aksi-living-control{right:9px;bottom:9px;font-size:10px}}
  `;
  document.head.appendChild(css);
  const control = document.createElement('button');
  control.id = 'aksi-living-control';
  control.type = 'button';
  control.innerHTML = '<i></i><span>AKSI FIELD · LIVE</span> <span aria-hidden="true">↻</span>';
  control.title = 'Сменить визуальный режим поля';
  document.body.prepend(canvas);
  document.body.appendChild(control);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); control.remove(); return; }
  const phases = [
    {name:'NEBULA',a:[93,91,255],b:[40,224,255],speed:1},
    {name:'RESONANCE',a:[255,86,205],b:[95,245,205],speed:1.35},
    {name:'QUANTUM FLOW',a:[91,179,255],b:[179,119,255],speed:.78},
    {name:'DEEP FIELD',a:[95,245,205],b:[100,115,255],speed:.55}
  ];
  let phase = 0, w = 0, h = 0, dpr = 1, points = [], pointer = {x:-1000,y:-1000}, last = 0, raf = 0, autoAt = performance.now()+16000;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.6); w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count = Math.max(42, Math.min(115, Math.round(w*h/10500)));
    points = Array.from({length:count}, (_,i)=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.28,r:Math.random()*1.4+.35,p:Math.random()*6.28,seed:i}));
  }
  function color(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
  function nextPhase(){phase=(phase+1)%phases.length;control.querySelector('span').textContent='AKSI FIELD · '+phases[phase].name;autoAt=performance.now()+16000;}
  control.addEventListener('click',nextPhase);
  addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;},{passive:true});
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);}else{last=0;raf=requestAnimationFrame(draw);}});
  function draw(now) {
    if(document.hidden)return;
    const dt=Math.min(2,(now-(last||now))/16.67);last=now;
    if(now>autoAt)nextPhase();
    const p=phases[phase], cx=w*(.5+.13*Math.sin(now*.00013)), cy=h*(.48+.12*Math.cos(now*.00017));
    ctx.clearRect(0,0,w,h);
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.65);
    glow.addColorStop(0,color(p.a,.105));glow.addColorStop(.42,color(p.b,.035));glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    const reach=Math.min(138,Math.max(75,w*.12));
    for(let i=0;i<points.length;i++){
      const a=points[i], dx=pointer.x-a.x,dy=pointer.y-a.y,dist=Math.hypot(dx,dy)||1;
      if(dist<150){a.vx-=dx/dist*.006*dt;a.vy-=dy/dist*.006*dt;}
      a.x+=a.vx*dt*p.speed+Math.sin(now*.0003+a.p)*.12;
      a.y+=a.vy*dt*p.speed+Math.cos(now*.00027+a.p)*.12;
      a.vx*=.998;a.vy*=.998;
      if(a.x< -8)a.x=w+8;if(a.x>w+8)a.x=-8;if(a.y< -8)a.y=h+8;if(a.y>h+8)a.y=-8;
      const pulse=.35+.35*(.5+.5*Math.sin(now*.001*a.seed*.02+a.p));
      ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fillStyle=color(i%3?p.b:p.a,pulse);ctx.fill();
      for(let j=i+1;j<points.length;j++){
        const b=points[j],dd=Math.hypot(a.x-b.x,a.y-b.y);
        if(dd<reach){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color(i%2?p.a:p.b,(1-dd/reach)*.18);ctx.lineWidth=.65;ctx.stroke();}
      }
      const dc=Math.hypot(a.x-cx,a.y-cy);
      if(dc<Math.min(w,h)*.34){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(cx+Math.sin(now*.00018+a.p)*24,cy+Math.cos(now*.00021+a.p)*24);ctx.strokeStyle=color(p.b,(1-dc/(Math.min(w,h)*.34))*.16);ctx.stroke();}
    }
    raf=requestAnimationFrame(draw);
  }
  resize();raf=requestAnimationFrame(draw);
})();