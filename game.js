// Default zones (center = index 0, outermost = last)
const DEFAULT_ZONES = [
  { label: '🎉 BULLSEYE!',   color: '#ff66b8', weight: 1  },
  { label: '💎 Grand Prize', color: '#c56bff', weight: 2  },
  { label: '🔥 Double Up',   color: '#5ad0ff', weight: 3  },
  { label: '⭐ 500 Points',  color: '#ff9cd8', weight: 4  },
  { label: '🌟 250 Points',  color: '#2f8fff', weight: 5  },
  { label: '😂 Try Again',   color: '#3a1a5e', weight: 6  },
  { label: '😢 Miss!',       color: '#0d0d1a', weight: 7  },
];

let zones = DEFAULT_ZONES.map(z => ({ ...z }));

const canvas = document.getElementById('dartCanvas');
const ctx    = canvas.getContext('2d');

function sizeCanvas() {
  const wrap = canvas.parentElement;
  const s = Math.min(wrap.clientWidth - 40, wrap.clientHeight - 40, 540);
  canvas.width  = s;
  canvas.height = s;
}
sizeCanvas();
window.addEventListener('resize', () => { sizeCanvas(); drawBoard(); });

let throwing   = false;
let dartPos    = null;
let dartAngle  = 0;
let soundOn    = true;

const throwBtn      = document.getElementById('throwBtn');
const soundBtn      = document.getElementById('soundBtn');
const toggleBtn     = document.getElementById('togglePanelBtn');
const panel         = document.getElementById('panel');
const zonesUI       = document.getElementById('zonesUI');
const addZoneBtn    = document.getElementById('addZoneBtn');
const lastResult    = document.getElementById('lastResult');
const resultOverlay = document.getElementById('resultOverlay');
const resName       = document.getElementById('resName');

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
function getACtx() { if (!actx) actx = new AudioCtx(); return actx; }

