import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
const directory = 'artifacts/capture-signals';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
try {
  for (const guard of ['off', 'on']) for (const method of ['idle', 'playwright-viewport', 'playwright-fullpage', 'cdp-viewport', 'cdp-fullpage', 'resize-control']) for (let repetition = 0; repetition < 3; repetition++) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.goto(`http://127.0.0.1:5173/capture-signals.html?guard=${guard}`);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => window.captureSignals.reset());
    const before = await page.evaluate(() => window.captureSignals.snapshot());
    const captureGeometry = await page.evaluate(() => { const rect = document.querySelector('canvas').getBoundingClientRect(); return {x:rect.x,y:rect.y,fullHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight}; });
    const path = `${directory}/${guard}-${method}-${repetition}.png`;
    if (method.startsWith('playwright')) await page.screenshot({ path, fullPage: method.endsWith('fullpage') });
    else if (method.startsWith('cdp')) {
      const client = await page.context().newCDPSession(page);
      const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: method.endsWith('fullpage') });
      await writeFile(path, Buffer.from(capture.data, 'base64'));
    } else if (method === 'resize-control') await page.setViewportSize({ width: 1100, height: 800 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const afterCapture = await page.evaluate(() => window.captureSignals.snapshot());
    let captureAppearance = null;
    if (method.startsWith('playwright') || method.startsWith('cdp')) {
      const image = PNG.sync.read(await readFile(path));
      const scale = image.height / (method.endsWith('fullpage') ? captureGeometry.fullHeight : captureGeometry.viewportHeight);
      const x = Math.round((captureGeometry.x + 60) * scale), y = Math.round((captureGeometry.y + 220) * scale);
      const p = (y * image.width + x) * 4;
      const rgb = [...image.data.slice(p,p+3)];
      const black = rgb.every(channel => channel < 20);
      captureAppearance = {rgb,black,scale,width:image.width,height:image.height};
      assert.equal(black, guard === 'on' && method.endsWith('fullpage'));
    }
    const rect = await page.locator('canvas').boundingBox();
    await page.mouse.click(rect.x + 130, rect.y + 235);
    const afterInput = await page.evaluate(() => window.captureSignals.snapshot());
    if (guard === 'off') assert.equal(afterInput.accepted, 1);
    if (guard === 'on' && ['idle', 'playwright-viewport', 'cdp-viewport'].includes(method)) assert.equal(afterInput.accepted, 1);
    results.push({ guard, method, repetition, captureAppearance, before, afterCapture, afterInput });
    await page.close();
  }
  await writeFile('docs/capture-signals-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results.map(({ guard, method, repetition, afterCapture, afterInput }) => ({ guard, method, repetition, events: afterCapture.events, samples: afterCapture.samples.length, locked: afterCapture.locked, accepted: afterInput.accepted })), null, 2));
} finally { await browser.close(); }
