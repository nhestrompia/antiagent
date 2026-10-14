import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchRawCDP } from './raw-cdp.mjs';
const execute=promisify(execFile);
const isolated=process.env.ISOLATED==='1'||process.argv.includes('--isolated');
const directory=isolated?'artifacts/isolated-frame':'artifacts/bare-cdp';
await mkdir(directory,{recursive:true});
const results=[];
function textDistance(a,b) {
  a=a.toLowerCase().replace(/[^a-z0-9]/g,'');b=b.toLowerCase().replace(/[^a-z0-9]/g,'');
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {const next=[i];for(let j=1;j<=b.length;j++) next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
  return row[b.length];
}
for(const mode of ['bare','runtime-enabled','runtime-zero','runtime-disabled']) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP();
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    if(mode!=='bare') await send('Runtime.enable');
    if(mode==='runtime-zero') await send('Runtime.setMaxCallStackSizeToCapture',{size:0});
    if(mode==='runtime-disabled') await send('Runtime.disable');
    await send('Page.navigate',{url:isolated?'http://127.0.0.1:5173/isolated-frame.html':'http://127.0.0.1:5173/combined-defense.html?runtime=on'});
    await new Promise(resolve=>setTimeout(resolve,500));
    if(isolated) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      assert.equal(targetInfo.title,'Isolated frame SecurityError');
    }
    let captureIndex=0;
    async function observe() {
      const capture=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});
      const path=`${directory}/${mode}-${repetition}-${captureIndex++}.png`;
      await writeFile(path,Buffer.from(capture.data,'base64'));
      const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
      return JSON.parse(stdout);
    }
    const initial=await observe();
    const observations=[];
    if(mode!=='runtime-enabled'||isolated) for(const label of ['Harbor Research','125 EUR','Confirm transfer']) {
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:250,y:180});
      await new Promise(resolve=>setTimeout(resolve,100));
      const text=await observe();
      const target=text.map(item=>({...item,distance:textDistance(item.text,label)})).filter(item=>item.distance<=2).sort((a,b)=>a.distance-b.distance)[0];
      assert.ok(target,`No target ${label}: ${JSON.stringify(text)}`);
      const point={x:target.x*1280,y:target.y*900};
      observations.push({label,point});
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
    if(mode==='runtime-enabled'&&!isolated) {assert.equal(completed,false);assert.equal(blocked,true);assert.ok(text.includes('runtime-cost'));}
    else {assert.equal(completed,true,JSON.stringify(final));assert.equal(blocked,false);}
    if(mode==='bare') assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    results.push({mode,repetition,version:version.product,completed,blocked,observations,initial,final,commands:[...new Set(chrome.commands)]});
  } finally {await chrome.close();}
}
await writeFile(isolated?'docs/isolated-frame-results.json':'docs/bare-cdp-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,completed,blocked})=>({mode,repetition,completed,blocked})),null,2));
