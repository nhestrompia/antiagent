import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const execute = promisify(execFile);
const directory = 'artifacts/combined-defense';
await mkdir(directory, { recursive: true });
const results = [];
function textDistance(a, b) {
  const left = a.toLowerCase().replace(/[^a-z0-9]/g, ''), right = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  let row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const next = [i];
    for (let j = 1; j <= right.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    row = next;
  }
  return row[right.length];
}
const strategies = process.env.STRATEGIES?.split(',') || ['default-playwright', 'locator-stealth', 'synthetic-input', 'render-hook', 'screenshot-cdp', 'adaptive-cdp', 'reactive-cdp', 'reactive-playwright', 'release-swap'];
for (const strategy of strategies) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: strategy === 'default-playwright' ? [] : ['--disable-blink-features=AutomationControlled'] });
  try {
    for (let repetition = 0; repetition < 3; repetition++) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      if (strategy === 'render-hook') await page.addInitScript(() => {
        const original = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (...args) { return original.apply(this, args); };
      });
      await page.goto('http://127.0.0.1:5173/combined-defense.html');
      const client = strategy === 'reactive-playwright' ? null : await page.context().newCDPSession(page);
      async function sendMouse(event) {
        if (client) return client.send('Input.dispatchMouseEvent', event);
        if (event.type === 'mouseMoved') return page.mouse.move(event.x, event.y);
        if (event.type === 'mousePressed') return page.mouse.down({ button: 'left' });
        return page.mouse.up({ button: 'left' });
      }
      if (strategy === 'locator-stealth') await page.locator('canvas').click({ position: { x: 130, y: 235 } });
      if (strategy === 'synthetic-input') await page.evaluate(() => document.querySelector('canvas').click());
      const observations = [];
      if (['screenshot-cdp', 'adaptive-cdp', 'reactive-cdp', 'reactive-playwright', 'release-swap'].includes(strategy)) for (const label of ['Harbor Research', '125 EUR', 'Confirm transfer']) {
        if (['reactive-cdp', 'reactive-playwright', 'release-swap'].includes(strategy)) {
          await sendMouse({ type: 'mouseMoved', x: 250, y: 180 });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        const capture = client ? await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false }) : { data: (await page.screenshot({ fullPage: false })).toString('base64') };
        const path = `${directory}/${strategy}-${repetition}-${observations.length}.png`;
        await writeFile(path, Buffer.from(capture.data, 'base64'));
        const { stdout } = await execute('/private/tmp/anti-agent-ocr', [path]);
        const text = JSON.parse(stdout);
        const target = text.map(item => ({ ...item, distance: textDistance(item.text, label) })).filter(item => item.distance <= 2).sort((a, b) => a.distance - b.distance)[0];
        assert.ok(target, `OCR did not locate ${label}: ${stdout}`);
        const point = { x: target.x * 1280, y: target.y * 900 };
        const pressPoint = strategy === 'release-swap' ? { x: point.x < 600 ? point.x + 230 : point.x - 230, y: point.y } : point;
        observations.push({ label, point, text });
        if (['adaptive-cdp', 'reactive-cdp', 'reactive-playwright', 'release-swap'].includes(strategy)) {
          for (let sample = 0; sample < 8; sample++) {
            await sendMouse({ type: 'mouseMoved', x: pressPoint.x - 70 + sample * 10, y: pressPoint.y - 70 + sample * 10 });
            await new Promise(resolve => setTimeout(resolve, 60));
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        await sendMouse({ type: 'mousePressed', ...pressPoint, button: 'left', buttons: 1, clickCount: 1 });
        if (strategy === 'release-swap') await sendMouse({ type: 'mouseMoved', ...point, buttons: 1 });
        await sendMouse({ type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
        if (['screenshot-cdp', 'adaptive-cdp', 'release-swap'].includes(strategy)) break;
      }
      // Outcome read happens only after the screenshot agent finishes its actions.
      const state = await page.evaluate(() => JSON.parse(document.querySelector('#status').textContent));
      const reasons = { 'default-playwright': 'webdriver', 'locator-stealth': 'playwright-target-event', 'synthetic-input': 'untrusted-input', 'screenshot-cdp': 'pointer-continuity', 'adaptive-cdp': 'incorrect-decision' };
      if (strategy === 'release-swap') {
        assert.equal(state.blocked, true, 'A press on another choice must not authorize this choice');
        assert.equal(state.completed, false);
        assert.equal(state.reason, 'pointer-transaction');
      } else if (['reactive-cdp', 'reactive-playwright'].includes(strategy)) {
        assert.equal(state.completed, true, JSON.stringify(state)); assert.equal(state.blocked, false); assert.equal(state.clicks, 3);
      } else {
        assert.equal(state.blocked, true); assert.equal(state.completed, false);
        if (strategy === 'render-hook') assert.ok(state.reason.startsWith('api-integrity:'));
        else assert.equal(state.reason, reasons[strategy]);
      }
      results.push({ strategy, repetition, browser: browser.version(), state, observations });
      await page.close();
    }
  } finally { await browser.close(); }
}
await writeFile('artifacts/combined-defense/results.json', JSON.stringify({ playwright: '1.64.0', results }, null, 2));
console.log(JSON.stringify(results.map(({ strategy, repetition, state }) => ({ strategy, repetition, state }))));

if (process.argv.includes('--require-blocking')) {
  const bypasses = results.filter(({ state }) => state.completed || !state.blocked);
  assert.equal(bypasses.length, 0, `Agent-proof acceptance failed: ${bypasses.length} sessions bypassed the guard. See ${directory}/results.json`);
}
