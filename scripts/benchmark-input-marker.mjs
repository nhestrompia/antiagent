import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:false});
const results=[];
try {
 for(const operation of ['dom-click','playwright-click','cdp-mouse','cdp-pen'])for(let repetition=0;repetition<3;repetition++){
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  await page.goto('http://127.0.0.1:5173/input-marker.html');
  if(operation==='dom-click')await page.locator('#action').evaluate(element=>element.click());
  else if(operation==='playwright-click')await page.locator('#action').click();
  else {
   const client=await page.context().newCDPSession(page),r=await page.locator('#action').boundingBox();
   const common={x:r.x+r.width/2,y:r.y+r.height/2,pointerType:operation==='cdp-pen'?'pen':'mouse',modifiers:0};
   await client.send('Input.dispatchMouseEvent',{...common,type:'mouseMoved'});
   await client.send('Input.dispatchMouseEvent',{...common,type:'mousePressed',button:'left',buttons:1,clickCount:1,force:operation==='cdp-pen'?0.75:0});
   await client.send('Input.dispatchMouseEvent',{...common,type:'mouseReleased',button:'left',buttons:0,clickCount:1});
  }
  const state=JSON.parse(await page.locator('#status').textContent());
  assert.equal(state.accepted,operation==='dom-click'?0:1);
  assert(state.samples.every(event=>!event.modifiers.FromDebugger&&!event.modifiers.Debugger));
  results.push({operation,repetition,...state});await page.close();
 }
 await writeFile('docs/input-marker-results.json',JSON.stringify({browser:browser.version(),results},null,2));
 console.log(JSON.stringify(results.map(({operation,repetition,accepted,samples})=>({operation,repetition,accepted,click:samples.find(e=>e.type==='click')}))));
}finally{await browser.close();}
