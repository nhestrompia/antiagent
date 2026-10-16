const canvas = document.querySelector('canvas'), context = canvas.getContext('2d');
const state = { ready: false, accepted: 0, exports: {} };
const update = () => { document.querySelector('#status').textContent = JSON.stringify(state); };
function attempt(name, operation) {
  try { operation(); state.exports[name] = 'allowed'; }
  catch (error) { state.exports[name] = error.name; }
}
try {
  const image = new Image();
  if (new URLSearchParams(location.search).get('cors') === 'on') image.crossOrigin = 'anonymous';
  const marker = new URL('/origin-marker.svg', location.href);
  marker.hostname = location.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1';
  image.src = marker.href; await image.decode(); context.drawImage(image, 0, 0);
  context.fillStyle = '#fff'; context.fillRect(0, 0, 720, 480);
  context.fillStyle = '#116456'; context.fillRect(40, 200, 180, 70);
  context.fillStyle = '#fff'; context.font = '18px sans-serif'; context.fillText('Confirm transfer', 50, 240);
  attempt('getImageData', () => context.getImageData(0, 0, 1, 1));
  attempt('toDataURL', () => canvas.toDataURL());
  attempt('captureStream', () => { const stream = canvas.captureStream(); stream.getTracks().forEach(track => track.stop()); });
  state.ready = true;
} catch (error) { state.initializationError = error.message; }
canvas.addEventListener('click', event => {
  if (event.offsetX >= 40 && event.offsetX <= 220 && event.offsetY >= 200 && event.offsetY <= 270) state.accepted++;
  update();
});
update();
