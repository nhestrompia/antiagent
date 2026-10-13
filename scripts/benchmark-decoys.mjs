import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const directory = 'artifacts/decoy-validation';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
try {
  for (const mode of ['off', 'hidden', 'opacity']) {
    for (const agent of ['text-selector', 'screenshot-coordinate', 'css-aware', 'remove-decoy', 'keyboard']) {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:5173/decoy-lab.html?mode=${mode}`);
      const before = await page.evaluate(() => window.decoyExperiment.snapshot());
      await page.screenshot({ path: `${directory}/${mode}-${agent}.png` });
      const afterCapture = await page.evaluate(() => window.decoyExperiment.snapshot());
      let error = null;
      try {
        if (agent === 'text-selector') await page.getByText('Confirm transfer', { exact: true }).click({ timeout: 600 });
        else if (agent === 'keyboard') { await page.locator('canvas').focus(); await page.keyboard.press('Enter'); }
        else {
          if (agent === 'remove-decoy') await page.locator('#decoy').evaluateAll(elements => elements.forEach(element => element.remove()));
          if (agent === 'css-aware') {
            const visible = await page.locator('#decoy').evaluateAll(elements => elements.filter(element => getComputedStyle(element).opacity !== '0' && getComputedStyle(element).display !== 'none').length);
            assert.equal(visible, 0);
          }
          const rect = await page.locator('canvas').boundingBox();
          await page.mouse.click(rect.x + 130, rect.y + 235);
        }
      } catch (failure) { error = failure.name; }
      const state = await page.evaluate(() => window.decoyExperiment.snapshot());
      results.push({ mode, agent, ...state, captureEvents: afterCapture.events.slice(before.events.length), error });
      if (agent !== 'text-selector') assert.equal(state.accepted, 1);
      if (agent === 'text-selector' && mode === 'opacity') assert.equal(state.locked, true);
      await page.close();
    }
  }
  await writeFile('docs/decoy-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results.map(({ mode, agent, accepted, locked, captureEvents, error }) => ({ mode, agent, accepted, locked, captureEvents, error })), null, 2));
} finally { await browser.close(); }
