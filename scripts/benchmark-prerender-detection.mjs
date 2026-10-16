import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[],directory=process.argv.includes('--combined')?'artifacts/prerender-cache-combined':'artifacts/prerender-detection';
await mkdir(directory,{recursive:true});
for(let repetition=0;repetition<3;repetition++)for(const mode of (process.argv.includes('--combined')?['no-debugging','raw-detached','raw-tab-target']:['no-debugging','no-debugging-preload-disabled','raw-attached','raw-detached','raw-tab-target','raw-capture'])){
 const token=randomUUID();let finish,done=false,timer,chrome,child,profile,sessionId,targetId,version;
 const reported=new Promise(resolve=>{finish=value=>{done=true;resolve(value);};});
 const root=`/${token}`;
 const server=createServer((request,response)=>{
  if(request.method==='POST'&&[`${root}/armed`,`${root}/result`].includes(request.url)){
   let body='';request.on('data',chunk=>{body+=chunk;if(body.length>20000)request.destroy();});request.on('end',()=>{response.writeHead(204);response.end();if(request.url.endsWith('/result')){try{finish(JSON.parse(body));}catch{finish({error:'Invalid page report'});}}});return;
  }
  response.setHeader('Content-Type','text/html');
  if(request.url===`${root}/back`){response.end('<!doctype html><title>History check</title><script>setTimeout(()=>history.back(),500)</script>');return;}
  if(request.url===`${root}/destination`){response.end(`<!doctype html><html><head><title>Prerender check</title><style>body{margin:0;background:black;color:white;font:28px sans-serif}main{margin:100px;padding:40px;width:650px;background:#116456}button{padding:24px;font:inherit}</style></head><body><script>
   const initiallyPrerendering=document.prerendering,combined=${process.argv.includes('--combined')},cacheKey=${JSON.stringify(root)}+'-cache';let accepted=0;
   function ready(){
    if(combined&&!sessionStorage.getItem(cacheKey)){sessionStorage.setItem(cacheKey,'pending');setTimeout(()=>{location.href=${JSON.stringify(root)}+'/back';},500);return;}
    complete(false);
   }
   window.addEventListener('pageshow',event=>{if(combined&&event.persisted)complete(true);});
   function complete(cacheRestored){
    const activationStart=performance.getEntriesByType('navigation')[0]?.activationStart||0,allowed=activationStart>0&&(!combined||cacheRestored);
    if(allowed){const main=document.createElement('main');main.innerHTML='<p>PRERENDER TOKEN 6194</p><button>Approve prerender action</button>';document.body.append(main);main.querySelector('button').addEventListener('click',event=>{if(event.isTrusted){accepted++;document.title=JSON.stringify({accepted,allowed});}});}
    document.title=JSON.stringify({accepted,allowed});
    fetch(${JSON.stringify(root)}+'/result',{method:'POST',body:JSON.stringify({allowed,prerendered:activationStart>0,cacheRestored,initiallyPrerendering,activationStart,blocked:!allowed,webdriver:navigator.webdriver,dimensions:[innerWidth,innerHeight,devicePixelRatio],hidden:document.hidden,focused:document.hasFocus()})});
   }
   if(document.prerendering)document.addEventListener('prerenderingchange',ready,{once:true});else ready();
  </script></body></html>`);return;}
  if(request.url!==root){response.writeHead(404);response.end();return;}
  response.end(`<!doctype html><title>Preparing page</title><script>
   (async()=>{const rule=document.createElement('script');rule.type='speculationrules';rule.textContent=JSON.stringify({prerender:[{source:'list',urls:[location.href+'/destination'],eagerness:'immediate'}]});document.head.append(rule);await fetch(${JSON.stringify(root)}+'/armed',{method:'POST',body:'ready'});setTimeout(()=>{location.href=location.href+'/destination';},2000);})();
  </script>`);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}${root}`;
 try{
  if(mode.startsWith('no-debugging')){
   profile=await mkdtemp(join(tmpdir(),'antiagent-prerender-'));
   if(mode==='no-debugging-preload-disabled'){await mkdir(join(profile,'Default'));await writeFile(join(profile,'Default','Preferences'),JSON.stringify({net:{network_prediction_options:2}}));}
   const args=[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--new-window',url];
   child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args,{stdio:'ignore'});
  }else{
   chrome=await launchRawCDP({headless:false});version=(await chrome.send('Browser.getVersion')).product;
   ({targetId}=await chrome.send('Target.createTarget',{url:mode==='raw-detached'?url:'about:blank',...(mode==='raw-tab-target'?{forTab:true}:{})}));if(mode!=='raw-detached')({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));
   if(mode==='raw-tab-target'){
    const tabSession=sessionId;let childTimer;
    const attached=new Promise((resolve,reject)=>{const stop=chrome.onEvent('Target.attachedToTarget',tabSession,params=>{if(params.targetInfo.type==='page'){stop();resolve(params);}});childTimer=setTimeout(()=>{stop();reject(new Error('No page session under tab target'));},5000);});
    await chrome.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true},tabSession);
    try{const page=await attached;sessionId=page.sessionId;targetId=page.targetInfo.targetId;}finally{clearTimeout(childTimer);}
   }
   if(mode!=='raw-detached'){await chrome.send('Page.navigate',{url},sessionId);await chrome.send('Page.bringToFront',{},sessionId);}else await chrome.send('Target.activateTarget',{targetId});
  }
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Prerender activation timed out')),15000);});
  let captures=0;const captureErrors=[];
  if(mode==='raw-capture')while(!done){try{await Promise.race([chrome.send('Page.captureScreenshot',{fromSurface:true},sessionId),deadline]);captures++;}catch(error){if(!error.message.includes('Not attached to an active page'))throw error;captureErrors.push(error.message);await sleep(50);}}
  const state=await Promise.race([reported,deadline]);assert.equal(state.error,undefined);assert.equal(typeof state.allowed,'boolean');
  let readable,accepted;
  if(chrome){
   if(['raw-detached','raw-tab-target'].includes(mode)){const{targetInfos}=await chrome.send('Target.getTargets');const active=targetInfos.find(info=>info.type==='page'&&info.url===url+'/destination'&&!info.subtype);assert.ok(active,'No activated page target');targetId=active.targetId;({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));}
   const path=`${directory}/${mode}-${repetition}.png`;
   const{data}=await chrome.send('Page.captureScreenshot',{fromSurface:true},sessionId);await writeFile(path,Buffer.from(data,'base64'));
   const{stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);const entries=JSON.parse(stdout);readable=entries.map(x=>x.text).join('').replace(/\s/g,'').includes('PRERENDERTOKEN6194');assert.equal(readable,state.allowed);
   if(state.allowed){
    const target=entries.find(entry=>entry.text==='Approve prerender action');assert.ok(target);const{targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});assert.equal(JSON.parse(targetInfo.title).allowed,true);
     for(const type of ['mousePressed','mouseReleased'])await chrome.send('Input.dispatchMouseEvent',{type,x:target.x*state.dimensions[0],y:target.y*state.dimensions[1],button:'left',buttons:type==='mousePressed'?1:0,clickCount:1},sessionId);
     const after=await chrome.send('Target.getTargetInfo',{targetId});accepted=JSON.parse(after.targetInfo.title).accepted;

    assert.equal(accepted,1);
   }
   if(chrome)assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
  }
  results.push({mode,repetition,version,state,readable,accepted,captures,captureErrors,commands:chrome&&[...new Set(chrome.commands)],remoteDebuggingFlag:!mode.startsWith('no-debugging')});
 }catch(error){results.push({mode,repetition,error:error.message});}
 finally{
  clearTimeout(timer);if(chrome)await chrome.close();
  if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([exited,sleep(2000)]);}
  if(profile&&(!child||child.exitCode!==null||child.signalCode!==null))await rm(profile,{recursive:true,force:true});
  await new Promise(resolve=>server.close(resolve));
 }
}
await writeFile(`${directory}/results.json`,JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,state,readable,accepted,error})=>({mode,repetition,prerendered:state?.prerendered,activationStart:state?.activationStart,readable,accepted,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'One or more prerender trials were inconclusive');
assert.ok(results.filter(result=>result.mode==='no-debugging').every(result=>result.state.allowed),'The ordinary-browser positive control did not activate; the probe is inconclusive');
assert.ok(results.filter(result=>result.mode==='no-debugging-preload-disabled').every(result=>!result.state.allowed),'The preloading-disabled control was not effective');
