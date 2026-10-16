import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
await mkdir('artifacts/pip-capture', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  for (let repetition = 0; repetition < 3; repetition++) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/pip-capture.html');
    const state = JSON.parse(await page.locator('#status').textContent());
    if (!state.supported) { results.push({ repetition, unsupported: true }); await context.close(); continue; }
    await page.locator('#open').click();
    await page.waitForFunction(() => { const s = JSON.parse(document.querySelector('#status').textContent); return s.opened || s.error; });
    const opened = JSON.parse(await page.locator('#status').textContent());
    if (!opened.opened) { results.push({ repetition, ...opened }); await context.close(); continue; }
    const sourceClient = await context.newCDPSession(page);
    const source = await sourceClient.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    await writeFile(`artifacts/pip-capture/source-${repetition}.png`, Buffer.from(source.data, 'base64'));
    const targets = await sourceClient.send('Target.getTargets');
    const pages = context.pages();
    const pipPage = pages.find(candidate => candidate !== page);
    const recovered = await page.evaluate(() => {
      const c = documentPictureInPicture.window.document.querySelector('canvas');
      return { pixel: [...c.getContext('2d').getImageData(60, 220, 1, 1).data], labelDOM: c.ownerDocument.body.textContent };
    });
    const result = { repetition, opened: true, targetTypes: targets.targetInfos.map(t => ({ type: t.type, title: t.title, url: t.url })), pageCount: pages.length, recovered };
    if (pipPage) {
      await pipPage.bringToFront();
      await pipPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const client = await context.newCDPSession(pipPage);
      const capture = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
      const bytes = Buffer.from(capture.data, 'base64');
      await writeFile(`artifacts/pip-capture/pip-${repetition}.png`, bytes);
      const geometry = await pipPage.locator('canvas').boundingBox();
      const viewport = await pipPage.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      const image = PNG.sync.read(bytes), scale = image.height / viewport.height;
      const p = (Math.round((geometry.y + 220) * scale) * image.width + Math.round((geometry.x + 60) * scale)) * 4;
      result.pipPixel = [...image.data.slice(p, p + 3)];
      result.pipGreenPixels = 0;
      for (let offset = 0; offset < image.data.length; offset += 4) {
        if (image.data[offset] === 17 && image.data[offset + 1] === 100 && image.data[offset + 2] === 86) result.pipGreenPixels++;
      }
      await pipPage.mouse.click(geometry.x + 130, geometry.y + 235);
      result.accepted = JSON.parse(await page.locator('#status').textContent()).accepted;
      assert.equal(result.accepted, 1);
    }
    assert(recovered.pixel[1] > 50);
    await page.evaluate(() => {
      const source = documentPictureInPicture.window.document.querySelector('canvas');
      const copy = document.createElement('canvas'); copy.width = source.width; copy.height = source.height;
      copy.getContext('2d').drawImage(source, 0, 0); document.body.append(copy);
    });
    await page.bringToFront();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const bypass = await sourceClient.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    const bypassBytes = Buffer.from(bypass.data, 'base64');
    await writeFile(`artifacts/pip-capture/copied-${repetition}.png`, bypassBytes);
    const bypassImage = PNG.sync.read(bypassBytes);
    result.copiedGreenPixels = 0;
    for (let offset = 0; offset < bypassImage.data.length; offset += 4) {
      if (bypassImage.data[offset] === 17 && bypassImage.data[offset + 1] === 100 && bypassImage.data[offset + 2] === 86) result.copiedGreenPixels++;
    }
    assert(result.copiedGreenPixels > 1000);
    results.push(result);
    await context.close();
  }
  await writeFile('docs/pip-capture-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
