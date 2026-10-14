import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { launchRawCDP } from './raw-cdp.mjs';
const execute=promisify(execFile);
const isolated=process.env.ISOLATED==='1'||process.argv.includes('--isolated');
const layered=process.argv.includes('--layered');
const allGuards=layered||process.argv.includes('--all-guards');
const directory=layered?'artifacts/layered-guards':allGuards?'artifacts/combined-guards':isolated?'artifacts/isolated-frame':'artifacts/bare-cdp';
await mkdir(directory,{recursive:true});
const results=[];
function textDistance(a,b) {
  a=a.toLowerCase().replace(/[^a-z0-9]/g,'');b=b.toLowerCase().replace(/[^a-z0-9]/g,'');
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {const next=[i];for(let j=1;j<=b.length;j++) next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
  return row[b.length];
}
for(const mode of (process.env.MODES?.split(',')||['bare','runtime-enabled','runtime-zero','runtime-disabled'])) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP({headless:!layered});
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    if(mode!=='bare'&&mode!=='runtime-late') await send('Runtime.enable');
    if(mode==='runtime-zero') await send('Runtime.setMaxCallStackSizeToCapture',{size:0});
    if(mode==='runtime-disabled') await send('Runtime.disable');
    await send('Page.navigate',{url:layered?'http://127.0.0.1:5173/combined-defense.html?defense=layered':allGuards?'http://127.0.0.1:5173/combined-defense.html?defense=combined':isolated?'http://127.0.0.1:5173/isolated-frame.html':'http://127.0.0.1:5173/combined-defense.html?runtime=on'});
    if(layered) {
      let ready=false;
      for(let attempt=0;attempt<300;attempt++){const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});if(targetInfo.title==='Defense ready'){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}
      assert.ok(ready,'Layered initialization did not finish');
    }
    await new Promise(resolve=>setTimeout(resolve,500));
    if(isolated) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      assert.equal(targetInfo.title,'Isolated frame SecurityError');
    }
    if(mode==='runtime-late') {await send('Runtime.enable');await new Promise(resolve=>setTimeout(resolve,2200));}
    let captureIndex=0;
    async function observe(frameCount=1) {
      const images=[];
      for(let frame=0;frame<frameCount;frame++) {
        let capture;
        for(let attempt=0;attempt<2;attempt++) {
          try {capture=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});break;}
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
    if((mode!=='runtime-enabled'&&mode!=='runtime-late')||isolated) for(const label of ['Harbor Research','125 EUR','Confirm transfer']) {
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
    if((mode==='runtime-enabled'||mode==='runtime-late')&&!isolated) {assert.equal(completed,false);assert.equal(blocked,true);assert.ok(text.includes(mode==='runtime-late'?'runtime-attached':'runtime-cost'));}
    else {assert.equal(completed,true,JSON.stringify(final));assert.equal(blocked,false);}
    if(mode==='bare') assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    results.push({mode,repetition,version:version.product,completed,blocked,screenshotCount:chrome.commands.filter(command=>command==='Page.captureScreenshot').length,observations,initial,final,commands:[...new Set(chrome.commands)]});
  } catch(error) {results.push({mode,repetition,error:error.message});}
  finally {await chrome.close();}
}
await writeFile(process.argv.includes('--audit')?'docs/agent-route-layered-results.json':layered?(process.env.MODES==='bare'?'docs/layered-guards-results.json':'docs/layered-monitor-results.json'):allGuards?'docs/combined-guards-results.json':isolated?(process.env.MODES?'docs/isolated-frame-regression-results.json':'docs/isolated-frame-results.json'):'docs/bare-cdp-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,completed,blocked,error})=>({mode,repetition,completed,blocked,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'One or more capture/input cases did not finish');

if(process.argv.includes('--require-blocking')) {
  const bypasses=results.filter(({completed,blocked})=>completed||!blocked);
  assert.equal(bypasses.length,0,`Agent-proof acceptance failed: ${bypasses.length} sessions bypassed the guard`);
}
