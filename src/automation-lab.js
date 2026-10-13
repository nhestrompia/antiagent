import { drawReference } from './canvas.js';

const policy = new URLSearchParams(location.search).get('policy') || 'combined';
if (!['webdriver', 'trusted', 'activation', 'combined'].includes(policy)) throw new Error('Unknown experimental policy.');
const scene = document.querySelector('#scene');
const checksDriver = policy === 'webdriver' || policy === 'combined';
const checksTrust = policy === 'trusted' || policy === 'combined';
const checksActivation = policy === 'activation' || policy === 'combined';
const refused = checksDriver && navigator.webdriver === true;
const events = [];
let acceptedActions = 0;
if (refused) {
  scene.width = 720; scene.height = 480;
  const ctx = scene.getContext('2d');
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 720, 480);
} else { drawReference(scene); }
function snapshot() {
  return { policy, webdriver: navigator.webdriver, contentRefused: refused, acceptedActions, events: structuredClone(events) };
}
function update() { document.querySelector('#status').textContent = JSON.stringify(snapshot(), null, 2); }
scene.addEventListener('click', event => {
  const rect = scene.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 720 / rect.width;
  const y = (event.clientY - rect.top) * 480 / rect.height;
  const trusted = event.isTrusted;
  const activation = navigator.userActivation.isActive;
  const hit = x >= 36 && x <= 336 && y >= 224 && y <= 280;
  const accepted = !refused && hit && (!checksTrust || trusted) && (!checksActivation || activation);
  if (accepted) acceptedActions++;
  events.push({ trusted, activation, hit, accepted });
  update();
});
window.automationLab = { snapshot };
update();
