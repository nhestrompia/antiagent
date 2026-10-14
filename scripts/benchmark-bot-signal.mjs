import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { launchRawCDP } from './raw-cdp.mjs';
const execute=promisify(execFile),results=[];
await mkdir('artifacts/bot-signal',{recursive:true});
for(const type of ['headed','headless']) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP({headless:type==='headless'});
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:5173/bot-signal.html'});
    async function report(){
      for(let attempt=0;attempt<50;attempt++) {
        const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
        if(targetInfo.title.startsWith('Detector result:')) return JSON.parse(targetInfo.title.slice(16));
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      throw new Error('Device fixture did not render');
    }
    const initial=await report();
    const capture=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});
    const path=`artifacts/bot-signal/${type}-${repetition}.png`;
    await writeFile(path,Buffer.from(capture.data,'base64'));
    const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
    const target=JSON.parse(stdout).find(item=>item.text==='Harbor Research');assert.ok(target,stdout);
    const point={x:target.x*1280,y:target.y*900};
    for(const eventType of ['mouseMoved','mousePressed','mouseReleased']) {
      await send('Input.dispatchMouseEvent',{type:eventType,...point,pointerType:'mouse',button:eventType==='mouseMoved'?'none':'left',buttons:eventType==='mousePressed'?1:0,clickCount:eventType==='mouseMoved'?0:1});
    }
    const final=await report();
    const down=final.events.find(event=>event.type==='pointerdown');assert.ok(down);assert.equal(down.trusted,true);
    assert.equal(final.accepted,type==='headed'?1:0,JSON.stringify(final.detector));assert.equal(final.blocked,type!=='headed');
    assert.ok(chrome.commands.every(name=>!name.startsWith('Runtime.')&&!name.startsWith('Debugger.')));
    results.push({type,repetition,version:version.product,point,final,commands:[...new Set(chrome.commands)]});
  } finally {await chrome.close();}
}
for(const type of ['stock-playwright','marker-disabled-playwright']) for(let repetition=0;repetition<3;repetition++) {
  const browser=await chromium.launch({headless:false,channel:'chrome',args:type==='marker-disabled-playwright'?['--disable-blink-features=AutomationControlled']:[]});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.goto('http://127.0.0.1:5173/bot-signal.html');
    await page.waitForFunction(()=>document.title.startsWith('Detector result:'));
    const path=`artifacts/bot-signal/playwright-${repetition}.png`;
    await page.screenshot({path});
    const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
    const target=JSON.parse(stdout).find(item=>item.text==='Harbor Research');assert.ok(target);
    await page.mouse.move(target.x*1280,target.y*900);
    await page.mouse.click(target.x*1280,target.y*900);
    const final=JSON.parse((await page.title()).slice(16));
    assert.equal(final.blocked,!final.detector.isLegitClient);
    assert.equal(final.accepted,final.detector.isLegitClient?1:0);
    results.push({type,repetition,version:browser.version(),final});
  } finally {await browser.close();}
}
await writeFile('docs/bot-signal-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({type,repetition,final})=>({type,repetition,accepted:final.accepted,blocked:final.blocked,detector:final.detector})),null,2));

if(process.argv.includes('--require-blocking')) assert.equal(results.filter(result=>result.final.accepted>0).length,0,'Adaptive automation completed actions');
