import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { launchRawCDP } from './raw-cdp.mjs';
const execute=promisify(execFile);
const isolated=process.env.ISOLATED==='1'||process.argv.includes('--isolated');
const freshness=process.argv.includes('--freshness');
const holdCapture=process.argv.includes('--hold-capture');
const fastCapture=process.argv.includes('--fast-capture');
const decoyMask=process.argv.includes('--decoy-mask');
const stableColumns=process.argv.includes('--stable-columns');
const virtualClock=process.argv.includes('--virtual-clock');
const clockGuard=process.argv.includes('--clock-guard');
const leanCapture=process.argv.includes('--lean-capture');
const captureFrames=Number(process.env.CAPTURE_FRAMES||(fastCapture?32:64));
assert.ok(Number.isInteger(captureFrames)&&captureFrames>0&&captureFrames<=256);
const layered=process.argv.includes('--layered');
const allGuards=layered||process.argv.includes('--all-guards');
const directory=freshness?'artifacts/freshness-guards':layered?'artifacts/layered-guards':allGuards?'artifacts/combined-guards':isolated?'artifacts/isolated-frame':'artifacts/bare-cdp';
await mkdir(directory,{recursive:true});
const results=[];
function textDistance(a,b) {
  a=a.toLowerCase().replace(/[^a-z0-9]/g,'');b=b.toLowerCase().replace(/[^a-z0-9]/g,'');
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {const next=[i];for(let j=1;j<=b.length;j++) next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
  return row[b.length];
}
function retainedLetters(text,label) {
  text=text.toLowerCase().replace(/[^a-z0-9]/g,'');label=label.toLowerCase().replace(/[^a-z0-9]/g,'');
  let row=Array(label.length+1).fill(0);
  for(const letter of text){const next=[0];for(let i=1;i<=label.length;i++)next[i]=letter===label[i-1]?row[i-1]+1:Math.max(row[i],next[i-1]);row=next;}
  return row[label.length]/label.length;
}
for(const mode of (process.env.MODES?.split(',')||['bare','runtime-enabled','runtime-zero','runtime-disabled'])) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP({headless:!layered});
  let failureDiagnostic;
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    if(fastCapture)await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:100,y:100});
    if(mode!=='bare'&&mode!=='runtime-late') await send('Runtime.enable');
    if(mode==='runtime-zero') await send('Runtime.setMaxCallStackSizeToCapture',{size:0});
    if(mode==='runtime-disabled') await send('Runtime.disable');
    const navigation=await send('Page.navigate',{url:layered?'http://127.0.0.1:5173/combined-defense.html?defense=layered'+(freshness?'&fresh=on':'')+(decoyMask?'&mask=decoy':'')+(clockGuard?'&clock=on':''):allGuards?'http://127.0.0.1:5173/combined-defense.html?defense=combined':isolated?'http://127.0.0.1:5173/isolated-frame.html':'http://127.0.0.1:5173/combined-defense.html?runtime=on'});
    assert.ok(!navigation.errorText,navigation.errorText);
    if(layered) {
      let ready=false;
      for(let attempt=0;attempt<300;attempt++){const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});if(targetInfo.title==='Defense ready'){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}
      assert.ok(ready,'Layered initialization did not finish');
    }
    const readyAt=Date.now();
    if(virtualClock)await send('Emulation.setVirtualTimePolicy',{policy:'pause'});
    async function delay(ms) {
      if(!virtualClock)return new Promise(resolve=>setTimeout(resolve,ms));
      let unsubscribe,timer;
      const expired=new Promise((resolve,reject)=>{unsubscribe=chrome.onEvent('Emulation.virtualTimeBudgetExpired',sessionId,resolve);timer=setTimeout(()=>reject(new Error('Virtual time budget event timeout')),5000);});
      try{await send('Emulation.setVirtualTimePolicy',{policy:'advance',budget:ms,maxVirtualTimeTaskStarvationCount:100});await expired;}
      finally{clearTimeout(timer);unsubscribe();}
    }
    await new Promise(resolve=>setTimeout(resolve,fastCapture?50:500));
    if(isolated) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      assert.equal(targetInfo.title,'Isolated frame SecurityError');
    }
    if(mode==='runtime-late') {await send('Runtime.enable');await new Promise(resolve=>setTimeout(resolve,2200));}
    let captureIndex=0;
    const captureTimings=[];
    async function observe(frameCount=1) {
      const started=Date.now();
      const cropped=fastCapture&&frameCount>1;
      const images=[];
      for(let frame=0;frame<frameCount;frame++) {
        if(virtualClock&&frameCount>1)await delay(17);
        let capture;
        for(let attempt=0;attempt<2;attempt++) {
          try {capture=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false,optimizeForSpeed:fastCapture,...(cropped?{clip:{x:220,y:300,width:670,height:110,scale:1}}:{})});break;}
          catch(error) {if(attempt||!error.message.startsWith('CDP timeout:')) throw error;}
        }
        images.push(PNG.sync.read(Buffer.from(capture.data,'base64')));
        if(frameCount>1&&!fastCapture) await new Promise(resolve=>setTimeout(resolve,19));
      }
      const combined=PNG.sync.read(PNG.sync.write(images[0]));
      if(cropped) {
        // Visible columns retain the colored button background; hidden noise is grayscale.
        for(let x=0;x<combined.width;x++) {
          let best=0,bestScore=-1;
          const repeats=new Map();
          if(stableColumns)for(let frame=0;frame<frameCount;frame++) {
            const column=Buffer.alloc(50*4);let white=0;
            for(let y=30;y<80;y++){const offset=(y*combined.width+x)*4;images[frame].data.copy(column,(y-30)*4,offset,offset+4);if(images[frame].data[offset]>150)white++;}
            const key=column.toString('base64');
            const entry=repeats.get(key)||{count:0,frame,white};entry.count++;repeats.set(key,entry);
          }
          if(stableColumns)for(const entry of repeats.values()) {
            const score=entry.count*100+entry.white;
            if(score>bestScore){best=entry.frame;bestScore=score;}
          }
          else for(let frame=0;frame<frameCount;frame++) {
            let score=0;
            for(let y=0;y<combined.height;y++){const offset=(y*combined.width+x)*4;if(images[frame].data[offset]!==images[frame].data[offset+1])score++;}
            if(score>bestScore){best=frame;bestScore=score;}
          }
          for(let y=0;y<combined.height;y++){const offset=(y*combined.width+x)*4;images[best].data.copy(combined.data,offset,offset,offset+4);}
        }
      } else if(frameCount>1) {
        const samples=new Uint8Array(frameCount);
        for(let y=cropped?0:300;y<(cropped?110:410);y++) for(let x=cropped?0:220;x<(cropped?670:890);x++) {
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
      captureTimings.push({frameCount,cropped,elapsedMs:Date.now()-started});
      return JSON.parse(stdout).map(item=>cropped?{...item,x:(220+item.x*670)/1280,y:(300+item.y*110)/900}:item);
    }
    const initial=leanCapture?[]:await observe();
    const observations=[];
    if((mode!=='runtime-enabled'&&mode!=='runtime-late')||isolated) for(const label of ['Harbor Research','125 EUR','Confirm transfer']) {
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:250,y:180});
      if(!leanCapture)await delay(100);
      if(holdCapture) {
        for(let sample=0;sample<8;sample++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:223+sample*10,y:292+sample*10});await new Promise(resolve=>setTimeout(resolve,60));}
        await new Promise(resolve=>setTimeout(resolve,300));
        await send('Input.dispatchMouseEvent',{type:'mousePressed',x:293,y:362,button:'left',buttons:1,clickCount:1});
      }
      let text,target;
      for(let attempt=0;attempt<3&&!target;attempt++){
        text=await observe(allGuards?captureFrames:1);
        const digits=label.match(/\d+/)?.[0];
        const candidates=text.filter(item=>!digits||item.text.match(/\d+/g)?.includes(digits));
        const nearest=candidates.map(item=>({...item,distance:textDistance(item.text,label)})).sort((a,b)=>a.distance-b.distance);
        if(nearest[0]?.distance<=(fastCapture?2:0))target=nearest[0];
        if(!target&&stableColumns){const ranked=candidates.map(item=>({...item,score:retainedLetters(item.text,label)})).sort((a,b)=>b.score-a.score);if(ranked[0]?.score>=0.9)target=ranked[0];}
      }
      if(!target){const diagnostic=await observe();failureDiagnostic=diagnostic;if(diagnostic.map(item=>item.text).join('').replace(/\s/g,'').includes('\"blocked\":true')) break;}
      assert.ok(target,`No target ${label}: ${JSON.stringify(text)}`);
      const point={x:target.x*1280,y:target.y*900};
      if(holdCapture) {
        const phase=(Date.now()-readyAt)%3000;
        if(phase>750)await new Promise(resolve=>setTimeout(resolve,3300-phase));
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:100,y:100,buttons:1});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:100,y:100,button:'left',buttons:0,clickCount:1});
      }
      observations.push({label,point,frameCount:allGuards?captureFrames:1});
      for(let sample=0;sample<(fastCapture?4:8);sample++) {
        const distance=fastCapture?60-sample*20:70-sample*10;
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x-distance,y:point.y-distance});
        await delay(fastCapture?30:60);
      }
      await delay(fastCapture?170:300);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});
      if(fastCapture)await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:100,y:100});
    }
    const final=await observe();
    const completed=final.some(item=>textDistance(item.text,'Task complete')<=2);
    const text=final.map(item=>item.text).join('').toLowerCase().replace(/\s/g,'');
    const blocked=text.includes('"blocked":true');
    if((mode==='runtime-enabled'||mode==='runtime-late')&&!isolated) {assert.equal(completed,false);assert.equal(blocked,true);assert.ok(text.includes(mode==='runtime-late'?'runtime-attached':'runtime-cost'));}
    else if(freshness) {assert.equal(completed||blocked,true,JSON.stringify(final));}
    else {assert.equal(completed,true,JSON.stringify(final));assert.equal(blocked,false);}
    if(mode==='bare') assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    results.push({mode,repetition,version:version.product,completed,blocked,screenshotCount:chrome.commands.filter(command=>command==='Page.captureScreenshot').length,captureTimings,observations,initial,final,commands:[...new Set(chrome.commands)]});
  } catch(error) {results.push({mode,repetition,error:error.message,diagnostic:failureDiagnostic,commands:[...new Set(chrome.commands)]});}
  finally {await chrome.close();}
}
await writeFile(process.env.RESULT_PATH||(decoyMask?(stableColumns?'docs/decoy-stable-results.json':'docs/decoy-color-results.json'):freshness?(holdCapture?'docs/freshness-bounded-hold-results.json':fastCapture?'docs/freshness-fast-results.json':'docs/freshness-slow-results.json'):process.argv.includes('--audit')?'docs/agent-route-layered-results.json':layered?(process.env.MODES==='bare'?'docs/layered-guards-results.json':'docs/layered-monitor-results.json'):allGuards?'docs/combined-guards-results.json':isolated?(process.env.MODES?'docs/isolated-frame-regression-results.json':'docs/isolated-frame-results.json'):'docs/bare-cdp-results.json'),JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,completed,blocked,error})=>({mode,repetition,completed,blocked,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'One or more capture/input cases did not finish');

if(process.argv.includes('--require-blocking')) {
  const bypasses=results.filter(({completed,blocked})=>completed||!blocked);
  assert.equal(bypasses.length,0,`Agent-proof acceptance failed: ${bypasses.length} sessions bypassed the guard`);
}
