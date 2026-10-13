import { inspectAPIs } from 'anti-agent-gate';
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let accepted = 0;
let gate = inspectAPIs();
function draw() {
  ctx.fillStyle = gate.allowed ? '#fff' : '#000'; ctx.fillRect(0, 0, 720, 480);
  if (gate.allowed) {
    ctx.fillStyle = '#116456'; ctx.fillRect(40, 200, 180, 70);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('Confirm transfer', 50, 240);
  }
  document.querySelector('#status').textContent = JSON.stringify({ gate, accepted });
}
canvas.addEventListener('click', event => {
  if (!gate.allowed) return;
  gate = inspectAPIs();
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  if (gate.allowed && x >= 40 && x <= 220 && y >= 200 && y <= 270) accepted++;
  draw();
});
draw();
