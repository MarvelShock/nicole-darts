const DEFAULT_ZONES = [
  { label: '🎯 BULLSEYE! 1–30 Subs', color: '#ff66b8', weight: 1, isBullseye: true },
  { label: '🎉 20 Subs',  color: '#c56bff', weight: 2, subs: 20 },
  { label: '⭐ 15 Subs',  color: '#5ad0ff', weight: 3, subs: 15 },
  { label: '💜 10 Subs',  color: '#ff9cd8', weight: 4, subs: 10 },
  { label: '🔵 5 Subs',   color: '#2f8fff', weight: 5, subs: 5  },
  { label: '🟣 3 Subs',   color: '#3a1a5e', weight: 6, subs: 3  },
  { label: '🔴 1 Sub',    color: '#1a0a2e', weight: 7, subs: 1  },
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

let throwing     = false;
let dartPos      = null;
let dartAngle    = 0;
let soundOn      = true;
let lastSubAmount = null;

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
    const src = a.createBufferSource(); src.buffer = buf;
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
    const o = a.createOscillator(); const g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, a.currentTime + 0.12);
    g.gain.setValueAtTime(0.35, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
    o.start(); o.stop(a.currentTime + 0.18);
  } catch(e){}
}

function playWin(isBullseye) {
  if (!soundOn) return;
  try {
    const a = getACtx();
    const notes = isBullseye ? [523,659,784,1047,1319,1568] : [523,659,784,1047];
    const times = isBullseye ? [0,0.09,0.18,0.3,0.42,0.56]  : [0,0.1,0.2,0.35];
    notes.forEach((freq, i) => {
      const o = a.createOscillator(); const g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(0.22, a.currentTime + times[i]);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + times[i] + 0.35);
      o.start(a.currentTime + times[i]); o.stop(a.currentTime + times[i] + 0.35);
    });
  } catch(e){}
}

function getRingRadii(i) {
  const maxR = canvas.width / 2 - 12;
  const n = zones.length;
  return { inner: (i/n)*maxR, outer: ((i+1)/n)*maxR };
}

function drawBoard(flyDart) {
  const W = canvas.width, CX = W/2, CY = W/2;
  const maxR = W/2 - 12;
  const n = zones.length;

  ctx.clearRect(0, 0, W, W);
  ctx.beginPath(); ctx.arc(CX,CY,maxR+2,0,2*Math.PI);
  ctx.fillStyle='#08101b'; ctx.fill();

  for (let i = n-1; i >= 0; i--) {
    const {inner, outer} = getRingRadii(i);
    ctx.beginPath();
    ctx.arc(CX,CY,outer,0,2*Math.PI);
    if (inner>0) ctx.arc(CX,CY,inner,0,2*Math.PI,true);
    ctx.fillStyle = zones[i].color; ctx.fill();

    const sg = ctx.createLinearGradient(CX,CY-outer,CX,CY+outer);
    sg.addColorStop(0,'rgba(255,255,255,0.13)');
    sg.addColorStop(0.4,'rgba(255,255,255,0.04)');
    sg.addColorStop(1,'rgba(0,0,0,0.15)');
    ctx.beginPath();
    ctx.arc(CX,CY,outer,0,2*Math.PI);
    if (inner>0) ctx.arc(CX,CY,inner,0,2*Math.PI,true);
    ctx.fillStyle=sg; ctx.fill();

    ctx.beginPath(); ctx.arc(CX,CY,outer,0,2*Math.PI);
    ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=1.5; ctx.stroke();
    if (inner>0) {
      ctx.beginPath(); ctx.arc(CX,CY,inner,0,2*Math.PI);
      ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=1.5; ctx.stroke();
    }
  }

  for (let i = 0; i < n; i++) {
    const {inner, outer} = getRingRadii(i);
    const midR = (inner+outer)/2;
    const ringH = outer-inner;
    ctx.save();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#ffffff';
    ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=6;

    if (i === 0) {
      const bullR = outer;
      const fs1 = Math.max(9, Math.min(16, bullR*0.32));
      const fs2 = Math.max(12, Math.min(22, bullR*0.48));
      if (lastSubAmount !== null) {
        ctx.font = `bold ${fs1}px system-ui,sans-serif`;
        ctx.fillText('🎯 BULLSEYE!', CX, CY - bullR*0.2, bullR*1.8);
        ctx.font = `bold ${fs2}px system-ui,sans-serif`;
        ctx.fillStyle='#fff700'; ctx.shadowColor='rgba(0,0,0,1)'; ctx.shadowBlur=10;
        ctx.fillText(`${lastSubAmount} SUBS!`, CX, CY + bullR*0.22, bullR*1.8);
      } else {
        ctx.font = `bold ${fs1}px system-ui,sans-serif`;
        ctx.fillText('🎯 BULLSEYE!', CX, CY - bullR*0.12, bullR*1.8);
        ctx.font = `bold ${Math.max(8,Math.min(13,bullR*0.26))}px system-ui,sans-serif`;
        ctx.fillStyle='rgba(255,255,255,0.75)';
        ctx.fillText('1–30 Subs', CX, CY + bullR*0.18, bullR*1.6);
      }
    } else {
      const fs = Math.max(9, Math.min(14, ringH*0.36));
      ctx.font = `bold ${fs}px system-ui,sans-serif`;
      const subCount = zones[i].subs || 1;
      const subWord = subCount===1?'Sub':'Subs';
      ctx.fillText(`${zones[i].label} • ${subCount} ${subWord}`, CX, CY - midR, ringH*2.2);
    }
    ctx.restore();
  }

  const og = ctx.createRadialGradient(CX,CY,maxR-2,CX,CY,maxR+10);
  og.addColorStop(0,'rgba(255,102,184,0.8)'); og.addColorStop(1,'rgba(90,208,255,0)');
  ctx.beginPath(); ctx.arc(CX,CY,maxR+6,0,2*Math.PI);
  ctx.strokeStyle=og; ctx.lineWidth=12; ctx.stroke();

  if (flyDart) drawDart(flyDart.x,flyDart.y,flyDart.angle);
  else if (dartPos) drawDart(dartPos.x,dartPos.y,dartAngle);
}

