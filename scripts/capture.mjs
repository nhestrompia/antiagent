import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { createInterface } from 'node:readline/promises';
import { hostname, platform, release, cpus } from 'node:os';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const directory = resolve('artifacts', new Date().toISOString().replaceAll(':', '-'));
await mkdir(directory, { recursive: true });
const ignoredDefaultArgs = ['--disable-component-update', '--disable-component-extensions-with-background-pages', '--disable-background-networking', '--no-sandbox'];
const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADLESS === '1', ignoreDefaultArgs: ignoredDefaultArgs });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const client = await page.context().newCDPSession(page);
const runs = [];
const network = [];
const repetitions = Number(process.env.REPETITIONS || 3);
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('REPETITIONS must be an integer from 1 to 10.');
const input = process.env.HUMAN_REVIEW === '1' ? createInterface({ input: process.stdin, output: process.stdout }) : null;
function compareReference(baseline, capture, region, viewportWidth) {
  const scale = capture.width / viewportWidth;
  if (baseline.width !== capture.width || baseline.height !== capture.height) return { error: 'Capture dimensions differ.' };
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
  for (let repetition = 1; repetition <= repetitions; repetition++) {
  let baseline;
  for (const mode of ['baseline', 'native', 'transparent', 'opaque', 'composition']) {
    const prefix = `${repetition}-${mode}`;
    if (mode === 'baseline') await page.evaluate(() => window.antiAgentExperiment.stop());
    await page.evaluate(mode => window.antiAgentExperiment.setMode(mode), mode);
    if (mode === 'native') {
      await page.evaluate(() => window.antiAgentExperiment.start());
      await page.waitForFunction(() => { const state = window.antiAgentExperiment.snapshot().drm; return state.protectedPlayback || ['error', 'unsupported'].includes(state.phase); }, null, { timeout: 45000 }).catch(() => {});
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const run = { repetition, mode, captureMethods: [], before: await page.evaluate(() => window.antiAgentExperiment.snapshot()) };
    if (input) { const answer = await input.question(`${mode}: can you read the reference scene now? [yes/no/unknown] `); run.humanObservation = { at: new Date().toISOString(), readability: answer === 'yes' ? 'readable' : answer === 'no' ? 'unreadable' : 'unknown' }; }
    if (mode === 'composition') run.composition = await page.evaluate(() => window.antiAgentExperiment.compose());
    await page.screenshot({ path: `${directory}/${prefix}-playwright.png` });
    run.captureMethods.push({ method: 'playwright', backend: 'Chrome DevTools Protocol', artifact: `${prefix}-playwright.png`, readability: 'unreviewed' });
    const cdp = await client.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${directory}/${prefix}-cdp.png`, Buffer.from(cdp.data, 'base64'));
    const image = PNG.sync.read(Buffer.from(cdp.data, 'base64'));
    if (mode === 'baseline') baseline = image;
    run.comparison = compareReference(baseline, image, run.before.referenceRegion, run.before.environment.viewport.width);
    run.captureMethods.push({ method: 'cdp', backend: 'Page.captureScreenshot', artifact: `${prefix}-cdp.png`, readability: 'unreviewed' });
    run.canvas = await page.evaluate(() => window.antiAgentExperiment.readback());
    if (run.canvas.ok) { await writeFile(`${directory}/${prefix}-canvas.png`, Buffer.from(run.canvas.dataUrl.split(',')[1], 'base64')); delete run.canvas.dataUrl; }
    if (process.env.NATIVE_CAPTURE === '1' && platform() === 'darwin' && process.env.HEADLESS !== '1') {
      try { execFileSync('/usr/sbin/screencapture', ['-x', `${directory}/${prefix}-macos.png`]); run.captureMethods.push({ method: 'macos', artifact: `${prefix}-macos.png`, readability: 'unreviewed', note: 'Whole display; verify browser visibility and permissions manually.' }); }
      catch (error) { run.captureMethods.push({ method: 'macos', outcome: 'unavailable', reason: error.message }); }
    } else run.captureMethods.push({ method: 'macos', outcome: 'not-run', reason: 'Requires NATIVE_CAPTURE=1, headed macOS, and screen-recording permission.' });
    for (const method of ['chrome-ui', 'tab-capture', 'screen-recording', 'safari']) run.captureMethods.push({ method, outcome: 'not-run', reason: 'Follow the manual capture protocol.' });
    run.after = await page.evaluate(() => window.antiAgentExperiment.snapshot());
    run.conclusion = 'inconclusive';
    runs.push(run);
  }
  }
} finally {
  input?.close();
  await writeFile(`${directory}/report.json`, JSON.stringify({ schemaVersion: 1, environment: { hostname: hostname(), platform: platform(), release: release(), cpu: cpus()[0]?.model, browser: browser.version(), headless: process.env.HEADLESS === '1', ignoredDefaultArgs }, asset: JSON.parse(await readFile('public/drm/asset.json', 'utf8')), runs, network, conclusion: 'inconclusive', note: 'Inspect captures and pair with contemporaneous human observations. Do not infer readability from image differences.' }, null, 2));
  await browser.close();
}
console.log(`Capture artifacts saved to ${directory}`);
