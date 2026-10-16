import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {PNG} from 'pngjs';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[];
const directory='artifacts/gpu-pixel-guard';await mkdir(directory,{recursive:true});
assert.ok((await fetch('http://127.0.0.1:5173/gpu-pixel-guard.html')).ok,'The local fixture server is unavailable');
const cases=['off-burst','on-burst','on-cropped','on-sparse','on-idle','on-cpu','forced-black'];
for(let repetition=0;repetition<3;repetition++)for(const mode of cases){
  const chrome=await launchRawCDP({headless:false});let diagnostic;
  try{
    const version=(await chrome.send('Browser.getVersion')).product;
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    let {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});await send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
    const navigation=await send('Page.navigate',{url:'http://127.0.0.1:5173/gpu-pixel-guard.html?'+(mode==='off-burst'||mode==='forced-black'?'':'guard=on')+(mode==='on-cpu'?'&cpu=on':'')});assert.ok(!navigation.errorText,navigation.errorText);
    async function status(){const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});return targetInfo.title.startsWith('{')?JSON.parse(targetInfo.title):undefined;}
    let before;
    for(let i=0;i<150;i++){before=await status();if(before?.ready)break;await sleep(50);}
    assert.ok(before?.ready,'Pixel guard did not initialize');
    if(mode==='forced-black'){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'b',code:'KeyB'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'b',code:'KeyB'});await sleep(100);}
    const frames=[],started=Date.now();let firstPath,lastPath,lastData;
    async function capture(){
      const atMs=Date.now()-started,cropped=mode==='on-cropped';
      const {data}=await send('Page.captureScreenshot',{fromSurface:true,optimizeForSpeed:true,...(cropped?{clip:{x:600,y:230,width:350,height:110,scale:1}}:{})});
      const png=PNG.sync.read(Buffer.from(data,'base64'));let greenPixels=0,blackPixels=0;
      for(let y=0;y<110;y++)for(let x=0;x<350;x++){
        const i=((y+(cropped?0:230))*png.width+x+(cropped?0:600))*4;
        const [r,g,b]=png.data.subarray(i,i+3);
        if(g>80&&g>r*1.4&&g>b*1.4)greenPixels++;
        if(r<8&&g<8&&b<8)blackPixels++;
      }
      frames.push({atMs,greenPixels,blackPixels});
      const path=`${directory}/${mode}-${repetition}-${frames.length===1?'first':'last'}.png`;
      if(frames.length===1){firstPath=path;await writeFile(path,Buffer.from(data,'base64'));}
      lastPath=`${directory}/${mode}-${repetition}-last.png`;lastData=Buffer.from(data,'base64');
    }
    if(mode==='on-idle'||mode==='on-cpu'){
      await chrome.send('Target.detachFromTarget',{sessionId});await sleep(3600);
      ({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));
      const afterIdle=await status();diagnostic={before,afterIdle};await capture();
    }else{
      while(Date.now()-started<3600){await capture();if(mode==='on-sparse')await sleep(500);if(mode==='forced-black')break;}
    }
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:710,y:390,button:'left',buttons:1,clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:710,y:390,button:'left',buttons:0,clickCount:1});
    const after=await status();
    await writeFile(lastPath,lastData);
    async function read(path){const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);const text=JSON.parse(stdout).map(item=>item.text).join('').replace(/\s/g,'').toLowerCase();return {readable:text.includes('appsecret7391'),text};}
    const first=await read(firstPath),last=await read(lastPath);
    diagnostic={before,after,frames,first,last,...diagnostic};
    assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    if(mode==='off-burst'){assert.ok(first.readable&&last.readable);assert.equal(after.accepted,1);}
    if(mode==='forced-black'){assert.ok(frames.every(frame=>frame.blackPixels===350*110));assert.equal(first.readable,false);assert.equal(after.accepted,0);assert.equal(after.reason,'forced-control');}
    results.push({mode,repetition,version,headless:false,...diagnostic,commands:[...new Set(chrome.commands)]});
  }catch(error){results.push({mode,repetition,error:error.message,diagnostic});}
  finally{await chrome.close();}
}
await writeFile('docs/gpu-pixel-guard-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,before,after,first,last,error})=>({mode,repetition,preblocked:before?.blocked,blocked:after?.blocked,accepted:after?.accepted,firstReadable:first?.readable,lastReadable:last?.readable,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'Pixel guard measurement failed');