function drawDart(x,y,angle) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=8; ctx.shadowOffsetX=2; ctx.shadowOffsetY=2;
  ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(0,26);
  ctx.strokeStyle='#c8d2e6'; ctx.lineWidth=3; ctx.lineCap='round'; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-3.5,6,7,13,3);
  ctx.fillStyle='#ff9cd8'; ctx.fill(); ctx.strokeStyle='#ff66b8'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2.5,2); ctx.lineTo(2.5,2); ctx.lineTo(0,-9); ctx.closePath();
  ctx.fillStyle='#ffffff'; ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
  ctx.beginPath(); ctx.moveTo(0,21); ctx.lineTo(-9,34); ctx.lineTo(0,27); ctx.lineTo(9,34); ctx.closePath();
  ctx.fillStyle='#5ad0ff'; ctx.globalAlpha=0.9; ctx.fill();
  ctx.strokeStyle='#2f8fff'; ctx.lineWidth=1; ctx.globalAlpha=1; ctx.stroke();
  ctx.restore();
}

function pickLandingZone() {
  const total = zones.reduce((s,z)=>s+z.weight,0);
  let r = Math.random()*total;
  for (let i=0;i<zones.length;i++) { r-=zones[i].weight; if(r<=0) return i; }
  return zones.length-1;
}

function throwDart() {
  if (throwing) return;
  throwing=true; throwBtn.disabled=true;
  resultOverlay.classList.add('hidden');
  dartPos=null; lastSubAmount=null;
  playThrow();

  const W=canvas.width, CX=W/2, CY=W/2;
  const zoneIdx = pickLandingZone();
  const {inner,outer} = getRingRadii(zoneIdx);
  const pad = Math.min(4,(outer-inner)*0.15);
  const landR = (inner+pad)+Math.random()*(outer-inner-pad*2);
  const landA = Math.random()*2*Math.PI;
  const landX = CX+landR*Math.cos(landA), landY = CY+landR*Math.sin(landA);
  const startX = CX+(Math.random()-0.5)*60, startY=-40;
  const dx=landX-startX, dy=landY-startY;
  const finalAngle = Math.atan2(dy,dx)-Math.PI/2;
  const totalFrames=32; let frame=0;

  function fly() {
    frame++;
    const et = 1-Math.pow(1-frame/totalFrames,3);
    drawBoard({x:startX+dx*et, y:startY+dy*et, angle:finalAngle});
    if (frame>=totalFrames) {
      dartPos={x:landX,y:landY}; dartAngle=finalAngle;
      if (zones[zoneIdx].isBullseye) lastSubAmount=Math.floor(Math.random()*30)+1;
      playThunk(); drawBoard();
      shakeBoard(5,()=>showResult(zoneIdx));
    } else requestAnimationFrame(fly);
  }
  requestAnimationFrame(fly);
}

