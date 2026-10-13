const guard = new URLSearchParams(location.search).get('guard') === 'on';
const threshold = 25;
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const gaps = [], events = [], longTasks = [];
let previous, armed = false, locked = false, accepted = 0;
setTimeout(() => { armed = true; }, 250);
for (const type of ['resize', 'blur', 'focus', 'beforeprint', 'afterprint', 'screenshot', 'beforecapture', 'capturestart']) window.addEventListener(type, () => events.push(type));
document.addEventListener('visibilitychange', () => events.push('visibilitychange'));
canvas.addEventListener('webglcontextlost', () => events.push('webglcontextlost'));
if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list => {
  for (const task of list.getEntries()) longTasks.push({ startTime: task.startTime, duration: task.duration });
}).observe({ type: 'longtask' });
function draw() {
  ctx.fillStyle = locked ? '#000' : '#fff'; ctx.fillRect(0, 0, 720, 480);
  if (!locked) {
    ctx.fillStyle = '#116456'; ctx.fillRect(40, 200, 180, 70);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('Confirm transfer', 50, 240);
  }
  document.querySelector('#status').textContent = JSON.stringify({ guard, armed, locked, accepted });
}
function tick(time) {
  if (armed && previous !== undefined) {
    const gap = time - previous;
    gaps.push(gap);
    if (guard && gap > threshold) locked = true;
  }
  previous = time;
  draw();
  requestAnimationFrame(tick);
}
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  if (!locked && event.clientX - rect.left >= 40 && event.clientX - rect.left <= 220 && event.clientY - rect.top >= 200 && event.clientY - rect.top <= 270) accepted++;
  draw();
});
window.captureTiming = { snapshot: () => ({ guard, threshold, armed, locked, accepted, gaps: [...gaps], events: [...events], longTasks: [...longTasks] }) };
requestAnimationFrame(tick);
