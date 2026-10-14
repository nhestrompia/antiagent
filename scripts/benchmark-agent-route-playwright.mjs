import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
const execute=promisify(execFile);
const allGuards=true;
const directory='artifacts/agent-route-playwright';
await mkdir(directory,{recursive:true});
const results=[];
function textDistance(a,b) {
  a=a.toLowerCase().replace(/[^a-z0-9]/g,'');b=b.toLowerCase().replace(/[^a-z0-9]/g,'');
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {const next=[i];for(let j=1;j<=b.length;j++) next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
  return row[b.length];
}
for(let repetition=0;repetition<3;repetition++) {
  const mode='playwright-extra-session-zero';
  const browser=await chromium.launch({channel:'chrome',headless:false,args:['--disable-blink-features=AutomationControlled']});
  const commands=[];
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const client=await page.context().newCDPSession(page);
    const version={product:browser.version()};
    async function send(method,params) {
      if(method==='Input.dispatchMouseEvent') {
        commands.push(params.type==='mouseMoved'?'page.mouse.move':params.type==='mousePressed'?'page.mouse.down':'page.mouse.up');
        if(params.type==='mouseMoved') return page.mouse.move(params.x,params.y);
        if(params.type==='mousePressed') {await page.mouse.move(params.x,params.y);return page.mouse.down();}
        return page.mouse.up();
      }
      commands.push(method);return client.send(method,params);
    }
    await send('Runtime.enable');
    await send('Runtime.setMaxCallStackSizeToCapture',{size:0});
    await page.goto('http://127.0.0.1:5173/combined-defense.html?defense=layered');
    await page.waitForFunction(()=>document.title==='Defense ready',{},{timeout:30000});
    const chrome={commands};
    await new Promise(resolve=>setTimeout(resolve,500));
    let captureIndex=0;
    async function observe(frameCount=1) {
      const images=[];
      for(let frame=0;frame<frameCount;frame++) {
        let capture;
        for(let attempt=0;attempt<2;attempt++) {
          try {commands.push('page.screenshot');capture={data:(await page.screenshot({fullPage:false})).toString('base64')};break;}
          catch(error) {if(attempt||!error.message.startsWith('CDP timeout:')) throw error;}
        }
        images.push(PNG.sync.read(Buffer.from(capture.data,'base64')));
        if(frameCount>1) await new Promise(resolve=>setTimeout(resolve,19));
      }
      const combined=images[0];
      if(frameCount>1) {
        const samples=new Uint8Array(frameCount);
        for(let y=300;y<410;y++) for(let x=220;x<890;x++) {
          const offset=(y*combined.width+x)*4;
          for(let channel=0;channel<3;channel++) {
            for(let frame=0;frame<frameCount;frame++) samples[frame]=images[frame].data[offset+channel];
            samples.sort();combined.data[offset+channel]=samples[Math.floor(frameCount/2)];
          }
        }
      }
      const path=`${directory}/${mode}-${repetition}-${captureIndex++}.png`;
      await writeFile(path,PNG.sync.write(combined));
      const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
      return JSON.parse(stdout);
    }
    const initial=await observe();
    const observations=[];
    if(!initial.map(item=>item.text).join('').replace(/\s/g,'').includes('\"blocked\":true')) for(const label of ['Harbor Research','125 EUR','Confirm transfer']) {
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:250,y:180});
      await new Promise(resolve=>setTimeout(resolve,100));
      let text,target;
      for(let attempt=0;attempt<3&&!target;attempt++){
        text=await observe(allGuards?64:1);
        target=text.find(item=>textDistance(item.text,label)===0);
      }
      assert.ok(target,`No target ${label}: ${JSON.stringify(text)}`);
      const point={x:target.x*1280,y:target.y*900};
      observations.push({label,point,frameCount:allGuards?64:1});
      for(let sample=0;sample<8;sample++) {
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x-70+sample*10,y:point.y-70+sample*10});
        await new Promise(resolve=>setTimeout(resolve,60));
      }
      await new Promise(resolve=>setTimeout(resolve,300));
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});
    }
    const final=await observe();
    const completed=final.some(item=>textDistance(item.text,'Task complete')<=2);
    const text=final.map(item=>item.text).join('').toLowerCase().replace(/\s/g,'');
    const blocked=text.includes('"blocked":true');
    assert.equal(completed||blocked,true,JSON.stringify(final));
    results.push({mode,repetition,version:version.product,completed,blocked,screenshotCount:chrome.commands.filter(command=>command==='page.screenshot').length,observations,initial,final,commands:[...new Set(chrome.commands)]});
  } catch(error) {results.push({mode,repetition,error:error.message});}
  finally {await browser.close();}
}
await writeFile('docs/agent-route-playwright-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,completed,blocked,error})=>({mode,repetition,completed,blocked,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'One or more capture/input cases did not finish');

if(process.argv.includes('--require-blocking')) {
  const bypasses=results.filter(({completed,blocked})=>completed||!blocked);
  assert.equal(bypasses.length,0,`Agent-proof acceptance failed: ${bypasses.length} sessions bypassed the guard`);
}
