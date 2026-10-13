import './style.css';
import { drawReference, readCanvas, copyVideo } from './canvas.js';
import { DRMRuntime, publicAsset, sintelAsset } from './drm.js';

const $ = id => document.getElementById(id);
const reference = $('reference');
const video = $('drm-video');
drawReference(reference);
$('manifest').value = publicAsset.manifestUrl;
$('license').value = publicAsset.licenseServerUrl;
let mode = 'baseline';
let opacity = 0.01;
let busy = false;
const events = [];
const observations = [];
let recorder;
let recordingStream;
let recordingChunks = [];
let recordingStarted;
const runtime = new DRMRuntime(video, state => {
  $('status').textContent = state.protectedPlayback ? 'Protected playback observed · capture protection unknown' : `${state.phase} · capture protection unknown`;
  $('diagnostics').textContent = JSON.stringify(state, null, 2);
});

function record(type, detail) { events.push({ at: new Date().toISOString(), type, detail }); }
function message(text) { $('message').textContent = text; }
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function setMode(next, nextOpacity = next === 'opaque' ? 1 : 0.01) {
  if (!['baseline', 'native', 'transparent', 'opaque', 'composition'].includes(next)) throw new Error('Unknown experiment mode.');
  if (!Number.isFinite(nextOpacity) || nextOpacity < 0 || nextOpacity > 1) throw new Error('Opacity must be between 0 and 1.');
  mode = next; opacity = nextOpacity;
  $('mode').value = mode; $('opacity').value = opacity;
  video.hidden = mode === 'baseline';
  video.style.width = ['transparent', 'opaque'].includes(mode) ? '100vw' : `${video.videoWidth || 320}px`;
  video.style.height = ['transparent', 'opaque'].includes(mode) ? '100vh' : `${video.videoHeight || 180}px`;
  video.style.opacity = ['native', 'composition'].includes(mode) ? '1' : String(opacity);
  $('composition').hidden = mode !== 'composition';
  record('configuration', { mode, opacity });
}
video.addEventListener('loadedmetadata', () => setMode(mode, opacity));
async function start() {
  if (busy) return;
  busy = true; $('start').disabled = true;
  try {
    if (mode === 'baseline') setMode('native');
    const config = { manifestUrl: $('manifest').value, licenseServerUrl: $('license').value, headers: JSON.parse($('headers').value), encryptedStart: Number($('encrypted-start').value) };
    record('start', { asset: config.manifestUrl === publicAsset.manifestUrl ? publicAsset.name : 'Custom media' });
    await runtime.start(config);
    if (runtime.state.error) message(runtime.state.error);
  } catch (error) { message(error.message); record('configuration-error', error.message); }
  finally { busy = false; $('start').disabled = false; }
}
async function stop() {
  if (busy) { message('Playback initialization is still running. Escape will reveal the page; retry Stop once initialization ends.'); setMode('baseline'); return; }
  await runtime.stop(); setMode('baseline'); record('stop', {});
}
function snapshot() {
  return {
    schemaVersion: 1, at: new Date().toISOString(), configuration: { mode, opacity, encryptedStart: Number($('encrypted-start').value), asset: [publicAsset, sintelAsset].find(asset => asset.manifestUrl === $('manifest').value) || { name: 'Custom media', tinyAsset: null }, headersProvided: $('headers').value !== '{}' },
    environment: { userAgent: navigator.userAgent, secureContext: isSecureContext, viewport: { width: innerWidth, height: innerHeight }, devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency },
    drm: { ...runtime.state }, media: { timeAdvanceSamples: runtime.frames, decodedFrames: video.getVideoPlaybackQuality?.().totalVideoFrames ?? null, stats: runtime.stats() },
    referenceRegion: reference.getBoundingClientRect().toJSON(),
    resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name.split('?')[0], initiatorType: entry.initiatorType, duration: entry.duration, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize })),
    observations: structuredClone(observations), events: structuredClone(events), conclusion: 'inconclusive',
    limitations: ['Capture results require artifact inspection and contemporaneous human observation.', 'Cross-origin transfer sizes may be zero without Timing-Allow-Origin.', 'Public development licensing is not suitable for production use.', 'Encrypted start time for custom media must be verified independently.'],
  };
}
function readback() { const result = readCanvas(reference); record('canvas-readback', { ...result, dataUrl: undefined }); return result; }
function compose() { const result = copyVideo(video, $('composition')); record('composition', { ...result, readback: result.readback ? { ...result.readback, dataUrl: undefined } : undefined }); return result; }

$('mode').addEventListener('change', () => { setMode($('mode').value); if (mode === 'baseline') void runtime.stop(); });
$('asset').addEventListener('change', () => { const asset = $('asset').value === 'tiny' ? publicAsset : sintelAsset; $('manifest').value = asset.manifestUrl; $('license').value = asset.licenseServerUrl; $('encrypted-start').value = asset.encryptedStart; message('Asset selected. Restart playback to apply it.'); });
$('opacity').addEventListener('change', () => { try { setMode(mode, Number($('opacity').value)); } catch (error) { message(error.message); } });
$('start').addEventListener('click', start);
$('stop').addEventListener('click', stop);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { setMode('baseline'); void stop(); } });
$('readback').addEventListener('click', () => { const result = readback(); message(result.ok ? `Reference canvas is readable by JavaScript. Checksum: ${result.checksum}` : result.error); });
$('copy').addEventListener('click', () => { const result = compose(); message(result.drawSucceeded ? 'Copy attempted. Inspect the copy and exported pixels; a successful draw can still produce black pixels.' : result.error); });
$('remove').addEventListener('click', () => { video.remove(); runtime.sample(); record('remove-video', {}); });
$('observe').addEventListener('click', () => { observations.push({ at: new Date().toISOString(), mode, opacity, humanReadability: $('human').value, drm: { ...runtime.state } }); message('Observation recorded for the current configuration.'); });
$('export').addEventListener('click', () => download(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }), `anti-agent-${Date.now()}.json`));
$('display').addEventListener('click', async () => {
  try {
    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) throw new Error('Display capture or recording is unavailable.');
    recordingStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    recordingChunks = []; recordingStarted = new Date().toISOString();
    recorder = new MediaRecorder(recordingStream);
    recorder.ondataavailable = event => { if (event.data.size) recordingChunks.push(event.data); };
    recorder.onstop = () => {
      download(new Blob(recordingChunks, { type: recorder.mimeType }), `anti-agent-recording-${Date.now()}.webm`);
      recordingStream.getTracks().forEach(track => track.stop());
      record('display-recording', { startedAt: recordingStarted, endedAt: new Date().toISOString(), surface: recordingStream.getVideoTracks()[0].getSettings().displaySurface, mimeType: recorder.mimeType });
      $('display').disabled = false; $('end-recording').disabled = true;
    };
    recordingStream.getVideoTracks()[0].addEventListener('ended', () => { if (recorder.state !== 'inactive') recorder.stop(); });
    recorder.start(); $('display').disabled = true; $('end-recording').disabled = false;
    message('Recording. Observe the reference scene, then finish recording and export the report.');
  } catch (error) { message(error.message); record('display-capture-unavailable', error.message); }
});
$('end-recording').addEventListener('click', () => { if (recorder?.state !== 'inactive') recorder.stop(); });

window.antiAgentExperiment = { setMode, start, stop, snapshot, readback, compose };
const params = new URLSearchParams(location.search);
setMode(params.get('mode') || 'baseline');
if (params.get('manifest')) $('manifest').value = params.get('manifest');
if (params.get('license')) $('license').value = params.get('license');
