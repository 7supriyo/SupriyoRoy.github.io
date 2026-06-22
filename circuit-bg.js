// Minimal, efficient circuit-style animated background
(() => {
  const canvas = document.getElementById('circuit-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  let w, h, devicePixelRatio = window.devicePixelRatio || 1;

  // Respect reduced motion
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    devicePixelRatio = window.devicePixelRatio || 1;
    w = Math.max(300, Math.floor(window.innerWidth));
    h = Math.max(300, Math.floor(window.innerHeight));
    canvas.width = Math.floor(w * devicePixelRatio);
    canvas.height = Math.floor(h * devicePixelRatio);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    initGrid();
  }

  // Grid + traces configuration
  const grid = { cols: 40, rows: 24, nodes: [], traces: [] };
  function initGrid() {
    grid.nodes = [];
    grid.traces = [];
    const marginX = 40;
    const marginY = 40;
    const cols = Math.max(8, Math.floor((w - marginX*2) / 40));
    const rows = Math.max(6, Math.floor((h - marginY*2) / 40));
    grid.cols = cols;
    grid.rows = rows;
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const nx = marginX + (x / cols) * (w - marginX*2);
        const ny = marginY + (y / rows) * (h - marginY*2);
        if (Math.random() < 0.12) { // place node randomly on grid
          grid.nodes.push({ x: nx + (Math.random()-0.5)*10, y: ny + (Math.random()-0.5)*10, glow: Math.random()*0.8+0.4 });
        }
      }
    }
    // create random traces between nodes
    for (let i = 0; i < Math.min(40, grid.nodes.length); i++) {
      const a = grid.nodes[Math.floor(Math.random()*grid.nodes.length)];
      const b = grid.nodes[Math.floor(Math.random()*grid.nodes.length)];
      if (a && b && (a !== b) && Math.hypot(a.x-b.x, a.y-b.y) > 40) {
        grid.traces.push({
          a, b,
          phase: Math.random()*Math.PI*2,
          speed: 0.8 + Math.random()*1.5,
          width: 1 + Math.random()*2
        });
      }
    }
  }

  // Colors (dark theme)
  const baseBg = '#05060a';
  const traceColor = { r: 30, g: 190, b: 210 }; // teal-cyan traces
  const nodeColor = { r: 150, g: 220, b: 255 };

  function clear() {
    ctx.fillStyle = baseBg;
    ctx.fillRect(0, 0, w, h);
  }

  let last = performance.now();
  function draw(now) {
    const dt = Math.min(60, now - last) / 1000;
    last = now;

    if (reduceMotion) {
      // static rendering for reduced-motion users
      clear();
      drawStatic();
      return;
    }

    clear();

    // subtle vignette/grid
    ctx.save();
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(10,12,18,0.3)');
    grd.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // draw traces with animated pulse
    grid.traces.forEach(trace => {
      const { a, b } = trace;
      const t = (performance.now() / 1000) * trace.speed + trace.phase;
      // path
      ctx.lineWidth = trace.width;
      ctx.lineCap = 'round';
      // base faint line
      ctx.strokeStyle = `rgba(${traceColor.r},${traceColor.g},${traceColor.b},0.08)`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      // slight curved path
      const cx = (a.x + b.x) / 2 + (Math.sin(t*0.5) * 20);
      const cy = (a.y + b.y) / 2 + (Math.cos(t*0.7) * 20);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.stroke();

      // animated bright pulse
      const pulsePos = (Math.sin(t) + 1) / 2; // 0..1
      const p1 = lerpPoint(a, b, pulsePos);
      // glow
      const glow = ctx.createRadialGradient(p1.x, p1.y, 0, p1.x, p1.y, 40);
      glow.addColorStop(0, `rgba(${nodeColor.r},${nodeColor.g},${nodeColor.b},0.9)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 28, 0, Math.PI*2);
      ctx.fill();

      // bright stroke for pulse
      ctx.strokeStyle = `rgba(${nodeColor.r},${nodeColor.g},${nodeColor.b},0.95)`;
      ctx.lineWidth = trace.width + 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      // draw only a portion using dashed line trick
      const dashLen = 1 + pulsePos * 200;
      ctx.setLineDash([dashLen, 400]);
      ctx.lineDashOffset = -performance.now() * 0.02;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // nodes
    grid.nodes.forEach(n => {
      // soft glow
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 30);
      g.addColorStop(0, `rgba(${nodeColor.r},${nodeColor.g},${nodeColor.b},${0.12 * n.glow})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 24 * n.glow, 0, Math.PI*2);
      ctx.fill();

      // center dot
      ctx.fillStyle = `rgba(${nodeColor.r},${nodeColor.g},${nodeColor.b},${0.9 * n.glow})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2 + 2 * n.glow, 0, Math.PI*2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  function drawStatic() {
    // draw faint static pattern when animation disabled
    grid.traces.forEach(trace => {
      const { a, b } = trace;
      ctx.lineWidth = trace.width;
      ctx.strokeStyle = `rgba(${traceColor.r},${traceColor.g},${traceColor.b},0.06)`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.stroke();
    });
    grid.nodes.forEach(n => {
      ctx.fillStyle = `rgba(${nodeColor.r},${nodeColor.g},${nodeColor.b},0.06)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 3, 0, Math.PI*2);
      ctx.fill();
    });
  }

  function lerpPoint(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  // throttle resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 120);
  });

  // disable on small devices to save battery
  function shouldDisable() {
    return window.innerWidth < 600 || /Mobi|Android/i.test(navigator.userAgent);
  }

  resize();
  if (!shouldDisable() && !reduceMotion) {
    requestAnimationFrame(draw);
  } else {
    // render a static pattern
    drawStatic();
  }
})();
