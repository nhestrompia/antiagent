import { lockMethods } from './intrinsic-guard.js';
const enabled = new URLSearchParams(location.search).get('guard') !== 'off';
const locks = enabled ? lockMethods([
  { target: CanvasRenderingContext2D.prototype, key: 'fillText' },
  { target: Element.prototype, key: 'attachShadow' },
]) : [];
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let accepted = 0;
function draw() {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 720, 480);
  ctx.fillStyle = '#116456'; ctx.fillRect(40, 200, 180, 70);
  ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('Confirm transfer', 50, 240);
  document.querySelector('#status').textContent = JSON.stringify({ enabled, locks, accepted });
}
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  if (x >= 40 && x <= 220 && y >= 200 && y <= 270) accepted++;
  draw();
});
window.hardeningExperiment = { redraw: draw };
draw();
