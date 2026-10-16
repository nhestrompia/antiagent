import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--disable-blink-features=AutomationControlled']});
const results=[];
try {
 for(const strategy of ['playwright-mouse','cdp-mouse','cdp-burst','cdp-touch'])for(let repetition=0;repetition<3;repetition++) {
  const page=await browser.newPage({viewport:{width:1000,height:800},hasTouch:true});
  await page.goto('http://127.0.0.1:5173/raw-pointer.html');
  const client=await page.context().newCDPSession(page);
  if(strategy==='cdp-touch')await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:100}]});
  if(strategy==='cdp-burst') {
   await Promise.all(Array.from({length:64},(_,sample)=>client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:100+sample*2,y:100+sample})));
   await new Promise(resolve=>setTimeout(resolve,80));
  }
  for(let sample=0;strategy!=='cdp-burst'&&sample<8;sample++) {
   const x=100+sample*20,y=100+sample*10;
   if(strategy==='playwright-mouse')await page.mouse.move(x,y);
   else if(strategy==='cdp-mouse')await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
   else await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
   await new Promise(resolve=>setTimeout(resolve,30));
  }
  if(strategy==='cdp-touch')await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  else await page.mouse.click(240,170);
  const events=await page.evaluate(()=>window.rawPointerRecords);
  assert.ok(events.some(event=>event.type==='pointermove'&&event.trusted));
  assert.ok(events.some(event=>event.type==='pointerrawupdate'&&event.trusted));
  assert.ok(events.some(event=>event.type==='pointermove'&&event.movementX!==0&&event.coalesced.length>=1));
  results.push({strategy,repetition,events});await page.close();
 }
 await writeFile('docs/raw-pointer-results.json',JSON.stringify({browser:browser.version(),playwright:'1.64.0',results},null,2));
 console.log(JSON.stringify(results.map(({strategy,repetition,events})=>({strategy,repetition,raw:events.filter(e=>e.type==='pointerrawupdate').length,moves:events.filter(e=>e.type==='pointermove').map(({movementX,movementY,coalesced,predicted})=>({movementX,movementY,coalesced:coalesced?.length,predicted}))}))));
}finally{await browser.close();}
