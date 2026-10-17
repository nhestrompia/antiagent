import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from '@playwright/test';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[],directory='artifacts/bfcache-detection';
await mkdir(directory,{recursive:true});
for(let repetition=0;repetition<3;repetition++)for(const mode of (process.argv.includes('--capture-only')?['raw-capture']:['no-debugging','no-debugging-disabled','raw-attached','raw-detached','raw-capture','playwright-marker','playwright-cache-enabled'])){
 const token=randomUUID();let finish,armed,done=false,timer,chrome,browser,child,profile,sessionId,targetId,version;
 const reported=new Promise(resolve=>{finish=value=>{done=true;resolve(value);};}),started=new Promise(resolve=>{armed=resolve;});
 const root=`/${token}`;
 const server=createServer((request,response)=>{
  if(request.method==='POST'&&[`${root}/armed`,`${root}/result`].includes(request.url)){
   let body='';request.on('data',chunk=>{body+=chunk;if(body.length>20000)request.destroy();});request.on('end',()=>{response.writeHead(204);response.end();if(request.url.endsWith('/armed'))armed();else{try{finish(JSON.parse(body));}catch{finish({error:'Invalid page report'});}}});return;
  }
  if(request.url===`${root}/away`){response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>Cache roundtrip</title><script>setTimeout(()=>history.back(),500)</script>');return;}
  if(request.url!==root){response.writeHead(404);response.end();return;}
  response.setHeader('Content-Type','text/html');response.end(`<!doctype html><html><head><title>Cache check</title><style>body{margin:0;background:black;color:white;font:28px sans-serif}main{margin:100px;padding:40px;width:650px;background:#116456}button{padding:24px;font:inherit}</style></head><body><script>
   const root=${JSON.stringify(root)},returning=sessionStorage.getItem(root)==='away';let accepted=0,allowed=false;
   window.addEventListener('pageshow',async event=>{
    if(returning||event.persisted){
     allowed=event.persisted;
     if(allowed){const main=document.createElement('main');main.innerHTML='<p>CACHE TOKEN 6194</p><button>Approve cache action</button>';document.body.append(main);main.querySelector('button').addEventListener('click',event=>{if(event.isTrusted&&allowed){accepted++;document.title=JSON.stringify({accepted,allowed});}});}
     const navigation=performance.getEntriesByType('navigation')[0];
     document.title=JSON.stringify({accepted,allowed});
     await fetch(root+'/result',{method:'POST',body:JSON.stringify({persisted:event.persisted,blocked:!allowed,webdriver:navigator.webdriver,dimensions:[innerWidth,innerHeight,devicePixelRatio],type:navigation?.type,reasons:navigation?.notRestoredReasons?.toJSON?.()||null,hidden:document.hidden,focused:document.hasFocus()})});
    }else{await fetch(root+'/armed',{method:'POST',body:'ready'});setTimeout(()=>{sessionStorage.setItem(root,'away');location.href=root+'/away';},500);}
   });
  </script></body></html>`);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}${root}`;
 try{
  if(mode.startsWith('no-debugging')){
   profile=await mkdtemp(join(tmpdir(),'antiagent-cache-'));
   const args=[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check',...(mode==='no-debugging-disabled'?['--disable-back-forward-cache']:[]),'--new-window',url];
   child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args,{stdio:'ignore'});
  }else if(mode.startsWith('playwright')){
   browser=await chromium.launch({headless:false,channel:'chrome',args:['--disable-blink-features=AutomationControlled'],...(mode==='playwright-cache-enabled'?{ignoreDefaultArgs:['--disable-back-forward-cache']}:{} )});version=browser.version();
   const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto(url);
  }else{
   chrome=await launchRawCDP({headless:false});version=(await chrome.send('Browser.getVersion')).product;
   ({targetId}=await chrome.send('Target.createTarget',{url:'about:blank'}));({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));
   await chrome.send('Page.navigate',{url},sessionId);await chrome.send('Page.bringToFront',{},sessionId);
  }
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Cache roundtrip timed out')),15000);});
  if(mode==='raw-detached'){await Promise.race([started,deadline]);await chrome.send('Target.detachFromTarget',{sessionId});}
  let captures=0;const captureErrors=[];
  if(mode==='raw-capture')while(!done){try{await Promise.race([chrome.send('Page.captureScreenshot',{fromSurface:true},sessionId),deadline]);captures++;}catch(error){if(!error.message.includes('Not attached to an active page'))throw error;captureErrors.push(error.message);await sleep(50);}}
  const state=await Promise.race([reported,deadline]);assert.equal(state.error,undefined);assert.equal(typeof state.persisted,'boolean');
  let readable,accepted;
  if(chrome||browser){
   if(mode==='raw-detached')({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));
   const path=`${directory}/${mode}-${repetition}.png`;
   if(chrome){const{data}=await chrome.send('Page.captureScreenshot',{fromSurface:true},sessionId);await writeFile(path,Buffer.from(data,'base64'));}
   else await browser.contexts()[0].pages()[0].screenshot({path});
   const{stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);const entries=JSON.parse(stdout);readable=entries.map(x=>x.text).join('').replace(/\s/g,'').includes('CACHETOKEN6194');assert.equal(readable,state.persisted);
   if(state.persisted){
    if(chrome){const target=entries.find(entry=>entry.text==='Approve cache action');assert.ok(target);const{targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});assert.equal(JSON.parse(targetInfo.title).allowed,true);
     for(const type of ['mousePressed','mouseReleased'])await chrome.send('Input.dispatchMouseEvent',{type,x:target.x*state.dimensions[0],y:target.y*state.dimensions[1],button:'left',buttons:type==='mousePressed'?1:0,clickCount:1},sessionId);
     const after=await chrome.send('Target.getTargetInfo',{targetId});accepted=JSON.parse(after.targetInfo.title).accepted;
    }else{const page=browser.contexts()[0].pages()[0];const target=entries.find(entry=>entry.text==='Approve cache action');assert.ok(target);await page.mouse.click(target.x*1280,target.y*900);accepted=JSON.parse(await page.title()).accepted;}
    assert.equal(accepted,1);
   }
   if(chrome)assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
  }
  results.push({mode,repetition,version,state,readable,accepted,captures,captureErrors,commands:chrome&&[...new Set(chrome.commands)],remoteDebuggingFlag:!mode.startsWith('no-debugging')});
 }catch(error){results.push({mode,repetition,error:error.message});}
 finally{
  clearTimeout(timer);if(chrome)await chrome.close();if(browser)await browser.close();
  if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([exited,sleep(2000)]);}
  if(profile&&(!child||child.exitCode!==null||child.signalCode!==null))await rm(profile,{recursive:true,force:true});
  await new Promise(resolve=>server.close(resolve));
 }
}
await writeFile(`${directory}/${process.argv.includes('--capture-only')?'capture-retry-results':'results'}.json`,JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,state,readable,accepted,error})=>({mode,repetition,persisted:state?.persisted,reasons:state?.reasons,readable,accepted,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'One or more cache trials were inconclusive');
assert.ok(results.filter(result=>result.mode==='no-debugging').every(result=>result.state.persisted),'The ordinary-browser positive control did not restore; the probe is inconclusive');
assert.ok(results.filter(result=>result.mode==='no-debugging-disabled').every(result=>!result.state.persisted),'The cache-disabled control was not effective');
