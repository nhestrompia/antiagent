import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const headless=process.env.HEADLESS==='1';
const browser=await chromium.launch({channel:'chrome',headless,args:['--disable-blink-features=AutomationControlled']});
const results=[];
try {
 for(let repetition=0;repetition<3;repetition++) {
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  await page.goto('http://127.0.0.1:5173/pointer-lock.html');await page.bringToFront();
  const client=await page.context().newCDPSession(page);
  await page.locator('#lock').click();
  let lockAcquired=true;
  try { await page.waitForFunction(()=>document.pointerLockElement!==null,{},{timeout:2000}); } catch { lockAcquired=false; }
  if(!lockAcquired) { results.push({repetition,acquired:false,state:await page.evaluate(()=>window.pointerLockState)});await page.close();continue; }
  await page.evaluate(()=>window.pointerLockState.events=[]);
  for(let sample=0;sample<8;sample++) {
   await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:300+sample*20,y:300+sample*10});
   await new Promise(resolve=>setTimeout(resolve,30));
  }
  const state=await page.evaluate(()=>window.pointerLockState);
  assert.equal(state.locked,true);assert.equal(state.error,null);
  assert.ok(state.events.some(event=>event.locked&&event.trusted&&event.movementX!==0));
  results.push({repetition,acquired:true,state});await page.close();
 }
 await writeFile(headless?'docs/pointer-lock-headless-results.json':'docs/pointer-lock-results.json',JSON.stringify({headless,browser:browser.version(),playwright:'1.64.0',results},null,2));
 console.log(JSON.stringify(results));
}finally{await browser.close();}
