import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const directory = resolve(process.env.CAPTURE_DIR || `artifacts/automation-guards-${Date.now()}`);
await mkdir(directory, { recursive: true });
const results = [];
for (const mode of ['stock', 'preload-override', 'browser-flag']) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: mode === 'browser-flag' ? ['--disable-blink-features=AutomationControlled'] : [] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    if (mode === 'preload-override') await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }));
    for (const policy of ['webdriver', 'trusted', 'activation', 'combined']) {
      await page.goto(`${process.env.EXPERIMENT_URL || 'http://127.0.0.1:5173/automation-lab.html'}?policy=${policy}`);
      await page.waitForFunction(() => Boolean(window.automationLab));
      const before = await page.evaluate(() => window.automationLab.snapshot());
      await page.locator('canvas').click({ position: { x: 180, y: 252 } });
      const after = await page.evaluate(() => window.automationLab.snapshot());
      const event = after.events.at(-1);
      assert.equal(event.hit, true, 'Input must hit the reference action.');
      assert.equal(event.trusted, true, 'Measure trust on real Playwright pointer input.');
      assert.equal(event.activation, true, 'Measure browser user activation on real Playwright pointer input.');
      await page.screenshot({ path: `${directory}/${mode}-${policy}.png` });
      results.push({ mode, before, after, screenshotCompleted: true, referenceRendered: !before.contentRefused, actionAccepted: event.accepted });
      if (policy === 'trusted') {
        await page.goto(`${process.env.EXPERIMENT_URL || 'http://127.0.0.1:5173/automation-lab.html'}?policy=trusted`);
        const rect = await page.locator('canvas').boundingBox();
        await page.locator('canvas').dispatchEvent('click', { clientX: rect.x + 180 * rect.width / 720, clientY: rect.y + 252 * rect.height / 480 });
        const synthetic = await page.evaluate(() => window.automationLab.snapshot());
        assert.equal(synthetic.events[0].trusted, false);
        assert.equal(synthetic.events[0].hit, true);
        assert.equal(synthetic.acceptedActions, 0);
      }
    }
    await writeFile(`${directory}/report.json`, JSON.stringify({ browser: browser.version(), results }, null, 2));
  } finally { await browser.close(); }
}
assert.equal(results.find(row => row.mode === 'stock' && row.before.policy === 'combined').actionAccepted, false);
assert.equal(results.find(row => row.mode === 'browser-flag' && row.before.policy === 'combined').actionAccepted, true);
assert.equal(results.find(row => row.mode === 'preload-override' && row.before.policy === 'combined').actionAccepted, true);
console.log(`Verified automation guard bypasses; saved evidence to ${directory}`);
