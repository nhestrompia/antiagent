import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { createInterface } from 'node:readline/promises';
import { hostname, platform, release, cpus } from 'node:os';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { classifyVideoPattern } from './capture-metrics.mjs';
import { captureExperimentTab } from './tab-capture.mjs';

const directory = process.env.CAPTURE_DIR ? resolve(process.env.CAPTURE_DIR) : resolve('artifacts', new Date().toISOString().replaceAll(':', '-'));
await mkdir(directory, { recursive: true });
const ignoredDefaultArgs = ['--disable-component-update', '--disable-component-extensions-with-background-pages', '--disable-background-networking', '--no-sandbox'];
const launchArgs = process.env.TAB_CAPTURE === '1' ? ['--auto-select-tab-capture-source-by-title=Anti-Agent capture experiment', '--auto-accept-this-tab-capture'] : [];
const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADLESS === '1', ignoreDefaultArgs: ignoredDefaultArgs, args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const client = await page.context().newCDPSession(page);
const runs = [];
const network = [];
let tabCaptureUnavailable = null;
const repetitions = Number(process.env.REPETITIONS || 3);
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('REPETITIONS must be an integer from 1 to 10.');
const input = process.env.HUMAN_REVIEW === '1' ? createInterface({ input: process.stdin, output: process.stdout }) : null;
function compareReference(baseline, capture, region, viewportWidth) {
  const scale = capture.width / viewportWidth;
  if (baseline.width !== capture.width) return { error: 'Capture widths differ.' };
  if (region.x < 0 || region.y < 0 || (region.x + region.width) * scale > capture.width || (region.y + region.height) * scale > Math.min(capture.height, baseline.height)) return { error: 'Reference region is not fully present in both captures.' };
  let total = 0, changed = 0, pixels = 0;
  for (let y = Math.ceil(region.y * scale); y < Math.floor((region.y + region.height) * scale) && y < capture.height; y++) {
    for (let x = Math.ceil(region.x * scale); x < Math.floor((region.x + region.width) * scale) && x < capture.width; x++) {
      let difference = 0;
      for (let channel = 0; channel < 3; channel++) difference += Math.abs(baseline.data[(y * capture.width + x) * 4 + channel] - capture.data[(y * capture.width + x) * 4 + channel]);
      total += difference; pixels++; if (difference / 3 > 8) changed++;
    }
  }
  return { meanAbsoluteChannelDifference: total / (pixels * 3), changedPixelFraction: changed / pixels, pixelsCompared: pixels, note: 'Image difference is not a readability verdict.' };
}
page.on('response', response => { network.push({ url: response.url().split('?')[0], status: response.status(), fromServiceWorker: response.fromServiceWorker() }); });
try {
  await page.goto(process.env.EXPERIMENT_URL || 'http://127.0.0.1:5173');
  await page.waitForFunction(() => Boolean(window.antiAgentExperiment));
  const support = await page.evaluate(() => window.antiAgentExperiment.probe());
  await writeFile(`${directory}/robustness.json`, JSON.stringify(support, null, 2));
  if (process.env.ROBUSTNESS) await page.selectOption('#robustness', process.env.ROBUSTNESS);
  await page.selectOption('#asset', process.env.ASSET || 'control');
  for (let repetition = 1; repetition <= repetitions; repetition++) {
  let baseline;
  let tabBaseline;
  for (const mode of ['baseline', 'native', 'transparent', 'opaque', 'composition']) {
    const prefix = `${repetition}-${mode}`;
    if (mode === 'baseline') await page.evaluate(() => window.antiAgentExperiment.stop());
    await page.evaluate(mode => window.antiAgentExperiment.setMode(mode), mode);
    if (mode === 'native') {
      await page.evaluate(() => window.antiAgentExperiment.start());
      await page.waitForFunction(() => { const state = window.antiAgentExperiment.snapshot().drm; return (state.encryptionExpected ? state.protectedPlayback : state.playbackVerified) || ['error', 'unsupported'].includes(state.phase); }, null, { timeout: 45000 }).catch(() => {});
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const run = { repetition, mode, captureMethods: [], before: await page.evaluate(() => window.antiAgentExperiment.snapshot()) };
    if (input) {
      const answer = await input.question(`${mode}: can you read the reference scene now? [yes/no/unknown] `);
      const videoAnswer = await input.question(`${mode}: does the LIVE video show red/green/blue/yellow quadrants? [yes/black/unknown] `);
      run.humanObservation = { at: new Date().toISOString(), readability: answer === 'yes' ? 'readable' : answer === 'no' ? 'unreadable' : 'unknown', videoAppearance: videoAnswer === 'yes' ? 'pattern-visible' : videoAnswer === 'black' ? 'black' : 'unknown' };
    }
    if (mode === 'composition') run.composition = await page.evaluate(() => window.antiAgentExperiment.compose());
    await page.screenshot({ path: `${directory}/${prefix}-playwright.png` });
    run.captureMethods.push({ method: 'playwright', backend: 'Chrome DevTools Protocol', artifact: `${prefix}-playwright.png`, readability: 'unreviewed' });
    const cdp = await client.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${directory}/${prefix}-cdp.png`, Buffer.from(cdp.data, 'base64'));
    const image = PNG.sync.read(Buffer.from(cdp.data, 'base64'));
    if (mode === 'baseline') baseline = image;
    run.comparison = compareReference(baseline, image, run.before.referenceRegion, run.before.environment.viewport.width);
    run.captureMethods.push({ method: 'cdp', backend: 'Page.captureScreenshot', artifact: `${prefix}-cdp.png`, readability: 'unreviewed' });
    for (const capture of run.captureMethods) {
      const validPlayback = run.before.drm.encryptionExpected ? run.before.drm.protectedPlayback : run.before.drm.playbackVerified;
      if (run.before.media.asset?.pattern !== 'red-green-blue-yellow-quadrants') capture.videoMeasurement = { appearance: 'not-a-colored-control' };
      else if (!validPlayback || run.before.videoHidden) capture.videoMeasurement = { appearance: 'unvalidated-playback' };
      else if (run.before.videoOpacity < 0.999) capture.videoMeasurement = { appearance: 'not-assessable-transparent' };
      else {
        const png = capture.method === 'cdp' ? image : PNG.sync.read(await readFile(`${directory}/${capture.artifact}`));
        capture.videoMeasurement = classifyVideoPattern(png, run.before.videoRegion, run.before.environment.viewport.width);
      }
    }
    if (run.composition?.readback?.ok) {
      const pixels = PNG.sync.read(Buffer.from(run.composition.readback.dataUrl.split(',')[1], 'base64'));
      run.composition.patternMeasurement = classifyVideoPattern(pixels, { x: 0, y: 0, width: pixels.width, height: pixels.height }, pixels.width);
      await writeFile(`${directory}/${prefix}-copied-video.png`, PNG.sync.write(pixels));
      delete run.composition.readback.dataUrl;
    }
    run.canvas = await page.evaluate(() => window.antiAgentExperiment.readback());
    if (run.canvas.ok) { await writeFile(`${directory}/${prefix}-canvas.png`, Buffer.from(run.canvas.dataUrl.split(',')[1], 'base64')); delete run.canvas.dataUrl; }
    if (process.env.NATIVE_CAPTURE === '1' && platform() === 'darwin' && process.env.HEADLESS !== '1') {
      try { execFileSync('/usr/sbin/screencapture', ['-x', `${directory}/${prefix}-macos.png`]); run.captureMethods.push({ method: 'macos', artifact: `${prefix}-macos.png`, readability: 'unreviewed', note: 'Whole display; verify browser visibility and permissions manually.' }); }
      catch (error) { run.captureMethods.push({ method: 'macos', outcome: 'unavailable', reason: error.message }); }
    } else run.captureMethods.push({ method: 'macos', outcome: 'not-run', reason: 'Requires NATIVE_CAPTURE=1, headed macOS, and screen-recording permission.' });
    if (process.env.TAB_CAPTURE === '1') {
      const skipped = Boolean(tabCaptureUnavailable);
      if (!skipped) await page.bringToFront();
      const capture = tabCaptureUnavailable || await captureExperimentTab(page);
      if (capture.available) {
        const tabImage = PNG.sync.read(Buffer.from(capture.frameDataUrl.split(',')[1], 'base64'));
        await writeFile(`${directory}/${prefix}-tab.png`, PNG.sync.write(tabImage));
        await writeFile(`${directory}/${prefix}-tab-recording.webm`, Buffer.from(capture.recordingDataUrl.split(',')[1], 'base64'));
        if (mode === 'baseline') tabBaseline = tabImage;
        const validPlayback = capture.snapshot.drm.encryptionExpected ? capture.snapshot.drm.protectedPlayback : capture.snapshot.drm.playbackVerified;
        const measurement = !validPlayback || capture.snapshot.videoHidden ? { appearance: 'unvalidated-playback' } : capture.snapshot.videoOpacity < 0.999 ? { appearance: 'not-assessable-transparent' } : classifyVideoPattern(tabImage, capture.snapshot.videoRegion, capture.snapshot.environment.viewport.width);
        run.captureMethods.push({ method: 'tab-capture', backend: 'getDisplayMedia(browser)', artifact: `${prefix}-tab.png`, settings: capture.settings, videoMeasurement: measurement, referenceComparison: tabBaseline ? compareReference(tabBaseline, tabImage, capture.snapshot.referenceRegion, capture.snapshot.environment.viewport.width) : null, snapshot: capture.snapshot, after: capture.after });
        const recording = { method: 'tab-recording', artifact: `${prefix}-tab-recording.webm`, mimeType: capture.recordingMimeType, durationMs: capture.recordingDurationMs, outcome: 'recorded', source: 'experiment browser tab' };
        try {
          execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', `${directory}/${recording.artifact}`, '-frames:v', '1', `${directory}/${prefix}-recording-frame.png`]);
          const recordedImage = PNG.sync.read(await readFile(`${directory}/${prefix}-recording-frame.png`));
          recording.decodedFrameArtifact = `${prefix}-recording-frame.png`;
          recording.videoMeasurement = !validPlayback || capture.snapshot.videoHidden ? { appearance: 'unvalidated-playback' } : capture.snapshot.videoOpacity < 0.999 ? { appearance: 'not-assessable-transparent' } : classifyVideoPattern(recordedImage, capture.snapshot.videoRegion, capture.snapshot.environment.viewport.width);
          recording.referenceComparison = tabBaseline ? compareReference(tabBaseline, recordedImage, capture.snapshot.referenceRegion, capture.snapshot.environment.viewport.width) : null;
        } catch (error) { recording.frameReviewError = error.message; }
        run.captureMethods.push(recording);
      } else {
        tabCaptureUnavailable = capture;
        run.captureMethods.push({ method: 'tab-capture', outcome: skipped ? 'not-run' : 'unavailable', stage: capture.stage, reason: capture.error, ...(skipped ? { blockedBy: 'tab-capture baseline failed in this session' } : {}) });
      }
    } else run.captureMethods.push({ method: 'tab-capture', outcome: 'not-run', reason: 'Set TAB_CAPTURE=1 for isolated experiment-tab capture and recording.' });
    for (const method of ['chrome-ui', 'screen-recording', 'safari']) run.captureMethods.push({ method, outcome: 'not-run', reason: 'Follow the manual capture protocol.' });
    run.after = await page.evaluate(() => window.antiAgentExperiment.snapshot());
    run.conclusion = 'inconclusive';
    runs.push(run);
  }
  }
} finally {
  input?.close();
  const asset = runs[0]?.before.configuration.asset;
  const assetMetadata = asset?.metadataPath ? JSON.parse(await readFile(`public${asset.metadataPath}`, 'utf8')) : null;
  await writeFile(`${directory}/report.json`, JSON.stringify({ schemaVersion: 2, environment: { hostname: hostname(), platform: platform(), release: release(), cpu: cpus()[0]?.model, browser: browser.version(), headless: process.env.HEADLESS === '1', ignoredDefaultArgs, launchArgs }, asset, assetMetadata, runs, network, conclusion: 'inconclusive', note: 'Inspect both video and canvas separately. Black video replacement needs contemporaneous human confirmation of visible colored frames. Do not infer readability from image differences.' }, null, 2));
  if (process.env.KEEP_OPEN === '1') {
    await page.evaluate(() => window.antiAgentExperiment.setMode('native'));
    await page.bringToFront();
    console.log('Isolated Chrome is open for computer-use inspection. Close the browser to end this session.');
    await new Promise(resolve => browser.on('disconnected', resolve));
  } else await browser.close();
}
console.log(`Capture artifacts saved to ${directory}`);
