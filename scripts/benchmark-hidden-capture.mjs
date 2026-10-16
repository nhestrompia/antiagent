import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchChromeWithoutOverrides } from './chrome-no-overrides.mjs';
import { PNG } from 'pngjs';
await mkdir('artifacts/hidden-capture', { recursive: true });
const results = [];
let version;
for (const guard of ['off', 'hidden-frame']) {
  for (const operation of ['hidden-idle', 'hidden-viewport', 'emulated-hidden-viewport', 'foreground-viewport']) {
    for (let repetition = 0; repetition < 3; repetition++) {
      const { browser, close } = await launchChromeWithoutOverrides();
      try {
        version = browser.version();
        const context = browser.contexts()[0];
        const page = await context.newPage();
        await page.setViewportSize({ width: 1000, height: 800 });
        await page.goto(`http://127.0.0.1:5173/capture-signals.html?guard=${guard}`);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const client = await context.newCDPSession(page);
        await client.send('Emulation.setFocusEmulationEnabled', { enabled: !operation.startsWith('hidden') });
        if (operation.startsWith('hidden') || operation.startsWith('emulated')) {
          const cover = await context.newPage();
          await cover.goto('about:blank');
          await cover.bringToFront();
          if (operation.startsWith('hidden')) {
            try { await page.waitForFunction(() => document.hidden, null, { polling: 50, timeout: 1500 }); }
            catch { results.push({ guard, operation, repetition, skipped: 'hidden baseline unavailable' }); continue; }
          }
          await page.waitForTimeout(100);
        }
        await page.evaluate(() => window.captureSignals.reset());
        const before = await page.evaluate(() => window.captureSignals.snapshot());
        let captureAppearance = null;
        if (operation.endsWith('viewport')) {
          const result = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
          const image = PNG.sync.read(Buffer.from(result.data, 'base64'));
          await writeFile(`artifacts/hidden-capture/${guard}-${operation}-${repetition}.png`, Buffer.from(result.data, 'base64'));
          const scale = image.height / 800;
          const p = (Math.round(310 * scale) * image.width + Math.round(100 * scale)) * 4;
          const rgb = [...image.data.slice(p, p + 3)];
          captureAppearance = { rgb, black: rgb.every(channel => channel < 20) };
        } else await page.waitForTimeout(250);
        const after = await page.evaluate(() => window.captureSignals.snapshot());
        if (operation.startsWith('hidden')) assert(before.dimensions.hidden);
        if (operation.startsWith('emulated')) assert(!before.dimensions.hidden);
        results.push({ guard, operation, repetition, visibilityBefore: before.dimensions.hidden, visibilityAfter: after.dimensions.hidden,
          focusEmulation: !operation.startsWith('hidden'), lockedBefore: before.locked, frameDelta: after.frames - before.frames,
          locked: after.locked, events: after.events, captureAppearance });
      } finally { await close(); }
      console.log(`${guard} ${operation} ${repetition}: recorded`);
    }
  }
}
await writeFile('docs/hidden-capture-results.json', JSON.stringify({ browser: version, freshBrowserPerCase: true, results }, null, 2));
for (const result of results.filter(result => !result.skipped)) {
  assert.equal(result.lockedBefore, false);
  if (result.operation === 'hidden-idle') { assert.equal(result.frameDelta, 0); assert.equal(result.locked, false); }
  else {
    const shouldBlock = result.guard === 'hidden-frame' && result.operation === 'hidden-viewport';
    assert.equal(result.captureAppearance.black, shouldBlock);
    assert.equal(result.locked, shouldBlock);
  }
}
console.log(JSON.stringify(results, null, 2));
