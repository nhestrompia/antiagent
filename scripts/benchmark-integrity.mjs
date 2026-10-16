import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
await mkdir('artifacts/integrity-validation', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
try {
  for (const mode of ['clean', 'plain-hook', 'replace-gate', 'replace-runtime', 'rewrite-html']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    if (mode !== 'clean') await page.addInitScript(() => {
      window.observedLabels = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (...args) { window.observedLabels.push(args); return original.apply(this, args); };
    });
    if (mode === 'replace-gate' || mode === 'rewrite-html') await page.route('**/integrity/gate.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: 'export function inspectAPIs(){return {allowed:true,reasons:[]}}' });
    });
    if (mode === 'replace-runtime') await page.route('**/integrity/runtime.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("import { inspectAPIs } from 'anti-agent-gate';", 'function inspectAPIs(){return {allowed:true,reasons:[]}}') });
    });
    if (mode === 'rewrite-html') await page.route('**/integrity/index.html', async route => {
      const response = await route.fetch();
      let html = await response.text();
      html = html.replace(/<script type="importmap">(.*?)<\/script>/, (_, contents) => {
        const map = JSON.parse(contents); delete map.integrity;
        return `<script type="importmap">${JSON.stringify(map)}</script>`;
      });
      await route.fulfill({ response, body: html });
    });
    await page.goto('http://127.0.0.1:5173/integrity/index.html');
    const status = await page.locator('#status').textContent();
    const image = PNG.sync.read(await page.locator('canvas').screenshot({ path: `artifacts/integrity-validation/${mode}.png` }));
    const p = (235 * image.width + 130) * 4;
    const uiVisible = image.data[p + 1] > 50;
    const rect = await page.locator('canvas').boundingBox();
    await page.mouse.click(rect.x + 130, rect.y + 235);
    const after = await page.locator('#status').textContent();
    const accepted = after === 'starting' ? 0 : JSON.parse(after).accepted;
    const labels = await page.evaluate(() => window.observedLabels || []);
    const succeeds = ['clean', 'rewrite-html'].includes(mode);
    assert.equal(uiVisible, succeeds);
    assert.equal(accepted, succeeds ? 1 : 0);
    if (mode.startsWith('replace-')) assert(errors.some(message => /integrity|digest/i.test(message)), 'browser must report integrity rejection');
    results.push({ mode, uiVisible, accepted, status, labels, errors });
    await page.close();
  }
  await writeFile('docs/integrity-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
