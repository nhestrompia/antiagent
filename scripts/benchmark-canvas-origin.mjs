import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
await mkdir('artifacts/canvas-origin', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  for (const cors of ['off', 'on']) for (let repetition = 0; repetition < 3; repetition++) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
    await page.goto(`http://127.0.0.1:5173/origin-canvas.html?cors=${cors}`);
    await page.waitForFunction(() => document.querySelector('#status').textContent !== 'initializing');
    const before = JSON.parse(await page.locator('#status').textContent());
    assert.equal(before.ready, true, before.initializationError);
    for (const result of Object.values(before.exports)) assert.equal(result, cors === 'off' ? 'SecurityError' : 'allowed');
    const copy = await page.evaluate(() => {
      const original = document.querySelector('canvas'), destination = document.createElement('canvas');
      destination.width = original.width; destination.height = original.height;
      destination.getContext('2d').drawImage(original, 0, 0); document.body.append(destination);
      let exportResult;
      try { destination.toDataURL(); exportResult = 'allowed'; } catch (error) { exportResult = error.name; }
      return { exportResult };
    });
    assert.equal(copy.exportResult, cors === 'off' ? 'SecurityError' : 'allowed');
    const rectangles = await page.locator('canvas').evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
    const client = await page.context().newCDPSession(page);
    const capture = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    const bytes = Buffer.from(capture.data, 'base64'), image = PNG.sync.read(bytes), scale = image.height / 1000;
    await writeFile(`artifacts/canvas-origin/${cors}-${repetition}.png`, bytes);
    const pixels = rectangles.map(r => {
      const p = (Math.round((r.y + 220) * scale) * image.width + Math.round((r.x + 60) * scale)) * 4;
      return [...image.data.slice(p, p + 3)];
    });
    for (const pixel of pixels) assert.deepEqual(pixel, [17, 100, 86]);
    await page.mouse.click(rectangles[0].x + 130, rectangles[0].y + 235);
    const after = JSON.parse(await page.locator('#status').textContent()); assert.equal(after.accepted, 1);
    results.push({ cors, repetition, before, copy, pixels, accepted: after.accepted }); await page.close();
  }
  await writeFile('docs/canvas-origin-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
