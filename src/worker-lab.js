const canvas = document.querySelector('canvas');
const worker = new Worker(new URL('./worker-renderer.js', import.meta.url), { type: 'module' });
const surface = canvas.transferControlToOffscreen();
worker.postMessage({ kind: 'initialize', surface }, [surface]);
worker.addEventListener('message', event => { document.querySelector('#status').textContent = JSON.stringify(event.data); });
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  worker.postMessage({ kind: 'pointer', x: (event.clientX - rect.left) * 720 / rect.width, y: (event.clientY - rect.top) * 480 / rect.height });
});
canvas.addEventListener('keydown', event => {
  if (event.key === 'Enter') worker.postMessage({ kind: 'pointer', x: 130, y: 235 });
});