function shakeBoard(n,cb) {
  if (n<=0){cb();return;}
  const dx=(Math.random()-0.5)*7, dy=(Math.random()-0.5)*7;
  canvas.style.transform=`translate(${dx}px,${dy}px)`;
  setTimeout(()=>{canvas.style.transform='';setTimeout(()=>shakeBoard(n-1,cb),28);},28);
}

function showResult(zoneIdx) {
  const zone = zones[zoneIdx];
  const isBullseye = !!zone.isBullseye;
  const subCount = isBullseye ? lastSubAmount : (zone.subs || 1);
  const subWord = subCount===1 ? 'Sub' : 'Subs';

  resName.innerHTML = isBullseye
    ? `🎯 BULLSEYE!<br><span style="font-size:2.2em;color:#fff700;text-shadow:0 0 18px #ff66b8,0 0 4px #000;">🎉 ${subCount} ${subWord}!</span>`
    : `${zone.label}<br><span style="font-size:1.8em;color:#fff700;text-shadow:0 0 12px #ff66b8,0 0 4px #000;">🎉 ${subCount} ${subWord}!</span>`;

  lastResult.textContent = `${isBullseye?'🎯 BULLSEYE!':zone.label} — ${subCount} ${subWord}!`;
  resultOverlay.classList.remove('hidden');
  playWin(isBullseye);
  throwing=false; throwBtn.disabled=false;
  setTimeout(()=>{
    resultOverlay.classList.add('hidden');
    lastSubAmount=null; drawBoard();
  }, 4500);
}

function renderZonesUI() {
  zonesUI.innerHTML='';
  zones.forEach((z,i)=>{
    const lbl=document.createElement('div'); lbl.className='ring-label';
    lbl.textContent = i===0 ? '🎯 Bullseye — random 1–30 subs' : `Ring ${i+1} (from center)`;
    const row=document.createElement('div'); row.className='zone-row';
    const inp=document.createElement('input'); inp.type='text'; inp.value=z.label; inp.placeholder='Zone label';
    inp.addEventListener('input',()=>{zones[i].label=inp.value;drawBoard();});
    const col=document.createElement('input'); col.type='color';
    col.value=z.color.startsWith('#')?z.color:'#ff66b8';
    col.addEventListener('input',()=>{zones[i].color=col.value;drawBoard();});
    if (!z.isBullseye) {
      const subInp=document.createElement('input'); subInp.type='number';
      subInp.min=1; subInp.max=999; subInp.value=z.subs||1;
      subInp.style.cssText='width:52px;padding:4px 6px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#fff;font-size:13px;text-align:center;';
      subInp.title='Sub amount for this ring';
      subInp.addEventListener('input',()=>{zones[i].subs=parseInt(subInp.value)||1;drawBoard();});
      row.appendChild(inp); row.appendChild(subInp); row.appendChild(col);
    } else {
      row.appendChild(inp); row.appendChild(col);
    }
    const del=document.createElement('button'); del.className='btn remove-zone'; del.textContent='✕';
    del.addEventListener('click',()=>{if(zones.length<=2)return;zones.splice(i,1);renderZonesUI();drawBoard();});
    row.appendChild(del);
    zonesUI.appendChild(lbl); zonesUI.appendChild(row);
  });
}

addZoneBtn.addEventListener('click',()=>{
  zones.push({label:'New Zone',color:'#c56bff',weight:zones.length+1,subs:1});
  renderZonesUI(); drawBoard();
  zonesUI.lastElementChild?.querySelector('input')?.focus();
});

throwBtn.addEventListener('click',throwDart);
toggleBtn.addEventListener('click',()=>{
  const hidden=panel.classList.toggle('hidden');
  toggleBtn.textContent=hidden?'Show Customize':'Hide Customize';
});
soundBtn.addEventListener('click',()=>{
  soundOn=!soundOn;
  soundBtn.textContent='Sound: '+(soundOn?'On':'Off');
});
resultOverlay.addEventListener('click',()=>{
  resultOverlay.classList.add('hidden');
  lastSubAmount=null; drawBoard();
});

renderZonesUI();
drawBoard();
