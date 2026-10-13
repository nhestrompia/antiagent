const mode = new URLSearchParams(location.search).get('mode') || 'opacity';
const canvas = document.querySelector('canvas');
const decoy = document.querySelector('#decoy');
if (mode === 'hidden') decoy.style.display = 'none';
if (mode === 'off') decoy.remove();
const ctx = canvas.getContext('2d');
let locked = false, accepted = 0, decoyHits = 0;
const events = [];
for (const name of ['blur', 'focus', 'resize', 'beforeprint', 'afterprint']) {
  window.addEventListener(name, () => events.push(name));
}
document.addEventListener('visibilitychange', () => events.push(`visibility:${document.visibilityState}`));
function draw() {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 720, 480);
  ctx.fillStyle = locked ? '#333' : '#116456'; ctx.fillRect(40, 200, 180, 70);
  ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
  ctx.fillText(locked ? 'Session locked' : 'Confirm transfer', 50, 240);
  document.querySelector('#status').textContent = JSON.stringify({ mode, locked, accepted, decoyHits });
}
function activate() { if (!locked) accepted++; draw(); }
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 720 / rect.width;
  const y = (event.clientY - rect.top) * 480 / rect.height;
  if (x >= 40 && x <= 220 && y >= 200 && y <= 270) activate();
});
canvas.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
});
decoy.addEventListener('click', () => { locked = true; decoyHits++; draw(); });
window.decoyExperiment = { snapshot: () => ({ mode, locked, accepted, decoyHits, events: [...events] }) };
draw();
