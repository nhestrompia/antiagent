import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),results=[];
await mkdir('artifacts/password-mask',{recursive:true});
for(const strategy of ['value-read','type-reveal']) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP({headless:false});
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:5173/password-mask.html'});
    for(let attempt=0;attempt<50;attempt++) {const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});if(targetInfo.title.startsWith('Mask result:'))break;await new Promise(resolve=>setTimeout(resolve,100));}
    async function capture(stage){const result=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});const path=`artifacts/password-mask/${strategy}-${repetition}-${stage}.png`;await writeFile(path,Buffer.from(result.data,'base64'));const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);return JSON.parse(stdout).map(item=>item.text);}
    const maskedText=await capture('masked');assert.ok(!maskedText.some(text=>text.includes('MASK-')));assert.ok(maskedText.some(text=>text.includes('CAPTURE ALPHA 729')),'Capture hint region unexpectedly absent');
    const {root}=await send('DOM.getDocument');
    const find=async selector=>(await send('DOM.querySelector',{nodeId:root.nodeId,selector})).nodeId;
    let recovered;
    if(strategy==='value-read'){const {object}=await send('DOM.resolveNode',{nodeId:await find('#masked')});const result=await send('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:'function(){return this.value}',returnByValue:true});recovered=result.result.value;}
    else {await send('DOM.setAttributeValue',{nodeId:await find('#masked'),name:'type',value:'text'});const text=await capture('revealed');recovered=text.find(value=>value.startsWith('MASK-'));}
    assert.ok(recovered?.startsWith('MASK-'),'Value not recovered');
    await send('DOM.focus',{nodeId:await find('#response')});await send('Input.insertText',{text:recovered});
    const {model}=await send('DOM.getBoxModel',{nodeId:await find('button')});const q=model.content,point={x:(q[0]+q[2])/2,y:(q[1]+q[5])/2};
    for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...point,button:'left',buttons:type==='mousePressed'?1:0,clickCount:1});
    const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});const final=JSON.parse(targetInfo.title.slice('Mask result:'.length));assert.equal(final.accepted,1);assert.equal(final.trustedInput,true);assert.equal(final.trustedConfirm,true);
    results.push({strategy,repetition,version:version.product,maskedText,recoveredValueLength:recovered.length,final,commands:[...new Set(chrome.commands)]});
  } catch(error){results.push({strategy,repetition,error:error.message});}finally{await chrome.close();}
}
await writeFile('docs/password-mask-results.json',JSON.stringify({results},null,2));console.log(JSON.stringify(results,null,2));assert.equal(results.filter(result=>result.error).length,0);
