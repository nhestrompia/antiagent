import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
await mkdir('artifacts/hardening-validation', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
function installHook() {
  window.observedLabels = [];
  const target = CanvasRenderingContext2D.prototype;
  const original = target.fillText;
  const wrapper = function (...args) { window.observedLabels.push(args); return original.apply(this, args); };
  window.hookInstalled = Reflect.set(target, 'fillText', wrapper) && target.fillText === wrapper;
}
try {
  for (const guard of ['off', 'on']) for (const operation of ['late-hook', 'early-hook', 'compositor-input']) {
    const page = await browser.newPage();
    if (operation === 'early-hook') await page.addInitScript(installHook);
    await page.goto(`http://127.0.0.1:5173/hardening-lab.html?guard=${guard}`);
    if (operation === 'late-hook') { await page.evaluate(installHook); await page.evaluate(() => window.hardeningExperiment.redraw()); }
    const labels = await page.evaluate(() => window.observedLabels || []);
    const hookInstalled = await page.evaluate(() => window.hookInstalled ?? null);
    const client = await page.context().newCDPSession(page);
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(`artifacts/hardening-validation/${guard}-${operation}.png`, Buffer.from(screenshot.data, 'base64'));
    const rect = await page.locator('canvas').boundingBox();
    await page.mouse.click(rect.x + 130, rect.y + 235);
    const state = JSON.parse(await page.locator('#status').textContent());
    results.push({ guard, operation, hookInstalled, labels, ...state });
    assert.equal(state.accepted, 1);
    if (operation.endsWith('hook')) assert.equal(labels.length > 0, !(guard === 'on' && operation === 'late-hook'));
    await page.close();
  }
  await writeFile('docs/hardening-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results.map(({ guard, operation, hookInstalled, labels, accepted }) => ({ guard, operation, hookInstalled, labelCount: labels.length, accepted })), null, 2));
} finally { await browser.close(); }
