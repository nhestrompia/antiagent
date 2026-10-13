import { DRMRuntime, publicAsset } from './drm.js';

const video = document.querySelector('#video');
const source = document.querySelector('#source');
const startButton = document.querySelector('#start');
let activeSource = null;
const runtime = new DRMRuntime(video, state => {
  document.querySelector('#status').textContent = JSON.stringify({ activeSource, ...state }, null, 2);
});
async function start() {
  startButton.disabled = true;
  activeSource = source.value;
  try {
    await runtime.start({
      manifestUrl: new URL(`/drm-ui/${activeSource === 'encrypted' ? 'encrypted-video.mpd' : 'clear-video.mp4'}`, location.origin).href,
      licenseServerUrl: publicAsset.licenseServerUrl,
      headers: {}, encryptedStart: 0, robustness: 'SW_SECURE_DECODE', encrypted: activeSource === 'encrypted', maxVideoHeight: 480,
    });
  } finally { startButton.disabled = false; }
}
startButton.addEventListener('click', start);
document.querySelector('#stop').addEventListener('click', () => runtime.stop());
window.protectedUIExperiment = { start, stop: () => runtime.stop(), snapshot: () => ({ activeSource, drm: { ...runtime.state }, videoRegion: video.getBoundingClientRect().toJSON() }) };
