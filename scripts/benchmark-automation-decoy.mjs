import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from '@playwright/test';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[];
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const instrumentationOnly=process.argv.includes('--instrumentation');
const functionInitOnly=process.argv.includes('--function-init');
const artifactsMode=instrumentationOnly||functionInitOnly||process.argv.includes('--artifacts');
const directory=process.env.RESULT_DIRECTORY||(instrumentationOnly?'artifacts/playwright-instrumentation':functionInitOnly?'artifacts/playwright-function-init':artifactsMode?'artifacts/playwright-artifacts':'artifacts/automation-decoy'),url=`${origin}/automation-decoy.html`;
const repetitions=Number(process.env.REPETITIONS||3);assert.ok(Number.isInteger(repetitions)&&repetitions>0&&repetitions<=3);
await mkdir(directory,{recursive:true});assert.ok((await fetch(url)).ok,'Start Vite on port 5173');
async function read(path){const{stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);const entries=JSON.parse(stdout),text=entries.map(x=>x.text).join('').replace(/\s/g,'').toLowerCase();return{entries,real:text.includes('realtoken7391'),decoy:text.includes('workspacecode2846')};}
for(let repetition=0;repetition<repetitions;repetition++)for(const type of (instrumentationOnly?['trace-snapshots','trace-screenshots','clock']:functionInitOnly?['function-init-script']:artifactsMode?['marker-disabled-playwright','plain-init-script','function-init-script','early-binding','late-binding']:['stock-playwright','marker-disabled-playwright','locator-playwright','late-event-control'])){
 const browser=await chromium.launch({headless:false,channel:'chrome',args:type==='stock-playwright'?[]:['--disable-blink-features=AutomationControlled']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),requests=[];
  page.on('request',request=>requests.push(request.url()));
  if(type.startsWith('trace-'))await page.context().tracing.start({snapshots:type==='trace-snapshots',screenshots:type==='trace-screenshots'});
  if(type==='clock')await page.clock.install();
  if(type==='plain-init-script')await page.context().addInitScript(()=>{globalThis.benignInitialization=true;});
  if(type==='function-init-script')await page.context().addInitScript(({ping})=>{globalThis.pingFromInit=ping;},{ping:()=> 'bridge-ok'},{exposeFunctions:true});
  if(type==='early-binding')await page.context().exposeFunction('hostPing',()=> 'bridge-ok');
  await page.goto(url);await page.waitForFunction(()=>{try{return JSON.parse(document.title).mode!=='checking';}catch{return false;}});
  const initial=JSON.parse(await page.title()),beforePath=`${directory}/${type}-${repetition}-before.png`;
  await page.screenshot({path:beforePath});const before=await read(beforePath);
  const decoy=['stock-playwright','early-binding','function-init-script','trace-snapshots','clock'].includes(type),coordinate=['marker-disabled-playwright','plain-init-script','trace-screenshots'].includes(type);
  const globals=await page.evaluate(()=>Object.getOwnPropertyNames(globalThis).filter(name=>['__playwright__binding__','__playwright__binding__controller__','__pwInitScripts','__pwClock'].includes(name)||name.startsWith('__playwright_snapshot_streamer_')));
  if(type==='trace-snapshots'){assert.equal(initial.reason,'playwright-artifact');assert.ok(globals.some(name=>name.startsWith('__playwright_snapshot_streamer_')));}
  if(type==='clock'){assert.equal(initial.reason,'playwright-artifact');assert.ok(globals.includes('__pwClock'));}
  if(type==='plain-init-script')assert.equal(globals.includes('__pwInitScripts'),false);
  if(['early-binding','function-init-script'].includes(type)){assert.equal(initial.reason,'playwright-artifact');assert.ok(globals.includes('__playwright__binding__'));}assert.equal(initial.mode,decoy?'decoy':'application');
  assert.equal(before.real,!decoy);assert.equal(before.decoy,decoy);
  assert.equal(requests.some(request=>request.includes('decoy-real-app')),!decoy,'Real application module loading disagrees with gate');
  let locatorFailure,bindingResult;
  if(type==='late-binding'){await page.exposeFunction('hostPing',()=> 'bridge-ok');await page.waitForFunction(()=>JSON.parse(document.title).reason==='playwright-artifact');}
  if(['early-binding','late-binding','function-init-script'].includes(type)){bindingResult=type==='function-init-script'?await page.evaluate(()=>pingFromInit()):await page.evaluate(()=>hostPing());assert.equal(bindingResult,'bridge-ok');}
  if(type==='locator-playwright'){
   try{await page.getByRole('button',{name:'Approve transfer',exact:true}).click({timeout:3000});}catch(error){locatorFailure=error.name;}
   assert.equal(JSON.parse(await page.title()).mode,'decoy');
  }
  if(type==='late-event-control'){
   await page.evaluate(()=>document.dispatchEvent(new Event('__playwright_mark_target__')));
   assert.equal(JSON.parse(await page.title()).mode,'decoy');
   assert.equal(await page.getByText('REAL TOKEN 7391',{exact:true}).count(),0);
  }
  if(coordinate){
   const target=before.entries.find(entry=>entry.text==='Approve transfer');assert.ok(target);await page.mouse.click(target.x*1280,target.y*900);
  }else await page.getByRole('button',{name:'Refresh workspace',exact:true}).click();
  const final=JSON.parse(await page.title()),afterPath=`${directory}/${type}-${repetition}-after.png`;
  await page.screenshot({path:afterPath});const after=await read(afterPath);
  assert.equal(final.realAccepted,coordinate?1:0);
  assert.equal(final.decoyAccepted,coordinate?0:1);
  if(!coordinate){assert.equal(after.real,false);assert.equal(after.decoy,true);}
  results.push({type,repetition,version:browser.version(),initial,final,before,after,requests,locatorFailure,globals,bindingResult});
  if(type.startsWith('trace-'))await page.context().tracing.stop({path:`${directory}/${type}-${repetition}.zip`});
 }finally{await browser.close();}
}
for(let repetition=0;repetition<repetitions;repetition++){
 const chrome=await launchRawCDP({headless:false});
 try{
  const version=(await chrome.send('Browser.getVersion')).product;
  const{targetId}=await chrome.send('Target.createTarget',{url:'about:blank'}),{sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
  const send=(method,params)=>chrome.send(method,params,sessionId);
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url});await send('Page.bringToFront');
  let initial;for(let i=0;i<100;i++){const{targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});try{initial=JSON.parse(targetInfo.title);if(initial.mode!=='checking')break;}catch{}await sleep(100);}
  assert.equal(initial?.mode,'application');
  const path=`${directory}/raw-cdp-${repetition}.png`,{data}=await send('Page.captureScreenshot',{fromSurface:true});await writeFile(path,Buffer.from(data,'base64'));
  const capture=await read(path);assert.equal(capture.real,true);assert.equal(capture.decoy,false);
  const target=capture.entries.find(entry=>entry.text==='Approve transfer');assert.ok(target,'OCR did not locate the real action');
  for(const type of ['mouseMoved','mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:target.x*1280,y:target.y*900,button:type==='mouseMoved'?'none':'left',buttons:type==='mousePressed'?1:0,clickCount:type==='mouseMoved'?0:1});
  const{targetInfo}=await chrome.send('Target.getTargetInfo',{targetId}),final=JSON.parse(targetInfo.title);assert.equal(final.realAccepted,1);
  assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
  results.push({type:'raw-cdp',repetition,version,initial,final,capture,commands:[...new Set(chrome.commands)]});
 }finally{await chrome.close();}
}
const browser=await chromium.launch({headless:false,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(`${origin}/combined-defense.html?response=decoy`);await page.waitForFunction(()=>document.title==='Defense ready');
 const status=JSON.parse(await page.locator('#status').textContent());assert.equal(status.blocked,true);assert.equal(status.reason,'webdriver');
 const path=`${directory}/combined-stock.png`;await page.screenshot({path});const{stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);assert.match(stdout,/Workspace overview/);assert.doesNotMatch(stdout,/Choose Harbor Research/);
 results.push({type:'combined-stock',status});
}finally{await browser.close();}
await writeFile(`${directory}/results.json`,JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({type,repetition,initial,final,status})=>({type,repetition,initial,final,status})),null,2));
if(process.argv.includes('--require-blocking'))assert.equal(results.filter(result=>result.final?.realAccepted>0).length,0,'Undetected automation reached the real application');
