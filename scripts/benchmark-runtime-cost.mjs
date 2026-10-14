import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { launchRawCDP } from './raw-cdp.mjs';
const results=[];
for (let repetition=0;repetition<3;repetition++) for (const mode of ['bare','runtime-enabled','runtime-zero','runtime-disabled']) {
  const chrome=await launchRawCDP();
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    if (mode!=='bare') await chrome.send('Runtime.enable',{},sessionId);
    if (mode==='runtime-zero') await chrome.send('Runtime.setMaxCallStackSizeToCapture',{size:0},sessionId);
    if (mode==='runtime-disabled') await chrome.send('Runtime.disable',{},sessionId);
    await chrome.send('Page.navigate',{url:'http://127.0.0.1:5173/runtime-cost.html'},sessionId);
    let measurements;
    for (let attempt=0;attempt<100;attempt++) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      if (targetInfo.title.startsWith('result:')) {measurements=JSON.parse(targetInfo.title.slice(7));break;}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.ok(measurements,'Measurement did not finish');
    assert.equal(measurements.length,6);
    const capture=await chrome.send('Page.captureScreenshot',{captureBeyondViewport:false},sessionId);
    await writeFile(`artifacts/runtime-cost/${mode}-${repetition}.png`,Buffer.from(capture.data,'base64'));
    results.push({repetition,mode,version:version.product,measurements,commands:[...new Set(chrome.commands)]});
  } finally {await chrome.close();}
}
await writeFile('docs/runtime-cost-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,measurements})=>({mode,repetition,measurements:measurements.filter(({depth})=>depth===80).map(({depth,throwing,medianMs})=>({depth,throwing,medianMs}))})),null,2));
