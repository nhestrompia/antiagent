import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
await mkdir('artifacts/webgpu-capture', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  for (const copy of ['off', 'on']) for (let repetition = 0; repetition < 3; repetition++) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.goto(`http://127.0.0.1:5173/webgpu-capture.html?copy=${copy}`);
    await page.waitForFunction(() => document.querySelector('#status').textContent !== 'initializing');
    const state = JSON.parse(await page.locator('#status').textContent());
    if (state.unsupported || state.initializationError) { results.push({ copy, repetition, captureSkipped: true, ...state }); await page.close(); continue; }
    const rect = await page.locator('canvas').boundingBox();
    const client = await page.context().newCDPSession(page);
    const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const bytes = Buffer.from(capture.data, 'base64'), image = PNG.sync.read(bytes), scale = image.height / 800;
    await writeFile(`artifacts/webgpu-capture/${copy}-${repetition}.png`, bytes);
    const p = (Math.round((rect.y + 220) * scale) * image.width + Math.round((rect.x + 60) * scale)) * 4;
    const screenshotPixel = [...image.data.slice(p, p + 4)];
    assert(screenshotPixel[1] > 50, 'Compositor capture must contain rendered green control');
    if (copy === 'off') assert(/CopySrc|COPY_SRC/i.test(state.copyError));
    else { assert.equal(state.copyError, null); assert(state.readbackPixel[1] > 50); }
    results.push({ copy, repetition, screenshotPixel, ...state });
    await page.close();
  }
  await writeFile('docs/webgpu-capture-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
