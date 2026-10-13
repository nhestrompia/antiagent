const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const events = [], samples = [], inputs = [];
const guard = new URLSearchParams(location.search).get('guard') === 'on';
let locked = false, accepted = 0;
function dimensions() {
  return { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth,
    viewportWidth: visualViewport?.width, viewportHeight: visualViewport?.height,
    hidden: document.hidden, focused: document.hasFocus(), dpr: devicePixelRatio };
}
function draw() {
  ctx.fillStyle = locked ? '#000' : '#fff'; ctx.fillRect(0, 0, 720, 480);
  if (!locked) {
    ctx.fillStyle = '#116456'; ctx.fillRect(40, 200, 180, 70);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('Confirm transfer', 50, 240);
  }
  document.querySelector('#status').textContent = JSON.stringify({ guard, locked, accepted });
}
let previous = JSON.stringify(dimensions());
function sample(source) {
  const value = dimensions(), serialized = JSON.stringify(value);
  if (serialized !== previous) { samples.push({ source, ...value }); previous = serialized; }
}
for (const name of ['resize', 'blur', 'focus', 'beforeprint', 'afterprint', 'scroll']) window.addEventListener(name, () => { events.push(name); sample(name); });
document.addEventListener('visibilitychange', () => { events.push('visibilitychange'); sample('visibilitychange'); });
visualViewport?.addEventListener('resize', () => { events.push('visualViewport.resize'); sample('visualViewport.resize'); });
const initialWidth = document.documentElement.clientWidth;
new ResizeObserver(() => {
  sample('ResizeObserver');
  if (guard && document.documentElement.clientWidth !== initialWidth) { locked = true; draw(); }
}).observe(document.documentElement);
function poll() { sample('animationFrame'); requestAnimationFrame(poll); }
requestAnimationFrame(poll);
for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown']) canvas.addEventListener(type, event => {
  inputs.push({ type, trusted: event.isTrusted, detail: event.detail, pointerType: event.pointerType,
    pressure: event.pressure, screenX: event.screenX, screenY: event.screenY,
    clientX: event.clientX, clientY: event.clientY, sourceCapabilities: event.sourceCapabilities?.firesTouchEvents,
    fromDebuggerProperty: 'fromDebugger' in event, modifierFromDebugger: event.getModifierState?.('FromDebugger'),
    userActivation: navigator.userActivation.isActive });
});
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  if (!locked && event.clientX - rect.left >= 40 && event.clientX - rect.left <= 220 && event.clientY - rect.top >= 200 && event.clientY - rect.top <= 270) accepted++;
  draw();
});
window.captureSignals = { snapshot: () => ({ dimensions: dimensions(), events: [...events], samples: [...samples], inputs: [...inputs], guard, locked, accepted }), reset: () => { events.length = samples.length = inputs.length = 0; previous = JSON.stringify(dimensions()); } };
draw();
