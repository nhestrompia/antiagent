import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
await mkdir('artifacts/capture-timing', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
try {
  for (const guard of ['off', 'on']) for (const operation of ['idle', 'screenshot', 'ui-work']) for (let repetition = 0; repetition < 12; repetition++) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.goto(`http://127.0.0.1:5173/capture-timing.html?guard=${guard}`);
    await page.waitForFunction(() => window.captureTiming.snapshot().armed);
    const before = await page.evaluate(() => window.captureTiming.snapshot());
    let capturedBlack = null;
    if (operation === 'screenshot') {
      const client = await page.context().newCDPSession(page);
      const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      const bytes = Buffer.from(capture.data, 'base64');
      await writeFile(`artifacts/capture-timing/${guard}-${repetition}.png`, bytes);
      const image = PNG.sync.read(bytes), scale = image.height / 800;
      const p = (Math.round(310 * scale) * image.width + Math.round(100 * scale)) * 4;
      capturedBlack = [...image.data.slice(p, p + 3)].every(channel => channel < 20);
    } else if (operation === 'ui-work') await page.evaluate(() => {
      const end = performance.now() + 45;
      // Simulates ordinary synchronous application work, independently of capture.
      while (performance.now() < end) {}
    });
    await page.waitForTimeout(150);
    const afterObservation = await page.evaluate(() => window.captureTiming.snapshot());
    const rect = await page.locator('canvas').boundingBox();
    await page.mouse.click(rect.x + 130, rect.y + 235);
    const afterInput = await page.evaluate(() => window.captureTiming.snapshot());
    if (guard === 'off') assert.equal(afterInput.accepted, 1);
    results.push({ guard, operation, repetition, lockedBefore: before.locked, lockedAfter: afterObservation.locked,
      capturedBlack, accepted: afterInput.accepted, gaps: afterObservation.gaps.slice(before.gaps.length),
      events: afterObservation.events.slice(before.events.length), longTasks: afterObservation.longTasks.slice(before.longTasks.length) });
    await page.close();
  }
  await writeFile('docs/capture-timing-results.json', JSON.stringify({ browser: browser.version(), thresholdMs: 25, results }, null, 2));
  for (const guard of ['off', 'on']) for (const operation of ['idle', 'screenshot', 'ui-work']) {
    const group = results.filter(result => result.guard === guard && result.operation === operation);
    console.log(JSON.stringify({ guard, operation, cases: group.length, lockedBefore: group.filter(result => result.lockedBefore).length,
      lockedAfter: group.filter(result => result.lockedAfter).length, capturedBlack: group.filter(result => result.capturedBlack).length,
      completed: group.filter(result => result.accepted).length, maxGap: Math.max(...group.flatMap(result => result.gaps)),
      eventKinds: [...new Set(group.flatMap(result => result.events))] }));
  }
} finally { await browser.close(); }
