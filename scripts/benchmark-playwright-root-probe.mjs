import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:false});
const results=[];
try {
 for(const operation of ['idle','cdp-screenshot','playwright-screenshot','locator-count','coordinate-input']) for(let repetition=0;repetition<3;repetition++) {
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  await page.goto('http://127.0.0.1:5173/playwright-root-probe.html');
  const client=await page.context().newCDPSession(page);
  if(operation==='cdp-screenshot')await client.send('Page.captureScreenshot',{fromSurface:true});
  if(operation==='playwright-screenshot')await page.screenshot({caret:'initial'});
  if(operation==='locator-count')assert.equal(await page.locator('canvas').count(),1);
  if(operation==='coordinate-input')await page.mouse.move(162,267);
  const before=await page.evaluate(()=>JSON.parse(document.querySelector('#status').textContent));
  await page.evaluate(()=>window.probeInjectedRuntime());
  await page.waitForTimeout(100);
  await page.mouse.click(162,267);
  const after=await page.evaluate(()=>JSON.parse(document.querySelector('#status').textContent));
  const capture=await client.send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});
  const image=PNG.sync.read(Buffer.from(capture.data,'base64'));
  const scale=image.height/800,offset=(Math.round(252*scale)*image.width+Math.round(92*scale))*4;
  const pixel=[...image.data.slice(offset,offset+3)];
  const expected=operation==='locator-count';
  assert.equal(before.blocked,false);
  assert.equal(after.blocked,expected);
  assert.equal(after.accepted,expected?0:1);
  assert.deepEqual(pixel,expected?[0,0,0]:[17,100,86]);
  results.push({operation,repetition,before,after,pixel});await page.close();
 }
 await writeFile('docs/playwright-root-probe-results.json',JSON.stringify({browser:browser.version(),playwright:'1.64.0',results},null,2));
 console.log(JSON.stringify(results));
}finally{await browser.close();}
