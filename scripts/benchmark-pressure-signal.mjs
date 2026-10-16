import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {PNG} from 'pngjs';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[];
const directory='artifacts/pressure-signal';await mkdir(directory,{recursive:true});
assert.ok((await fetch('http://127.0.0.1:5173/pressure-signal-probe.html')).ok,'The local fixture server is unavailable');
for(let repetition=0;repetition<3;repetition++)for(const mode of ['real-idle','real-burst','virtual-critical','virtual-nominal']){
  const chrome=await launchRawCDP({headless:false});let diagnostic;
  try{
    const version=(await chrome.send('Browser.getVersion')).product;
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});await send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
    const requested=mode==='virtual-critical'?'critical':mode==='virtual-nominal'?'nominal':undefined;
    if(requested){await send('Emulation.setPressureSourceOverrideEnabled',{enabled:true,source:'cpu'});await send('Emulation.setPressureStateOverride',{source:'cpu',state:requested});}
    const navigation=await send('Page.navigate',{url:'http://127.0.0.1:5173/pressure-signal-probe.html'});assert.ok(!navigation.errorText,navigation.errorText);
    async function status(){const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});return targetInfo.title.startsWith('{')?JSON.parse(targetInfo.title):undefined;}
    let before;
    for(let i=0;i<100;i++){
      before=await status();
      if(before?.ready&&(before.records.length||before.error||!before.available))break;
      await sleep(100);
    }
    diagnostic={before};assert.ok(before?.ready,'Pressure observer did not initialize');
    if(requested)assert.equal(before.records.at(-1)?.state,requested,'The virtual pressure positive control did not arrive');
    const frames=[];let firstPath,lastPath,lastData;
    async function capture(){
      const {data}=await send('Page.captureScreenshot',{fromSurface:true,optimizeForSpeed:true});
      const bytes=Buffer.from(data,'base64'),png=PNG.sync.read(bytes);let green=0,black=0;
      for(let y=230;y<340;y++)for(let x=200;x<700;x++){const i=(y*png.width+x)*4;const [r,g,b]=png.data.subarray(i,i+3);if(g>80&&g>r*1.4&&g>b*1.4)green++;if(r<8&&g<8&&b<8)black++;}
      frames.push({green,black});
      if(frames.length===1){firstPath=`${directory}/${mode}-${repetition}-first.png`;await writeFile(firstPath,bytes);}
      lastPath=`${directory}/${mode}-${repetition}-last.png`;lastData=bytes;
    }
    const started=Date.now();
    if(mode==='real-idle'){await sleep(2500);await capture();}
    else while(Date.now()-started<2500)await capture();
    await writeFile(lastPath,lastData);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:310,y:390,button:'left',buttons:1,clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:310,y:390,button:'left',buttons:0,clickCount:1});
    const after=await status();
    async function read(path){const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);const text=JSON.parse(stdout).map(item=>item.text).join('').replace(/\s/g,'').toLowerCase();return{text,readable:text.includes('pressuretoken5824')};}
    const first=await read(firstPath),last=await read(lastPath);diagnostic={before,after,frames,first,last};
    if(requested==='critical'){assert.ok(frames.every(frame=>frame.black===500*110));assert.equal(first.readable,false);assert.equal(after.accepted,0);}
    if(requested==='nominal'){assert.ok(first.readable&&last.readable);assert.equal(after.blocked,false);assert.equal(after.accepted,1);}
    assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    results.push({mode,repetition,version,headless:false,pressureSampleAcquired:after.records.length>0,...diagnostic,commands:[...new Set(chrome.commands)]});
  }catch(error){results.push({mode,repetition,error:error.message,diagnostic});}
  finally{await chrome.close();}
}
await writeFile('docs/pressure-signal-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,before,after,first,last,error})=>({mode,repetition,available:before?.available,apiError:before?.error,state:after?.records.at(-1)?.state,blocked:after?.blocked,accepted:after?.accepted,firstReadable:first?.readable,lastReadable:last?.readable,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'Pressure signal measurement failed');
