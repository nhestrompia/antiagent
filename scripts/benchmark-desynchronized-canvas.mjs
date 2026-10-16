import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchRawCDP } from './raw-cdp.mjs';
const execute=promisify(execFile),results=[];
await mkdir('artifacts/desynchronized-canvas',{recursive:true});
for(const headless of [true,false]) for(const kind of ['2d','webgl']) for(const desynchronized of [false,true]) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP({headless});
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:`http://127.0.0.1:5173/desynchronized-canvas.html?kind=${kind}&desync=${desynchronized?1:0}`});
    async function readReport() {
      for(let attempt=0;attempt<50;attempt++) {
        const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
        if(targetInfo.title.startsWith('Canvas result:')) return JSON.parse(targetInfo.title.slice(14));
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      throw new Error('Canvas report did not finish');
    }
    const initial=await readReport();
    assert.ok(!initial.error,initial.error);
    await new Promise(resolve=>setTimeout(resolve,100));
    const capture=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});
    const path=`artifacts/desynchronized-canvas/${headless}-${kind}-${desynchronized}-${repetition}.png`;
    await writeFile(path,Buffer.from(capture.data,'base64'));
    const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
    const text=JSON.parse(stdout);
    const target=text.find(item=>item.text==='Harbor Research');
    assert.ok(target,`Screenshot did not expose Harbor Research: ${stdout}`);
    const point={x:target.x*1280,y:target.y*900};
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});
    const final=await readReport();assert.equal(final.accepted,1);
    results.push({headless,kind,desynchronized,repetition,version:version.product,initial,final,point,commands:[...new Set(chrome.commands)]});
  } catch(error) {results.push({headless,kind,desynchronized,repetition,error:error.message});}
  finally {await chrome.close();}
}
await writeFile('docs/desynchronized-canvas-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({headless,kind,desynchronized,repetition,initial,final,error})=>({headless,kind,desynchronized,repetition,actual:initial?.actual?.desynchronized,accepted:final?.accepted,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'One or more canvas cases failed');
