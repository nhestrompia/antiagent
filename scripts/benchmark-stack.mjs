import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const directory = resolve(process.env.CAPTURE_DIR || `artifacts/stack-probe-${Date.now()}`);
await mkdir(directory, { recursive: true });
const results = [];
for (const mode of ['stock', 'browser-flag']) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: mode === 'browser-flag' ? ['--disable-blink-features=AutomationControlled'] : [] });
  try {
    for (const operation of ['screenshot', 'native-input', 'evaluate-title', 'evaluate-error']) {
      const page = await browser.newPage();
      const client = await page.context().newCDPSession(page);
      await page.goto('http://127.0.0.1:5173/stack-probe.html');
      if (operation === 'screenshot') {
        const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        await writeFile(`${directory}/${mode}-screenshot.png`, Buffer.from(capture.data, 'base64'));
      } else if (operation === 'native-input') await page.getByRole('button', { name: 'Sample browser input' }).click();
      else if (operation === 'evaluate-title') await page.evaluate(() => document.title);
      else await page.evaluate(() => window.stackProbe.exercise());
      const observation = await client.send('Runtime.evaluate', { expression: 'JSON.stringify(window.stackProbe.snapshot())', returnByValue: true });
      const state = JSON.parse(observation.result.value);
      results.push({ mode, operation, ...state, frameworkDetected: state.samples.some(sample => sample.frameworkDetected) });
      if (operation === 'native-input') assert(state.samples.some(sample => sample.source === 'native-input'));
      await page.close();
    }
    await writeFile(`${directory}/report.json`, JSON.stringify({ browser: browser.version(), results }, null, 2));
  } finally { await browser.close(); }
}
console.log(JSON.stringify(results.map(({ mode, operation, frameworkDetected, serializationReads }) => ({ mode, operation, frameworkDetected, serializationReads })), null, 2));
