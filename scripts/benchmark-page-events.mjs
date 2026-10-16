import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[],directory='artifacts/page-events';
await mkdir(directory,{recursive:true});
assert.ok((await fetch('http://127.0.0.1:5173/page-event-probe.html')).ok,'The local fixture server is unavailable');
for(let repetition=0;repetition<3;repetition++){
 const modes=process.argv.includes('--attach-emulated')?['attach-emulated']:process.argv.includes('--attach')?['attach-cycle']:process.argv.includes('--retry')?['screenshots']:['idle','screenshots','plain','cropped','beyond','resize-control'];
 modes.push(...modes.splice(0,repetition*2));
 for(const mode of modes){
  const token=randomUUID();let resolveReport,reported,timer,diagnostic;
  reported=new Promise(resolve=>{resolveReport=resolve;});
  const server=createServer((request,response)=>{if(request.method!=='POST'||request.url!==`/${token}`){response.writeHead(404);response.end();return;}let body='';request.on('data',chunk=>{body+=chunk;if(body.length>2000000)request.destroy();});request.on('end',()=>{try{const result=JSON.parse(body);response.writeHead(204);response.end();resolveReport(result);}catch{response.writeHead(400);response.end();}});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const chrome=await launchRawCDP({headless:false});
  try{
    const version=(await chrome.send('Browser.getVersion')).product;
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});let {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});if(!['plain','attach-cycle'].includes(mode))await send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
    const url=new URL('http://127.0.0.1:5173/page-event-probe.html');url.searchParams.set('mode',mode);url.searchParams.set('report',`http://127.0.0.1:${server.address().port}/${token}`);
    const navigation=await send('Page.navigate',{url:url.href});assert.ok(!navigation.errorText,navigation.errorText);await send('Page.bringToFront');
    let ready=false;
    for(let i=0;i<160;i++){if(i%20===0)await send('Page.bringToFront');const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});if(targetInfo.title==='Browser signals ready'){ready=true;break;}await sleep(50);}
    assert.ok(ready,'Browser signal fixture did not initialize');
    const frames=[];let firstPath,lastPath,lastData;
    async function capture(){const atWallMs=Date.now();const{data}=await send('Page.captureScreenshot',{fromSurface:true,optimizeForSpeed:true,...(mode==='beyond'?{captureBeyondViewport:true}:{}),...(mode==='cropped'?{clip:{x:600,y:230,width:350,height:110,scale:1}}:{})});const bytes=Buffer.from(data,'base64');frames.push({atWallMs,finishedWallMs:Date.now()});if(frames.length===1){firstPath=`${directory}/${mode}-${repetition}-first.png`;await writeFile(firstPath,bytes);}lastPath=`${directory}/${mode}-${repetition}-last.png`;lastData=bytes;}
    if(mode.startsWith('attach-')){await sleep(500);await chrome.send('Target.detachFromTarget',{sessionId});await sleep(500);({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));}
    if(mode==='resize-control')await send('Emulation.setDeviceMetricsOverride',{width:1100,height:800,deviceScaleFactor:1,mobile:false});
    if(['screenshots','plain','cropped','beyond'].includes(mode)){const start=Date.now();while(Date.now()-start<3300)await capture();}
    else await sleep(3300);
    const measurement=await Promise.race([reported,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('No browser signal report')),5000);})]);
    diagnostic={measurement,frames};assert.equal(measurement.foreground.hidden,false);assert.equal(measurement.foreground.focused,true);
    if(mode==='resize-control')assert.ok(measurement.events.some(event=>event.type==='window.resize'),'Resize positive control did not arrive');
    if(!frames.length)await capture();await writeFile(lastPath,lastData);
    const read=async path=>{const{stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);const text=JSON.parse(stdout).map(x=>x.text).join('').replace(/\s/g,'').toLowerCase();return{readable:text.includes('signaltoken4826'),text};};
    const first=await read(firstPath),last=await read(lastPath);assert.ok(first.readable&&last.readable,'The captured token was not readable');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:710,y:390,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:710,y:390,button:'left',buttons:0,clickCount:1});
    const{targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});const after=JSON.parse(targetInfo.title);assert.equal(after.accepted,1);
    assert.ok(chrome.commands.every(c=>!c.startsWith('Runtime.')&&!c.startsWith('Debugger.')));
    results.push({mode,repetition,version,headless:false,measurement,frames,first,last,after,commands:[...new Set(chrome.commands)]});
  }catch(error){results.push({mode,repetition,error:error.message,diagnostic});}
  finally{clearTimeout(timer);await chrome.close();await new Promise(resolve=>server.close(resolve));}
}
}
await writeFile(process.argv.includes('--attach-emulated')?'docs/page-attach-emulated-event-results.json':process.argv.includes('--attach')?'docs/page-attach-event-results.json':process.argv.includes('--retry')?'docs/page-event-retry-results.json':'docs/page-event-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,measurement,error})=>({mode,repetition,events:measurement?.events,changes:measurement?.changes,error})),null,2));
assert.equal(results.filter(x=>x.error).length,0,'Page event measurement failed');
