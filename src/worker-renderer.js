let ctx;
let accepted = 0;
const choices = ['Harbor Research', 'North Labs', 'West Studio'];
const offset = crypto.getRandomValues(new Uint32Array(1))[0] % 3;
const layout = [...choices.slice(offset), ...choices.slice(0, offset)];
function draw() {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 720, 480);
  for (let slot = 0; slot < 3; slot++) {
    ctx.fillStyle = '#116456'; ctx.fillRect(40 + slot * 230, 200, 180, 70);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText(layout[slot], 50 + slot * 230, 240);
  }
  postMessage({ ready: true, accepted });
}
self.addEventListener('message', event => {
  if (event.data.kind === 'initialize') { ctx = event.data.surface.getContext('2d'); draw(); }
  else if (event.data.kind === 'pointer') {
    const { x, y } = event.data;
    const slot = [0, 1, 2].find(slot => x >= 40 + slot * 230 && x <= 220 + slot * 230 && y >= 200 && y <= 270);
    if (slot !== undefined && layout[slot] === choices[0]) accepted++;
    draw();
  }
});
