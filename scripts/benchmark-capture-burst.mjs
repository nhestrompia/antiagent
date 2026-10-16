import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),results=[],directory='artifacts/capture-burst';await mkdir(directory,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(let repetition=0;repetition<3;repetition++)for(const mode of ['idle','screenshots','screencast']){
  const chrome=await launchRawCDP({headless:false});let frameCount=0;
  try{
    const version=(await chrome.send('Browser.getVersion')).product;
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'}),{sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    const navigation=await send('Page.navigate',{url:'http://127.0.0.1:5173/combined-defense.html?defense=layered&fresh=on&mask=decoy&clock=on&jitter=on&timing=on'});assert.ok(!navigation.errorText,navigation.errorText);
    let ready=false;for(let attempt=0;attempt<300;attempt++){const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});if(targetInfo.title==='Defense ready'){ready=true;break;}await sleep(100);}assert.ok(ready,'Initialization failed');
    await sleep(500);
    const key=async value=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code:value==='s'?'KeyS':'KeyE'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code:value==='s'?'KeyS':'KeyE'});};
    await key('s');const started=Date.now();let unsubscribe;
    if(mode==='screencast'){
      unsubscribe=chrome.onEvent('Page.screencastFrame',sessionId,event=>{frameCount++;send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
      await send('Page.startScreencast',{format:'jpeg',quality:80,everyNthFrame:1});
    }
    if(mode==='screenshots')while(Date.now()-started<3000){await send('Page.captureScreenshot',{fromSurface:true,optimizeForSpeed:true,clip:{x:220,y:300,width:670,height:110,scale:1}});frameCount++;}
    else await sleep(3000);
    if(mode==='screencast'){await send('Page.stopScreencast');unsubscribe();}
    await key('e');await sleep(100);
    const {data}=await send('Page.captureScreenshot',{fromSurface:true});const path=`${directory}/${mode}-${repetition}.png`;await writeFile(path,Buffer.from(data,'base64'));
    const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]),text=JSON.parse(stdout);
    const metrics={};for(const item of text){const match=item.text.match(/^(Frames|Median|P95|Maximum|Over25)\s+([\d.]+)/);if(match)metrics[match[1]]=Number(match[2]);}
    assert.ok(metrics.Frames>0,`Missing timing summary: ${stdout}`);
    for(const metric of ['Median','P95','Maximum','Over25'])assert.ok(Number.isFinite(metrics[metric]),`Missing ${metric}: ${stdout}`);
    const diagnostic=text.map(item=>item.text).join('').toLowerCase().replace(/\s/g,'');
    for(const field of ['"ready":true','"drmverified":true','"detectorsallowed":true','"blocked":false'])assert.ok(diagnostic.includes(field),`Renderer measurement is not valid without ${field}: ${stdout}`);
    assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    results.push({mode,repetition,version,conditions:{headless:false,rendererVerified:true},frameCount,wallMs:Date.now()-started,metrics,text,commands:[...new Set(chrome.commands)]});
  }catch(error){results.push({mode,repetition,error:error.message});}
  finally{await chrome.close();}
}
await writeFile('docs/capture-burst-results.json',JSON.stringify({results},null,2));console.log(JSON.stringify(results.map(({mode,repetition,frameCount,metrics,error})=>({mode,repetition,frameCount,metrics,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'Capture-burst measurement did not finish');
