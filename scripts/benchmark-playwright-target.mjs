import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
await mkdir('artifacts/playwright-target', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  for (const operation of ['locator-guard-off', 'locator-guard-on', 'mouse-guard-on', 'cdp-guard-on', 'element-screenshot-guard-on']) for (let repetition = 0; repetition < 3; repetition++) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.goto(`http://127.0.0.1:5173/playwright-target.html?guard=${operation.endsWith('off') ? 'off' : 'on'}`);
    const rect = await page.evaluate(() => { const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x,y:r.y}; });
    const client = await page.context().newCDPSession(page);
    if (operation.startsWith('locator')) await page.locator('canvas').click({ position: { x: 130, y: 235 } });
    else if (operation.startsWith('mouse')) await page.mouse.click(rect.x + 130, rect.y + 235);
    else if (operation.startsWith('cdp')) {
      await client.send('Input.dispatchMouseEvent', { type:'mousePressed',x:rect.x+130,y:rect.y+235,button:'left',buttons:1,clickCount:1 });
      await client.send('Input.dispatchMouseEvent', { type:'mouseReleased',x:rect.x+130,y:rect.y+235,button:'left',buttons:0,clickCount:1 });
    } else {
      await page.locator('canvas').screenshot();
      await page.mouse.click(rect.x + 130, rect.y + 235);
    }
    const state = await page.evaluate(() => JSON.parse(document.querySelector('#status').textContent));
    const capture = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    const bytes=Buffer.from(capture.data,'base64'),image=PNG.sync.read(bytes),scale=image.height/800;
    await writeFile(`artifacts/playwright-target/${operation}-${repetition}.png`,bytes);
    const p=(Math.round((rect.y+220)*scale)*image.width+Math.round((rect.x+60)*scale))*4;
    const pixel=[...image.data.slice(p,p+3)];
    const expectedBlock=operation==='locator-guard-on';
    assert.equal(state.blocked,expectedBlock);
    assert.deepEqual(pixel,expectedBlock?[0,0,0]:[17,100,86]);
    assert.equal(state.accepted,expectedBlock?0:1);
    results.push({operation,repetition,state,pixel});await page.close();
  }
  await writeFile('docs/playwright-target-results.json',JSON.stringify({browser:browser.version(),playwright:'1.64.0',results},null,2));
  console.log(JSON.stringify(results));
} finally {await browser.close();}
