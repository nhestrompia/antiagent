import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  for (const operation of ['screenshot', 'locator-click', 'main-world-control']) for (let repetition = 0; repetition < 3; repetition++) {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5173/capture-policy.html');
    await page.evaluate(() => {
      window.worldProbe = { cleanupWrites: 0, targetWrites: 0, fontReadyReads: 0 };
      Object.defineProperty(window, '__pwCleanupScreenshot', { configurable: true, get: () => undefined, set: () => window.worldProbe.cleanupWrites++ });
      Object.defineProperty(document.querySelector('canvas'), '__playwright_target__', { configurable: true, get: () => undefined, set: () => window.worldProbe.targetWrites++ });
      const originalReady = document.fonts.ready;
      Object.defineProperty(document.fonts, 'ready', { configurable: true, get: () => { window.worldProbe.fontReadyReads++; return originalReady; } });
    });
    if (operation === 'screenshot') await page.screenshot();
    if (operation === 'locator-click') await page.locator('canvas').click({ position: { x: 130, y: 235 } });
    if (operation === 'main-world-control') await page.evaluate(() => {
      window.__pwCleanupScreenshot = () => {};
      document.querySelector('canvas').__playwright_target__ = 1;
      void document.fonts.ready;
    });
    const probe = await page.evaluate(() => window.worldProbe);
    const expected = operation === 'main-world-control' ? 1 : 0;
    for (const value of Object.values(probe)) assert.equal(value, expected);
    const accepted = JSON.parse(await page.locator('#status').textContent()).accepted;
    assert.equal(accepted, operation === 'locator-click' ? 1 : 0);
    results.push({ operation, repetition, probe, accepted }); await page.close();
  }
  await writeFile('docs/playwright-world-results.json', JSON.stringify({ browser: browser.version(), playwright: '1.64.0', results }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
