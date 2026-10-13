import { chromium } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const directory = resolve(process.env.CAPTURE_DIR || `artifacts/protected-ui-${Date.now()}`);
await mkdir(directory, { recursive: true });
const profile = await mkdtemp(resolve(tmpdir(), 'anti-agent-ui-'));
const launchArgs = [`--user-data-dir=${profile}`, '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check'];
const browser = await chromium.launch({ channel: 'chrome', headless: false, ignoreDefaultArgs: true, args: launchArgs });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const client = await page.context().newCDPSession(page);
  await page.goto(process.env.EXPERIMENT_URL || 'http://127.0.0.1:5173/protected-ui.html');
  for (const source of ['clear', 'encrypted']) {
    await page.selectOption('#source', source);
    await page.evaluate(() => window.protectedUIExperiment.start());
    await page.waitForFunction(() => {
      const { activeSource, drm } = window.protectedUIExperiment.snapshot();
      return drm.error || (activeSource === 'encrypted' ? drm.protectedPlayback : drm.playbackVerified);
    });
    const before = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    if (before.drm.error) throw new Error(before.drm.error);
    if (before.drm.encrypted !== (source === 'encrypted')) throw new Error('Playback source does not match the requested control.');
    const semantics = await page.locator('body').ariaSnapshot();
    if (['NORTH-47', 'ALPHA-729', 'Harbor Research'].some(label => semantics.includes(label))) throw new Error('Sensitive reference text leaked into the accessibility snapshot.');
    await writeFile(`${directory}/${source}-accessibility.txt`, semantics);
    for (const fromSurface of [false, true]) {
      const label = fromSurface ? 'surface' : 'view';
      const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface });
      await writeFile(`${directory}/${source}-${label}.png`, Buffer.from(screenshot.data, 'base64'));
    }
    const copy = await page.evaluate(() => {
      const video = document.querySelector('video');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return canvas.toDataURL();
    });
    await writeFile(`${directory}/${source}-copy.png`, Buffer.from(copy.split(',')[1], 'base64'));
    const after = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    results.push({ source, before, after, captureVerdict: 'inspect saved images', sensitiveAccessibilityTextExposed: false });
  }
  await writeFile(`${directory}/report.json`, JSON.stringify({ browser: browser.version(), launchArgs, results, nativeCapture: 'not performed by this adapter', interactive: false }, null, 2));
  console.log(`Saved paired protected-interface captures to ${directory}`);
} finally {
  await browser.close();
  await rm(profile, { recursive: true, force: true });
}
