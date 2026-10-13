const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const state = { covered: false, reasons: [], accepted: 0 };
const update = () => { document.querySelector('#status').textContent = JSON.stringify(state); };
context.fillStyle = '#fff'; context.fillRect(0, 0, 720, 480);
context.fillStyle = '#116456'; context.fillRect(40, 200, 180, 70);
context.fillStyle = '#fff'; context.font = '18px sans-serif'; context.fillText('Confirm transfer', 50, 240);
function cover(reason) {
  if (state.covered) return;
  state.covered = true; state.reasons.push(reason);
  context.fillStyle = '#000'; context.fillRect(0, 0, 720, 480); update();
}
const sentinel = document.querySelector('input');
new MutationObserver(() => {
  if (sentinel.style.getPropertyValue('caret-color') === 'transparent') cover('caret-style-change');
}).observe(sentinel, { attributes: true, attributeFilter: ['style'] });
const animation = sentinel.animate([{ opacity: 1 }, { opacity: 0.9 }], { duration: 10000, iterations: Infinity });
animation.addEventListener('cancel', () => cover('animation-cancel'));
canvas.addEventListener('click', event => {
  if (!state.covered && event.offsetX >= 40 && event.offsetX <= 220 && event.offsetY >= 200 && event.offsetY <= 270) state.accepted++;
  update();
});
update();
