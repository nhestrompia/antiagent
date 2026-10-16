import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';

await mkdir('artifacts/screenshot-preparation', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  for (const operation of ['playwright-default', 'playwright-caret-initial', 'playwright-animation-disabled', 'direct-cdp', 'ordinary-caret-change']) {
    for (let repetition = 0; repetition < 3; repetition++) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
      await page.goto('http://127.0.0.1:5173/screenshot-preparation.html');
      await page.waitForFunction(() => document.querySelector('#status').textContent.length > 0);
      assert.equal(JSON.parse(await page.locator('#status').textContent()).covered, false);
      const rect = await page.locator('canvas').boundingBox();
      let bytes;
      if (operation === 'direct-cdp') {
        const client = await page.context().newCDPSession(page);
        const capture = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
        bytes = Buffer.from(capture.data, 'base64');
      } else {
        if (operation === 'ordinary-caret-change') await page.evaluate(() => { document.querySelector('input').style.caretColor = 'transparent'; });
        const options = operation === 'playwright-default' ? {} : { caret: 'initial', animations: operation === 'playwright-animation-disabled' ? 'disabled' : 'allow' };
        bytes = await page.screenshot(options);
      }
      await writeFile(`artifacts/screenshot-preparation/${operation}-${repetition}.png`, bytes);
      const image = PNG.sync.read(bytes), scale = image.height / 800;
      const p = (Math.round((rect.y + 220) * scale) * image.width + Math.round((rect.x + 60) * scale)) * 4;
      const rgb = [...image.data.slice(p, p + 3)], black = rgb.every(c => c < 20);
      await page.mouse.click(rect.x + 130, rect.y + 235);
      const state = JSON.parse(await page.locator('#status').textContent());
      const expected = ['playwright-default', 'playwright-animation-disabled', 'ordinary-caret-change'].includes(operation);
      assert.equal(black, expected); assert.equal(state.covered, expected); assert.equal(state.accepted, expected ? 0 : 1);
      results.push({ operation, repetition, rgb, black, ...state });
      await page.close();
    }
  }
  await writeFile('docs/screenshot-preparation-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
