import { installCaptureCover } from './capture-cover.js';
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let accepted = 0;
function render() {
  const state = protection.snapshot();
  ctx.fillStyle = state.covered ? '#000' : '#fff'; ctx.fillRect(0, 0, 720, 480);
  if (!state.covered) {
    ctx.fillStyle = '#116456'; ctx.fillRect(40, 200, 180, 70);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('Confirm transfer', 50, 240);
  }
  document.querySelector('#status').textContent = JSON.stringify({ ...state, accepted });
}
const protection = installCaptureCover(document.querySelector('#region'), { onCover: render });
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  if (!protection.snapshot().covered && event.clientX - rect.left >= 40 && event.clientX - rect.left <= 220 && event.clientY - rect.top >= 200 && event.clientY - rect.top <= 270) accepted++;
  render();
});
render();
