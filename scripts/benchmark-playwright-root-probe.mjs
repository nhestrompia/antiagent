import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from '@playwright/test';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),directory='artifacts/playwright-root-probe',results=[];
await mkdir(directory,{recursive:true});
const html=`<!doctype html><html><head><title>Loading</title><style>body{margin:0;background:white;color:#172b35;font:28px sans-serif}main{margin:80px;padding:40px;background:#116456;color:white;width:700px}button{font:inherit;padding:20px}body.blocked{background:black}body.blocked main{visibility:hidden}</style></head><body><main><p>ROOT TOKEN 5827</p><button>Approve root action</button></main><script>
 const original=document.documentElement,state={ready:true,blocked:false,events:[],challenges:0,mutations:0,sameRoot:true,accepted:0};
 const report=()=>{document.title=JSON.stringify(state);};
 for(const name of ['__playwright_global_listeners_check__','__playwright_snapshotter_global_listeners_check__','__playwright_mark_target__','__playwright_reset_targets__'])window.addEventListener(name,()=>{state.events.push(name);if(name.endsWith('listeners_check__')){state.blocked=true;document.body.classList.add('blocked');}report();},true);
 new MutationObserver(entries=>{state.mutations+=entries.filter(entry=>Array.from(entry.addedNodes).includes(document.documentElement)).length;report();}).observe(document,{childList:true});
 window.addEventListener('keydown',event=>{if(event.key==='p'&&event.isTrusted){const root=document.documentElement;root.remove();document.appendChild(root);state.challenges++;state.sameRoot=original===document.documentElement;report();}});
 document.querySelector('button').addEventListener('click',event=>{if(event.isTrusted&&!state.blocked){state.accepted++;report();}});report();
 </script></body></html>`;
const server=createServer((request,response)=>{response.setHeader('Content-Type','text/html');response.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/`;
async function ocr(path){const{stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);const entries=JSON.parse(stdout);return{entries,readable:entries.map(x=>x.text).join('').replace(/\s/g,'').includes('ROOTTOKEN5827')};}
try{
 for(let repetition=0;repetition<3;repetition++)for(const mode of ['coordinate','screenshot-before','locator-read','aria-read','trace-snapshots','trace-screenshots']){
  const browser=await chromium.launch({headless:false,channel:'chrome',args:['--disable-blink-features=AutomationControlled']});
  try{
   const context=await browser.newContext({viewport:{width:1280,height:900}});
   const tracing=mode.startsWith('trace-');if(tracing)await context.tracing.start({snapshots:mode==='trace-snapshots',screenshots:mode==='trace-screenshots'});
   const page=await context.newPage();await page.goto(url);
   const waitState=async predicate=>{for(let i=0;i<100;i++){let value;try{value=JSON.parse(await page.title());}catch{}if(value&&predicate(value))return value;await sleep(50);}throw new Error('Page title state timed out');};
   await waitState(state=>state.ready);
   const initial=JSON.parse(await page.title());assert.equal(initial.blocked,false);
   if(mode==='screenshot-before')await page.screenshot();
   if(mode==='locator-read')assert.equal(await page.locator('main p').textContent(),'ROOT TOKEN 5827');
   if(mode==='aria-read')assert.match(await page.locator('main').ariaSnapshot(),/ROOT TOKEN 5827/);
   const before=JSON.parse(await page.title());assert.equal(before.blocked,false,'The test operation was detected before the root challenge');
   await page.keyboard.press('p');await waitState(state=>state.mutations>0);
   const after=JSON.parse(await page.title());assert.equal(after.challenges,1);assert.equal(after.sameRoot,true);
   const path=`${directory}/${mode}-${repetition}.png`;await page.screenshot({path});const capture=await ocr(path);assert.equal(capture.readable,!after.blocked);
   let final=after;
   if(!after.blocked){const target=capture.entries.find(entry=>entry.text==='Approve root action');assert.ok(target);await page.mouse.click(target.x*1280,target.y*900);final=JSON.parse(await page.title());assert.equal(final.accepted,1);}
   results.push({mode,repetition,version:browser.version(),initial,before,after,final,capture});
   if(tracing)await context.tracing.stop({path:`${directory}/${mode}-${repetition}.zip`});
  }catch(error){results.push({mode,repetition,error:error.message});}finally{await browser.close();}
 }
 for(let repetition=0;repetition<3;repetition++){
  const chrome=await launchRawCDP({headless:false});
  try{
   const{targetId}=await chrome.send('Target.createTarget',{url:'about:blank'}),{sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});const send=(method,params)=>chrome.send(method,params,sessionId);
   await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url});await send('Page.bringToFront');
   const state=async()=>{const{targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});try{return JSON.parse(targetInfo.title);}catch{return undefined;}};
   let initial;for(let i=0;i<100;i++){initial=await state();if(initial?.ready)break;await sleep(50);}assert.equal(initial?.blocked,false);
   await send('Page.captureScreenshot',{fromSurface:true});await send('Input.dispatchKeyEvent',{type:'keyDown',key:'p',code:'KeyP',windowsVirtualKeyCode:80});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'p',code:'KeyP',windowsVirtualKeyCode:80});
   let after;for(let i=0;i<100;i++){after=await state();if(after?.mutations>0)break;await sleep(50);}assert.equal(after?.challenges,1);assert.equal(after.sameRoot,true);assert.equal(after.blocked,false);
   const path=`${directory}/raw-${repetition}.png`,{data}=await send('Page.captureScreenshot',{fromSurface:true});await writeFile(path,Buffer.from(data,'base64'));const capture=await ocr(path);assert.equal(capture.readable,true);
   const target=capture.entries.find(entry=>entry.text==='Approve root action');assert.ok(target);for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:target.x*1280,y:target.y*900,button:'left',buttons:type==='mousePressed'?1:0,clickCount:1});
   const final=await state();assert.equal(final.accepted,1);assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));results.push({mode:'raw-cdp',repetition,initial,after,final,capture,commands:[...new Set(chrome.commands)]});
  }catch(error){results.push({mode:'raw-cdp',repetition,error:error.message});}finally{await chrome.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
await writeFile(`${directory}/results.json`,JSON.stringify({results},null,2));console.log(JSON.stringify(results.map(({mode,repetition,after,final,error})=>({mode,repetition,events:after?.events,blocked:after?.blocked,accepted:final?.accepted,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'Root probe had inconclusive trials');
