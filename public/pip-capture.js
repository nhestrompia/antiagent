const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
context.fillStyle = '#fff'; context.fillRect(0, 0, 720, 480);
context.fillStyle = '#116456'; context.fillRect(40, 200, 180, 70);
context.fillStyle = '#fff'; context.font = '18px sans-serif'; context.fillText('Confirm transfer', 50, 240);
const state = { supported: 'documentPictureInPicture' in window, opened: false, accepted: 0 };
const update = () => { document.querySelector('#status').textContent = JSON.stringify(state); };
canvas.addEventListener('click', event => {
  if (event.offsetX >= 40 && event.offsetX <= 220 && event.offsetY >= 200 && event.offsetY <= 270) state.accepted++;
  update();
});
document.querySelector('#open').addEventListener('click', async () => {
  try {
    const pip = await documentPictureInPicture.requestWindow({ width: 760, height: 520 });
    pip.document.title = 'Anti-Agent PiP surface';
    pip.document.body.append(canvas);
    state.opened = true;
    pip.addEventListener('pagehide', () => { document.body.append(canvas); state.opened = false; update(); });
  } catch (error) { state.error = error.message; }
  update();
});
update();
