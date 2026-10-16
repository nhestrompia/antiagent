import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchRawCDP} from './raw-cdp.mjs';

const origin='http://127.0.0.1:5173';
assert.ok((await fetch(`${origin}/protected-ui.html`)).ok,'Start the local fixture server on port 5173');
const chrome=await launchRawCDP({headless:false});
try{
  const version=await chrome.send('Browser.getVersion');
  const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
  const send=(method,params)=>chrome.send(method,params,sessionId);
  await send('Page.enable');
  const loaded=new Promise(resolve=>{const stop=chrome.onEvent('Page.loadEventFired',sessionId,()=>{stop();resolve();});});
  await send('Page.navigate',{url:`${origin}/protected-ui.html`});
  let timer;try{await Promise.race([loaded,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Fixture load timed out')),10000);})]);}finally{clearTimeout(timer);}
  const {result,exceptionDetails}=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
    const codecs=['video/mp4; codecs="avc1.42c00a"','video/mp4; codecs="avc1.640028"','video/webm; codecs="vp09.00.10.08"','video/mp4; codecs="hvc1.1.6.L93.B0"'];
    const records=[];
    for(const contentType of codecs)for(const robustness of ['SW_SECURE_DECODE','HW_SECURE_CRYPTO','HW_SECURE_DECODE','HW_SECURE_ALL']){
      try{const access=await navigator.requestMediaKeySystemAccess('com.widevine.alpha',[{initDataTypes:['cenc'],sessionTypes:['temporary'],persistentState:'not-allowed',distinctiveIdentifier:'not-allowed',videoCapabilities:[{contentType,robustness}]}]);records.push({contentType,robustness,supported:true,selected:access.getConfiguration()});}
      catch(error){records.push({contentType,robustness,supported:false,error:{name:error.name,message:error.message}});}
    }
    return{secureContext:isSecureContext,userAgent:navigator.userAgent,records};
  })()`});
  assert.equal(exceptionDetails,undefined,'Capability evaluation threw');
  const report={recordedAt:new Date().toISOString(),version,headless:false,...result.value,limits:'Capability negotiation only; no license, playback, hardware-path attestation, or capture protection verified. Runtime is deliberately used by this diagnostic, not an adversarial route.'};
  assert.equal(report.records.length,16);
  assert.ok(report.records.some(record=>record.robustness==='SW_SECURE_DECODE'&&record.supported),'No software Widevine positive control; capability results are inconclusive');
  await mkdir('artifacts/protected-playback',{recursive:true});
  await writeFile('artifacts/protected-playback/capabilities.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({browser:version.product,secureContext:report.secureContext,records:report.records.map(({contentType,robustness,supported,error})=>({contentType,robustness,supported,error:error?.name}))},null,2));
}finally{await chrome.close();}
