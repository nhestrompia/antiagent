import { load as loadBotD } from '@fingerprintjs/botd';
import { detectInstantClientAsync } from 'bot-signal/browser';
import { DRMRuntime, publicAsset } from './drm.js';
import { inspectAPIs } from './tamper-gate.js';
import { installCaptureCover } from './capture-cover.js';
import { inspectRuntimeCost } from './runtime-cost.js';
import { lockMethods } from './intrinsic-guard.js';

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
// Opt-in rendering research; human readability is not established.
const parameters = new URLSearchParams(location.search);
const layeredMode = parameters.get('defense') === 'layered';
const combinedMode = layeredMode || parameters.get('defense') === 'combined';
const freshnessMode = layeredMode && parameters.get('fresh') === 'on';
const decoyMask = layeredMode && parameters.get('mask') === 'decoy';
const clockGuard = layeredMode && parameters.get('clock') === 'on';
const jitterMask = layeredMode && parameters.get('jitter') === 'on';
const timingProbe = parameters.get('timing') === 'on';
let timingSamples, timingPrevious;
if(timingProbe)window.addEventListener('keydown',event=>{
  if(!event.isTrusted)return;
  if(event.key==='s'){timingSamples=[];timingPrevious=undefined;event.preventDefault();}
  if(event.key==='e'&&timingSamples){
    const samples=timingSamples;timingSamples=undefined;samples.sort((a,b)=>a-b);
    const panel=document.createElement('pre');panel.style.cssText='position:fixed;inset:20px auto auto 20px;background:white;color:black;font:24px sans-serif;padding:20px;z-index:99999';
    panel.textContent=['Timing finished',`Frames ${samples.length}`,`Median ${(samples[Math.floor(samples.length*.5)]||0).toFixed(2)}`,`P95 ${(samples[Math.floor(samples.length*.95)]||0).toFixed(2)}`,`Maximum ${(samples.at(-1)||0).toFixed(2)}`,`Over25 ${samples.filter(value=>value>25).length}`].join('\n');document.body.append(panel);event.preventDefault();
  }
});
let layoutEpoch = 0;
const temporalMode = combinedMode ? 'noise' : parameters.get('temporal');
const temporal = ['on', 'noise'].includes(temporalMode);
const tasks = [
  ['Choose Harbor Research', ['Harbor Research', 'North Labs', 'West Studio']],
  ['Choose 125 EUR', ['125 EUR', '50 EUR', '250 EUR']],
  ['Choose Confirm transfer', ['Confirm transfer', 'Cancel', 'Go back']],
];
const state = { step: 0, clicks: 0, blocked: false, reason: null, completed: false, ready: !layeredMode };
const layouts = tasks.map(([, choices]) => {
  const result = [...choices];
  for (let i = result.length - 1; i > 0; i--) {
    const limit = 0x100000000 - 0x100000000 % (i + 1);
    let value;
    do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
});
function paintFrame() {
  context.fillStyle = state.blocked ? '#000' : '#fff';
  context.fillRect(0, 0, 720, 480);
  if (state.blocked) return;
  context.fillStyle = '#172b35'; context.font = 'bold 28px sans-serif';
  context.fillText(state.completed ? 'Task complete' : tasks[state.step][0], 40, 70);
  if (state.completed) return;
  context.font = '16px sans-serif';
  context.fillText(`Decision ${state.step + 1} of 3`, 40, 110);
  const phases = temporalMode === 'noise' ? 2 : 4;
  const phase = temporal ? crypto.getRandomValues(new Uint32Array(1))[0] % phases : 0;
  const textShift=jitterMask?crypto.getRandomValues(new Uint8Array(1))[0]%9-4:0;
  layouts[state.step].forEach((choice, slot) => {
    const left = 40 + slot * 230;
    context.fillStyle = '#116456'; context.fillRect(left, 200, 180, 70);
    context.save();
    if (temporal) {
      context.beginPath();
      for (let x = 0; x < 180; x++) if (x % phases === phase) context.rect(left + x, 200, 1, 70);
      context.clip();
    }
    // Hidden columns never enter a reusable full-text bitmap.
    context.fillStyle = '#fff'; context.fillText(choice, left + 10, 240+textShift);
    context.restore();
    if (temporalMode === 'noise' && decoyMask) {
      context.save(); context.beginPath();
      for(let x=0;x<180;x++)if(x%phases!==phase)context.rect(left+x,200,1,70);
      context.clip();context.fillStyle='#116456';context.fillRect(left,200,180,70);
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const values=crypto.getRandomValues(new Uint8Array(20));
      context.fillStyle='#fff';context.fillText(Array.from(values,value=>alphabet[value%alphabet.length]).join(''),left+10,240+textShift);
      context.restore();
    } else if (temporalMode === 'noise') {
      const pixels = context.getImageData(left, 200, 180, 70);
      const noise = crypto.getRandomValues(new Uint8Array(180 * 70));
      for (let y = 0; y < 70; y++) for (let x = 0; x < 180; x++) {
        if (x % phases === phase) continue;
        const offset = (y * 180 + x) * 4, value = (noise[y * 180 + x] & 1) * 255;
        pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = value;
      }
      context.putImageData(pixels, left, 200);
    }
  });
}
function draw() {
  paintFrame();
  // Diagnostics expose outcomes, never the randomized target positions.
  status.textContent = JSON.stringify(state, null, 2);
}
function block(reason) {
  if (state.blocked || state.completed) return;
  state.blocked = true; state.reason = reason; draw();
}
for (const name of ['__playwright_reset_targets__', '__playwright_mark_target__']) {
  document.addEventListener(name, () => block('playwright-target-event'), true);
}
for (const name of ['__playwright_global_listeners_check__', '__playwright_snapshotter_global_listeners_check__']) {
  window.addEventListener(name, () => block('playwright-runtime-event'), true);
}
// Experimental pointer continuity. CDP can reproduce this sequence.
let pressTimer;
function expireCancelledLayout() {
  clearTimeout(pressTimer);
  if (!freshnessMode || !motion.armed || state.blocked || state.completed) return;
  layoutEpoch++; state.layoutEpoch=layoutEpoch;
  layouts[state.step].push(layouts[state.step].shift());
  draw();
}
let motion = { samples: 0, distance: 0, start: 0, previous: null, slot: undefined, entered: 0, armed: false, epoch: layoutEpoch };
function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 720 / rect.width;
  const y = (event.clientY - rect.top) * 480 / rect.height;
  const slot = [0, 1, 2].find(slot => x >= 40 + slot * 230 && x <= 220 + slot * 230 && y >= 200 && y <= 270);
  return { x, y, slot };
}
canvas.addEventListener('pointermove', event => {
  if (!state.ready || !event.isTrusted || state.blocked || state.completed) return;
  const point = pointerPosition(event), now = performance.now();
  if (motion.armed && point.slot !== motion.armed.slot) { block('pointer-transaction'); return; }
  if (!motion.samples) {
    motion.start = now; motion.epoch = layoutEpoch;
    // A first pointer observation invalidates the previous choice positions.
    layouts[state.step].push(layouts[state.step].shift());
    draw();
  }
  if (motion.previous) motion.distance += Math.hypot(point.x - motion.previous.x, point.y - motion.previous.y);
  motion.samples++; motion.previous = point;
  if (point.slot !== motion.slot) { motion.slot = point.slot; motion.entered = now; }
});
canvas.addEventListener('pointerdown', event => {
  if (!state.ready || state.blocked || state.completed) return;
  if(clockGuard){const timing=inspectRuntimeCost();state.actionClockMs=timing.medianMs;if(timing.medianMs===0){block('clock-stalled');return;}}
  const point = pointerPosition(event), now = performance.now();
  clearTimeout(pressTimer);
  motion.armed = false;
  if (point.slot === undefined) return;
  if (freshnessMode && motion.epoch !== layoutEpoch) { block('expired-layout'); return; }
  const allowed = event.button === 0 && event.isPrimary && event.isTrusted && motion.samples >= 4 && motion.distance >= 32 && now - motion.start >= 120 && point.slot === motion.slot && now - motion.entered >= 150;
  if (!allowed) block('pointer-continuity');
  else {
    const transaction={pointerId:event.pointerId,slot:point.slot,released:false,epoch:layoutEpoch,started:now};
    motion.armed=transaction;
    if(freshnessMode) pressTimer=setTimeout(()=>{if(motion.armed===transaction) block('press-expired');},500);
  }
});
canvas.addEventListener('pointerup', event => {
  if (state.blocked || state.completed || !motion.armed) return;
  if ((freshnessMode && motion.armed.epoch !== layoutEpoch) || !event.isTrusted || event.button !== 0 || event.pointerId !== motion.armed.pointerId || pointerPosition(event).slot !== motion.armed.slot) {
    block('pointer-transaction'); return;
  }
  if(freshnessMode&&performance.now()-motion.armed.started>500){block('press-expired');return;}
  clearTimeout(pressTimer);
  motion.armed.released = true;
});
for (const name of ['pointercancel', 'pointerleave']) canvas.addEventListener(name, () => {
  expireCancelledLayout(); motion.armed = false;
});
window.addEventListener('blur', () => { expireCancelledLayout(); motion.armed = false; });
canvas.addEventListener('click', event => {
  if (!state.ready) return;
  if (state.blocked || state.completed) return;
  if (!event.isTrusted) { block('untrusted-input'); return; }
  if (!motion.armed) { block('pointer-continuity'); return; }
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 720 / rect.width;
  const y = (event.clientY - rect.top) * 480 / rect.height;
  const slot = [0, 1, 2].find(slot => x >= 40 + slot * 230 && x <= 220 + slot * 230 && y >= 200 && y <= 270);
  if ((freshnessMode && motion.armed.epoch !== layoutEpoch) || !motion.armed.released || event.pointerId !== motion.armed.pointerId || slot !== motion.armed.slot) { block('pointer-transaction'); return; }
  motion.armed = false;
  state.clicks++;
  if (layouts[state.step][slot] !== tasks[state.step][1][0]) { block('incorrect-decision'); return; }
  motion = { samples: 0, distance: 0, start: 0, previous: null, slot: undefined, entered: 0, armed: false, epoch: layoutEpoch };
  state.step++; state.completed = state.step === tasks.length; draw();
});
if ((combinedMode || parameters.get('runtime') === 'on') && inspectRuntimeCost().suspected) block('runtime-cost');
if (combinedMode) installCaptureCover(canvas.parentElement, { onCover: reason => block(`capture-cover:${reason}`) });
const integrity = inspectAPIs();
if (navigator.webdriver) block('webdriver');
else if (!integrity.allowed) block(`api-integrity:${integrity.reasons.join(',')}`);
else {
  const locks = lockMethods([{ target: CanvasRenderingContext2D.prototype, key: 'fillText' }]);
  if (locks.some(lock => !['locked', 'already-locked'].includes(lock.status))) block('renderer-lock-failed');
}
if (layeredMode && !state.blocked) {
  const [botd, instant] = await Promise.all([loadBotD({monitoring:false}).then(detector=>detector.detect()), detectInstantClientAsync(window)]);
  if (botd.bot || !instant.isLegitClient) block('browser-detector');
  else {
    const video=document.createElement('video');
    video.muted=true;video.playsInline=true;video.loop=true;
    video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:0.02;pointer-events:none';
    const surface=document.createElement('div');surface.style.position='relative';
    canvas.before(surface);surface.append(canvas,video);
    const drm=new DRMRuntime(video,()=>{});
    await drm.start({...publicAsset,headers:{},robustness:'SW_SECURE_DECODE',maxVideoHeight:240});
    for(let attempt=0;attempt<200&&!drm.state.protectedPlayback&&!drm.state.error;attempt++) await new Promise(resolve=>setTimeout(resolve,100));
    if (!drm.state.protectedPlayback) block('drm-unverified');
    state.drmVerified=Boolean(drm.state.protectedPlayback);
    state.detectorsAllowed=true;
    // Action-time checks do not depend on an observer that can be disconnected.
    const owner=surface.ownerDocument;
    canvas.addEventListener('pointerdown',()=>{
      if (surface.ownerDocument!==owner || canvas.parentElement!==surface || video.parentElement!==surface || !drm.state.protectedPlayback) block('layer-ownership');
    },true);
  }
}
if (layeredMode && !state.blocked) {
  const monitor=setInterval(()=>{
    if(state.blocked||state.completed){clearInterval(monitor);return;}
    if(inspectRuntimeCost().suspected) block('runtime-attached');
  },1000);
  window.addEventListener('pagehide',()=>clearInterval(monitor),{once:true});
}
if (freshnessMode && !state.blocked) {
  const refresh=setInterval(()=>{
    if(state.blocked||state.completed){clearInterval(refresh);return;}
    // Preserve an already armed press/release transaction.
    if(motion.armed) return;
    layoutEpoch++;state.layoutEpoch=layoutEpoch;
    layouts[state.step].push(layouts[state.step].shift());
    draw();
  },3000);
  window.addEventListener('pagehide',()=>clearInterval(refresh),{once:true});
}
window.addEventListener('pagehide',()=>clearTimeout(pressTimer),{once:true});
state.ready=true;
document.title='Defense ready';
draw();

if (temporal) requestAnimationFrame(function animate(time) {
  if(timingSamples){if(timingPrevious!==undefined)timingSamples.push(time-timingPrevious);timingPrevious=time;}
  paintFrame();requestAnimationFrame(animate);
});
