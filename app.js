const dialog=document.querySelector('dialog');

// Music starts only after an explicit click; each page opens quietly.
(() => {
  const music = new Audio('assets/clover-pop.wav');
  music.loop = true;
  music.preload = 'none';
  music.volume = .25;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'music-toggle';
  button.textContent = '♫ 음악 켜기';
  button.setAttribute('aria-label', '발랄한 배경음악 켜기');
  button.setAttribute('aria-pressed', 'false');
  document.body.append(button);
  const style = document.createElement('style');
  style.textContent = `.music-toggle{position:fixed;right:24px;bottom:24px;z-index:1000;border:1px solid #145e35;border-radius:28px;padding:13px 20px;background:#e9fad3;color:#145e35;font-family:inherit;font-size:14px;font-weight:600;box-shadow:0 4px 18px #145e3518}.music-toggle:hover{background:#d7f477}.music-toggle[aria-pressed="true"]{background:#145e35;color:#fff}.music-toggle:disabled{opacity:.7}.music-toggle:focus-visible{outline:3px solid #3285fa;outline-offset:4px}@media(max-width:760px){.music-toggle{right:16px;bottom:16px;padding:11px 16px}}`;
  document.head.append(style);
  function stop() {
    music.pause();
    button.textContent = '♫ 음악 켜기';
    button.setAttribute('aria-label', '발랄한 배경음악 켜기');
    button.setAttribute('aria-pressed', 'false');
  }
  button.addEventListener('click', async () => {
    if (!music.paused) { stop(); return; }
    button.disabled = true;
    button.textContent = '♫ 준비 중';
    try {
      await music.play();
      if (document.hidden) { stop(); return; }
      button.textContent = '♫ 음악 끄기';
      button.setAttribute('aria-label', '배경음악 끄기');
      button.setAttribute('aria-pressed', 'true');
    } catch {
      stop();
      button.textContent = '♫ 재생 다시 시도';
      button.setAttribute('aria-label', '배경음악 재생 다시 시도');
    } finally { button.disabled = false; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
document.querySelectorAll('[data-story]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const story=document.getElementById(link.dataset.story);dialog.querySelector('.dialog-content').innerHTML=story.innerHTML;dialog.showModal()}));
document.querySelectorAll('[data-art]').forEach(button=>button.addEventListener('click',()=>{const content=dialog.querySelector('.dialog-content');content.replaceChildren();const title=document.createElement('h2');title.textContent=button.dataset.title;const image=document.createElement('img');image.src=button.dataset.art;image.alt=button.dataset.title;content.append(title,image);dialog.showModal()}));
dialog?.querySelector('.close').addEventListener('click',()=>dialog.close());

// Native pixel cursor keeps its position in sync even between animation frames.
(() => {
  const mouseAvailable = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const style = document.createElement('style');
  style.textContent = `@media (hover: hover) and (pointer: fine) {
    html, body, body * { cursor: url("assets/clover-cursor.svg") 15 15, auto; }
    a, button, summary, [role="button"] { cursor: url("assets/clover-cursor.svg") 15 15, pointer; }
    input, textarea, [contenteditable="true"] { cursor: text; }
  }`;
  document.head.append(style);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.append(canvas);
  const colors = ['#3abf70', '#95dd70', '#f2c94c', '#fff5b7'];
  let particles = [], frame = 0, lastPoint = null, lastSpawn = 0;

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * scale);
    canvas.height = Math.round(innerHeight * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    particles = [];
    lastPoint = null;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  function draw(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter(p => now - p.born < p.life);
    for (const p of particles) {
      const progress = (now - p.born) / p.life;
      const x = Math.round(p.x + p.dx * progress);
      const y = Math.round(p.y + p.dy * progress + 16 * progress * progress);
      const size = p.size;
      ctx.globalAlpha = (1 - progress) * .85;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, size, size);
      if (p.star && progress < .6) {
        const arm = Math.max(1, Math.floor(size / 2));
        ctx.fillRect(x + arm, y - size, arm, size * 3);
        ctx.fillRect(x - size, y + arm, size * 3, arm);
      }
    }
    ctx.globalAlpha = 1;
    frame = particles.length ? requestAnimationFrame(draw) : 0;
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !mouseAvailable.matches || reducedMotion.matches || document.hidden) return;
    const now = performance.now();
    const x = event.clientX, y = event.clientY;
    if (now - lastSpawn < 20 || (lastPoint && Math.hypot(x - lastPoint.x, y - lastPoint.y) < 5)) return;
    lastSpawn = now;
    lastPoint = { x, y };
    for (let i = 0; i < 2; i++) {
      particles.push({x:x + (Math.random() - .5) * 14, y:y + 10,
        dx:(Math.random() - .5) * 30, dy:8 + Math.random() * 18,
        size:2 + Math.floor(Math.random() * 3), color:colors[Math.floor(Math.random() * colors.length)],
        born:now, life:350 + Math.random() * 350, star:Math.random() < .25});
    }
    if (particles.length > 80) particles.splice(0, particles.length - 80);
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
  document.documentElement.addEventListener('pointerleave', clear);
  mouseAvailable.addEventListener('change', clear);
  reducedMotion.addEventListener('change', clear);
  resize();
})();
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