function playThrow() {
  if (!soundOn) return;
  try {
    const a = getACtx();
    const buf = a.createBuffer(1, a.sampleRate * 0.25, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = a.createBufferSource();
    src.buffer = buf;
    const filt = a.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 1200; filt.Q.value = 0.5;
    const g = a.createGain();
    g.gain.setValueAtTime(0.28, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.25);
    src.connect(filt); filt.connect(g); g.connect(a.destination);
    src.start();
  } catch(e){}
}

function playThunk() {
  if (!soundOn) return;
  try {
    const a = getACtx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, a.currentTime + 0.12);
    g.gain.setValueAtTime(0.35, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
    o.start(); o.stop(a.currentTime + 0.18);
  } catch(e){}
}

function playWin() {
  if (!soundOn) return;
  try {
    const a = getACtx();
    [0, 0.1, 0.2, 0.35].forEach((t, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.frequency.value = [523, 659, 784, 1047][i];
      o.type = 'sine';
      g.gain.setValueAtTime(0.2, a.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t + 0.3);
      o.start(a.currentTime + t);
      o.stop(a.currentTime + t + 0.3);
    });
  } catch(e){}
}

function drawBoard() {
  const W  = canvas.width;
  const CX = W / 2, CY = W / 2;
  const maxR = W / 2 - 10;
  ctx.clearRect(0, 0, W, W);
  const n = zones.length;
  const ringW = maxR / n;

  for (let i = n - 1; i >= 0; i--) {
    const r = maxR - i * ringW;
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, 2 * Math.PI);
    ctx.fillStyle = zones[i].color;
    ctx.fill();

    const sg = ctx.createRadialGradient(CX - r * 0.3, CY - r * 0.3, 0, CX, CY, r);
    sg.addColorStop(0, 'rgba(255,255,255,.14)');
    sg.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, 2 * Math.PI);
    ctx.fillStyle = sg;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fs = Math.max(10, Math.min(15, ringW * 0.38));
    ctx.font = `bold ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.9)';
    ctx.shadowBlur = 5;
    const midR = i === 0 ? r * 0.5 : r - ringW / 2;
    ctx.fillText(zones[i].label, CX, CY - midR, ringW * 1.8);
    ctx.restore();
  }

  const og = ctx.createRadialGradient(CX, CY, maxR - 4, CX, CY, maxR + 6);
  og.addColorStop(0, 'rgba(255,102,184,.7)');
  og.addColorStop(1, 'rgba(90,208,255,0)');
  ctx.beginPath();
  ctx.arc(CX, CY, maxR + 4, 0, 2 * Math.PI);
  ctx.strokeStyle = og;
  ctx.lineWidth = 10;
  ctx.stroke();

  if (dartPos) drawDart(dartPos.x, dartPos.y, dartAngle);
}

function drawDart(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 28);
  ctx.strokeStyle = '#c8d2e6';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-3, 6, 6, 14, 3);
  ctx.fillStyle = '#ff9cd8';
  ctx.fill();
  ctx.strokeStyle = '#ff66b8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2.5, 0);
  ctx.lineTo(2.5, 0);
  ctx.lineTo(0, -8);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(-8, 34);
  ctx.lineTo(0, 28);
  ctx.lineTo(8, 34);
  ctx.closePath();
  ctx.fillStyle = '#5ad0ff';
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function pickLandingZone() {
  const totalWeight = zones.reduce((s, z) => s + z.weight, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < zones.length; i++) {
    r -= zones[i].weight;
    if (r <= 0) return i;
  }
  return zones.length - 1;
}

function throwDart() {
  if (throwing) return;
  throwing = true;
  throwBtn.disabled = true;
  resultOverlay.classList.add('hidden');
  dartPos = null;
  playThrow();

  const W    = canvas.width;
  const CX   = W / 2, CY = W / 2;
  const maxR = W / 2 - 10;
  const n    = zones.length;
  const ringW = maxR / n;

  const zoneIdx = pickLandingZone();
  const outerR = maxR - zoneIdx * ringW;
  const innerR = outerR - ringW;
  const landR   = innerR + 4 + Math.random() * (ringW - 8);
  const landAngle = Math.random() * 2 * Math.PI;
  const landX   = CX + landR * Math.cos(landAngle);
  const landY   = CY + landR * Math.sin(landAngle);

  const startX = CX + (Math.random() - 0.5) * 80;
  const startY = -30;
  const totalFrames = 28;
  let frame = 0;

  function fly() {
    frame++;
    const t = frame / totalFrames;
    const et = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const cx = startX + (landX - startX) * et;
    const cy = startY + (landY - startY) * et;
    const dx = landX - startX, dy = landY - startY;
    const dartA = Math.atan2(dy, dx) - Math.PI / 2;
    drawBoard();
    drawDart(cx, cy, dartA);
    if (frame >= totalFrames) {
      dartPos  = { x: landX, y: landY };
      dartAngle = dartA;
      playThunk();
      drawBoard();
      shakeBoard(6, () => showResult(zoneIdx));
    } else {
      requestAnimationFrame(fly);
    }
  }
  requestAnimationFrame(fly);
}

function shakeBoard(times, cb) {
  if (times <= 0) { cb(); return; }
  const dx = (Math.random() - 0.5) * 6;
  const dy = (Math.random() - 0.5) * 6;
  canvas.style.transform = `translate(${dx}px,${dy}px)`;
  setTimeout(() => {
    canvas.style.transform = '';
    setTimeout(() => shakeBoard(times - 1, cb), 30);
  }, 30);
}

function showResult(zoneIdx) {
  const zone = zones[zoneIdx];
  resName.textContent = zone.label;
  lastResult.textContent = zone.label;
  resultOverlay.classList.remove('hidden');
  playWin();
  throwing = false;
  throwBtn.disabled = false;
  setTimeout(() => resultOverlay.classList.add('hidden'), 3000);
}

function renderZonesUI() {
  zonesUI.innerHTML = '';
  zones.forEach((z, i) => {
    const lbl = document.createElement('div');
    lbl.className = 'ring-label';
    lbl.textContent = i === 0 ? '🎯 Bullseye (center)' : `Ring ${i + 1} (from center)`;
    const row = document.createElement('div');
    row.className = 'zone-row';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = z.label; inp.placeholder = 'Zone label';
    inp.addEventListener('input', () => { zones[i].label = inp.value; drawBoard(); });
    const col = document.createElement('input');
    col.type = 'color';
    col.value = z.color.startsWith('#') ? z.color : '#ff66b8';
    col.addEventListener('input', () => { zones[i].color = col.value; drawBoard(); });
    const del = document.createElement('button');
    del.className = 'btn remove-zone'; del.textContent = '✕';
    del.addEventListener('click', () => {
      if (zones.length <= 2) return;
      zones.splice(i, 1);
      renderZonesUI(); drawBoard();
    });
    row.appendChild(inp); row.appendChild(col); row.appendChild(del);
    zonesUI.appendChild(lbl); zonesUI.appendChild(row);
  });
}

addZoneBtn.addEventListener('click', () => {
  zones.push({ label: 'New Zone', color: '#c56bff', weight: zones.length + 1 });
  renderZonesUI(); drawBoard();
  zonesUI.lastElementChild?.querySelector('input')?.focus();
});

throwBtn.addEventListener('click', throwDart);
toggleBtn.addEventListener('click', () => {
  const hidden = panel.classList.toggle('hidden');
  toggleBtn.textContent = hidden ? 'Show Customize' : 'Hide Customize';
});
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.textContent = 'Sound: ' + (soundOn ? 'On' : 'Off');
});
resultOverlay.addEventListener('click', () => resultOverlay.classList.add('hidden'));

renderZonesUI();
drawBoard();
