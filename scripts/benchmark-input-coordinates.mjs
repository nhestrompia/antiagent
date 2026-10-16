import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launchRawCDP} from './raw-cdp.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results=[];
assert.ok((await fetch('http://127.0.0.1:5173/input-coordinate-probe.html')).ok,'The local fixture server is unavailable');
for(let repetition=0;repetition<3;repetition++)for(const emulated of [false,true])for(const scrolled of [false,true]) {
  const chrome=await launchRawCDP({headless:false});
  let diagnostic;
  try {
    const version=(await chrome.send('Browser.getVersion')).product;
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    const {windowId}=await chrome.send('Browser.getWindowForTarget',{targetId});
    await chrome.send('Browser.setWindowBounds',{windowId,bounds:{left:160,top:100,width:1000,height:800,windowState:'normal'}});
    await chrome.send('Target.activateTarget',{targetId});
    if(emulated)await send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
    const navigation=await send('Page.navigate',{url:'http://127.0.0.1:5173/input-coordinate-probe.html'+(scrolled?'?scroll=on':'')});assert.ok(!navigation.errorText,navigation.errorText);
    let ready=false;
    for(let i=0;i<100;i++) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      if(targetInfo.title==='Input probe ready'||targetInfo.title.startsWith('{')){ready=true;break;}
      await sleep(50);
    }
    assert.ok(ready,'Input fixture did not initialize');
    for(const [x,y] of [[100,140],[120,160],[160,180]]) {
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await sleep(40);
    }
    const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
    const measurement=JSON.parse(targetInfo.title);
    diagnostic=measurement;
    assert.ok(measurement.samples.some(sample=>sample.type==='mousemove'&&sample.isTrusted));
    if(scrolled)assert.ok(measurement.window.scrollY>0,'The scrolled control did not scroll');
    else assert.equal(measurement.window.scrollY,0);
    assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    results.push({repetition,emulated,scrolled,version,headless:false,measurement,commands:[...new Set(chrome.commands)]});
  } catch(error) {results.push({repetition,emulated,scrolled,error:error.message,diagnostic});}
  finally {await chrome.close();}
}
await writeFile('docs/input-coordinate-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({repetition,emulated,scrolled,measurement,error})=>({repetition,emulated,scrolled,samples:measurement?.samples,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'Coordinate measurement failed');
