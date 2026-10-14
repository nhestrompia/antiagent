import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchChromeWithoutOverrides } from './chrome-no-overrides.mjs';
import { PNG } from 'pngjs';
await mkdir('artifacts/compositor-observers', { recursive: true });
const results = []; let version;
for (const operation of ['idle', 'capture-series', 'ui-longtask']) for (let repetition = 0; repetition < 3; repetition++) {
  const { browser, close } = await launchChromeWithoutOverrides();
  try {
    version = browser.version(); const context = browser.contexts()[0], page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/capture-policy.html');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(500);
    const setup = await page.evaluate(() => {
      const state = { supported: PerformanceObserver.supportedEntryTypes, observers: [], entries: [], events: [], failedTypes: [], started: performance.now() };
      const save = entry => state.entries.push({ entryType: entry.entryType, name: entry.name, startTime: entry.startTime, duration: entry.duration, blockingDuration: entry.blockingDuration });
      for (const type of state.supported) {
        try {
          const observer = new PerformanceObserver(list => list.getEntries().forEach(save));
          observer.observe(type === 'event' ? { type, buffered: false, durationThreshold: 16 } : { type, buffered: false });
          state.observers.push(observer);
        } catch (error) { state.failedTypes.push({ type, error: error.message }); }
      }
      for (const type of ['visibilitychange', 'freeze', 'resume', 'beforeprint', 'afterprint']) document.addEventListener(type, () => state.events.push({ type, time: performance.now() }));
      for (const type of ['resize', 'focus', 'blur', 'pageshow', 'pagehide']) window.addEventListener(type, () => state.events.push({ type, time: performance.now() }));
      window.compositorProbe = state;
      return { supported: state.supported, failedTypes: state.failedTypes, hidden: document.hidden };
    });
    assert.equal(setup.hidden, false);
    assert(setup.supported.includes('longtask'));
    assert.deepEqual(setup.failedTypes, []);
    let savedCaptureReferencePixels;
    let savedCaptureBytes;
    if (operation === 'capture-series') {
      const client = await context.newCDPSession(page);
      for (let capture = 0; capture < 10; capture++) {
        const screenshot = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
        if (capture === 0) {
          const bytes = Buffer.from(screenshot.data, 'base64');
          await writeFile(`artifacts/compositor-observers/${repetition}.png`, bytes);
          savedCaptureBytes = bytes;
        }
      }
    } else if (operation === 'ui-longtask') {
      await page.evaluate(() => new Promise(resolve => setTimeout(() => {
        const end = performance.now() + 90;
        while (performance.now() < end) {}
        resolve();
      }, 0)));
    } else await page.waitForTimeout(500);
    await page.waitForTimeout(100);
    const probe = await page.evaluate(() => {
      const state = window.compositorProbe;
      for (const observer of state.observers) {
        for (const entry of observer.takeRecords()) state.entries.push({ entryType: entry.entryType, name: entry.name, startTime: entry.startTime, duration: entry.duration, blockingDuration: entry.blockingDuration });
        observer.disconnect();
      }
      return { entries: state.entries, events: state.events, observedDuration: performance.now() - state.started, hidden: document.hidden };
    });
    if (operation === 'ui-longtask') assert(probe.entries.some(entry => entry.entryType === 'longtask' && entry.duration >= 50));
    if (savedCaptureBytes) {
      const image = PNG.sync.read(savedCaptureBytes); savedCaptureReferencePixels = 0;
      for (let p = 0; p < image.data.length; p += 4) if (image.data[p] < 70 && image.data[p + 1] > 70 && image.data[p + 1] < 140 && image.data[p + 2] > 50 && image.data[p + 2] < 120) savedCaptureReferencePixels++;
      assert(savedCaptureReferencePixels > 1000);
    }
    const rect = await page.locator('canvas').boundingBox();
    await page.mouse.click(rect.x + 130, rect.y + 235);
    const accepted = JSON.parse(await page.locator('#status').textContent()).accepted; assert.equal(accepted, 1);
    results.push({ operation, repetition, setup, probe, accepted, savedCaptureReferencePixels });
  } catch (error) { results.push({ operation, repetition, failed: error.message }); }
  finally { await close(); }
}
await writeFile('docs/compositor-observer-results.json', JSON.stringify({ browser: version, results }, null, 2));
console.log(JSON.stringify(results.map(({ operation, repetition, failed, probe }) => ({ operation, repetition, failed, entries: probe?.entries.map(entry => ({ type: entry.entryType, duration: entry.duration })), events: probe?.events }))));
if (results.some(result => result.failed)) throw new Error('An observer/capture case did not complete');
