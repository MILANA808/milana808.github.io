/**
 * AKSI MATRIX — Lorenz attractor visual layer
 * dx/dt = σ(y−x), dy/dt = x(ρ−z)−y, dz/dt = xy−βz
 * Aesthetic + typing boost — does NOT replace Kernel/WebLLM.
 */

const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;
const DT = 0.012;

export class LorenzChaos {
  constructor(opts) {
    this.canvas = opts.canvas;
    this.input = opts.input || null;
    this.routeEl = opts.routeEl || null;
    this.stroke = opts.stroke || 'rgba(47, 42, 38, 0.72)';
    this.ctx = this.canvas.getContext('2d');
    this.x = 0.1;
    this.y = 0;
    this.z = 0;
    this.points = [];
    this.maxPoints = 220;
    this.speed = 1;
    this.running = false;
    this._raf = 0;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || this.canvas.offsetWidth || 320;
    const h = this.canvas.clientHeight || this.canvas.offsetHeight || 120;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._cssW = w;
    this._cssH = h;
  }

  step() {
    const { x, y, z } = this;
    const dx = SIGMA * (y - x) * DT;
    const dy = (x * (RHO - z) - y) * DT;
    const dz = (x * y - BETA * z) * DT;
    this.x = x + dx;
    this.y = y + dy;
    this.z = z + dz;

    if (this.input && this.input.value && this.input.value.length > 0) this.speed = 2.4;
    else this.speed = 1;

    const scale = 3.2 * Math.min(this.speed, 2.2);
    const cx = (this._cssW || 320) / 2;
    const cy = (this._cssH || 120) / 2;
    this.points.push({ px: cx + this.x * scale, py: cy + this.y * scale * 0.85 });
    while (this.points.length > this.maxPoints) this.points.shift();
  }

  draw() {
    const ctx = this.ctx;
    const w = this._cssW || 320;
    const h = this._cssH || 120;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(207, 198, 182, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    if (this.points.length < 2) return;
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = 1.25;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.points[0].px, this.points[0].py);
    for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].px, this.points[i].py);
    ctx.stroke();
    const last = this.points[this.points.length - 1];
    ctx.fillStyle = 'rgba(47, 107, 79, 0.9)';
    ctx.beginPath();
    ctx.arc(last.px, last.py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  tick = () => {
    if (!this.running) return;
    const steps = this.speed > 1.5 ? 3 : 2;
    for (let i = 0; i < steps; i++) this.step();
    this.draw();
    this._raf = requestAnimationFrame(this.tick);
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  sample() {
    return { x: this.x, y: this.y, z: this.z, energy: Math.abs(this.x * this.y * this.z) };
  }

  pulseRoute() {
    if (!this.routeEl) return;
    const s = this.sample();
    const prev = this.routeEl.textContent;
    this.routeEl.textContent = 'lorenz ' + s.energy.toFixed(2);
    setTimeout(() => {
      if (this.routeEl.textContent.indexOf('lorenz') === 0) this.routeEl.textContent = prev;
    }, 1200);
  }
}

export function mountLorenz(canvas, input, routeEl) {
  if (!canvas) return null;
  const chaos = new LorenzChaos({
    canvas,
    input,
    routeEl,
    stroke: 'rgba(47, 42, 38, 0.78)'
  });
  chaos.start();
  return chaos;
}

export default LorenzChaos;
