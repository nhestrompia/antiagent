import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
await mkdir('artifacts/worker-validation', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
try {
  for (const agent of ['main-render-hook', 'worker-render-hook']) {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.observedLabels = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (...args) { window.observedLabels.push(args); return original.apply(this, args); };
    });
    if (agent === 'worker-render-hook') {
      // Install before the application receives the transferred canvas.
      await page.route('**/src/worker-renderer.js*', async route => {
        const response = await route.fetch();
        const hook = `self.observedLabels=[];const originalFillText=OffscreenCanvasRenderingContext2D.prototype.fillText;OffscreenCanvasRenderingContext2D.prototype.fillText=function(...args){self.observedLabels.push(args);return originalFillText.apply(this,args)};`;
        await route.fulfill({ response, body: hook + await response.text() });
      });
    }
    await page.goto('http://127.0.0.1:5173/worker-lab.html');
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('"ready":true'));
    await page.screenshot({ path: `artifacts/worker-validation/${agent}.png` });
    const mainLabels = await page.evaluate(() => window.observedLabels);
    assert.equal(mainLabels.length, 0);
    let workerLabels = [];
    if (agent === 'worker-render-hook') {
      assert.equal(page.workers().length, 1);
      workerLabels = await page.workers()[0].evaluate(() => self.observedLabels);
      const target = workerLabels.find(([label]) => label === 'Harbor Research');
      assert(target);
      const rect = await page.locator('canvas').boundingBox();
      await page.mouse.click(rect.x + target[1] + 60, rect.y + target[2] - 5);
      await page.waitForFunction(() => document.querySelector('#status').textContent.includes('"accepted":1'));
    }
    const state = JSON.parse(await page.locator('#status').textContent());
    results.push({ agent, mainLabels, workerLabels, ...state });
    await page.close();
  }
  await writeFile('docs/worker-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
