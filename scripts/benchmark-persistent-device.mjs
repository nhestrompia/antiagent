import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchRawCDP } from './raw-cdp.mjs';
const execute=promisify(execFile),results=[];
await mkdir('artifacts/persistent-device',{recursive:true});
for(const type of ['mouse','pen','touch']) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP();
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:5173/persistent-device.html'});
    async function report(){
      for(let attempt=0;attempt<50;attempt++) {
        const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
        if(targetInfo.title.startsWith('Device result:')) return JSON.parse(targetInfo.title.slice(14));
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      throw new Error('Device fixture did not render');
    }
    const initial=await report();assert.equal(initial.supported,true);
    const capture=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});
    const path=`artifacts/persistent-device/${type}-${repetition}.png`;
    await writeFile(path,Buffer.from(capture.data,'base64'));
    const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
    const target=JSON.parse(stdout).find(item=>item.text==='Harbor Research');assert.ok(target,stdout);
    const point={x:target.x*1280,y:target.y*900};
    if(type==='touch') {
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:7}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } else {
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point,pointerType:type});
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,pointerType:type,button:'left',buttons:1,clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,pointerType:type,button:'left',buttons:0,clickCount:1});
    }
    const final=await report();
    const down=final.events.find(event=>event.type==='pointerdown');assert.ok(down);assert.equal(down.trusted,true);
    if(type==='mouse') {assert.ok(down.persistentDeviceId>0);assert.equal(final.accepted,1);assert.equal(final.blocked,false);}
    else {assert.equal(down.persistentDeviceId,0);assert.equal(final.blocked,true);assert.equal(final.accepted,0);}
    assert.ok(chrome.commands.every(name=>!name.startsWith('Runtime.')&&!name.startsWith('Debugger.')));
    results.push({type,repetition,version:version.product,point,final,commands:[...new Set(chrome.commands)]});
  } finally {await chrome.close();}
}
await writeFile('docs/persistent-device-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({type,repetition,final})=>({type,repetition,accepted:final.accepted,blocked:final.blocked,events:final.events})),null,2));
