import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchChromeWithoutOverrides } from './chrome-no-overrides.mjs';
import { PNG } from 'pngjs';
await mkdir('artifacts/capture-cover', { recursive: true });
const results = [];
let version;
for (const operation of ['foreground-viewport', 'foreground-fullpage', 'hidden-viewport', 'focus-emulated-viewport', 'ordinary-resize', 'ordinary-scrollbar-removal', 'remove-after-fullpage']) {
  for (let repetition = 0; repetition < 3; repetition++) {
    const { browser, close } = await launchChromeWithoutOverrides();
    try {
      version = browser.version();
      const context = browser.contexts()[0], page = await context.newPage();
      await page.setViewportSize({ width: 1000, height: 800 });
      await page.goto('http://127.0.0.1:5173/capture-cover.html');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const client = await context.newCDPSession(page);
      const before = JSON.parse(await page.locator('#status').textContent());
      assert.equal(before.covered, false);
      const geometry = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, fullHeight: document.documentElement.scrollHeight }; });
      if (operation === 'hidden-viewport' || operation === 'focus-emulated-viewport') {
        await client.send('Emulation.setFocusEmulationEnabled', { enabled: operation.startsWith('focus') });
        const cover = await context.newPage(); await cover.goto('about:blank'); await cover.bringToFront();
        if (operation.startsWith('hidden')) await page.waitForFunction(() => document.hidden, null, { polling: 50, timeout: 3000 });
      }
      if (operation === 'ordinary-resize') await page.setViewportSize({ width: 1100, height: 800 });
      if (operation === 'ordinary-scrollbar-removal') await page.evaluate(() => { document.body.style.minHeight = '0'; });
      let fullPage = operation.endsWith('fullpage');
      let capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: fullPage });
      if (operation === 'remove-after-fullpage') {
        await page.evaluate(() => { const region=document.querySelector('#region');region.lastElementChild.remove();region.style.visibility='visible';region.inert=false; });
        fullPage = false;
        capture = await client.send('Page.captureScreenshot', { format:'png',fromSurface:true,captureBeyondViewport:false });
      }
      const bytes = Buffer.from(capture.data, 'base64'), image = PNG.sync.read(bytes);
      await writeFile(`artifacts/capture-cover/${operation}-${repetition}.png`, bytes);
      const scale = image.height / (fullPage ? geometry.fullHeight : 800);
      const p = (Math.round((geometry.y + 220) * scale) * image.width + Math.round((geometry.x + 60) * scale)) * 4;
      const rgb = [...image.data.slice(p, p + 3)], black = rgb.every(channel => channel < 20);
      const state = JSON.parse(await page.locator('#status').textContent());
      if (operation === 'hidden-viewport') await page.bringToFront();
      await page.mouse.click(geometry.x + 130, geometry.y + 235);
      const after = JSON.parse(await page.locator('#status').textContent());
      const raw = await page.locator('canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(60, 220, 1, 1).data]);
      const expectedCover = ['foreground-fullpage', 'hidden-viewport', 'ordinary-scrollbar-removal', 'remove-after-fullpage'].includes(operation);
      assert.equal(black, expectedCover); assert.equal(state.covered, expectedCover);
      if (expectedCover) assert(raw.slice(0, 3).every(channel => channel === 0));
      assert.equal(after.accepted, expectedCover ? 0 : 1);
      results.push({ operation, repetition, black, rgb, rawCanvasPixel: raw, covered: state.covered, reasons: state.reasons, accepted: after.accepted });
    } finally { await close(); }
  }
}
await writeFile('docs/capture-cover-results.json', JSON.stringify({ browser: version, results }, null, 2));
console.log(JSON.stringify(results, null, 2));
