import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const results=[];
assert.ok((await fetch('http://127.0.0.1:5173/gpu-pixel-guard.html')).ok,'The local fixture server is unavailable');
for(let repetition=0;repetition<3;repetition++)for(const mode of ['off-idle','on-idle','on-cpu']){
  const profile=await mkdtemp(join(tmpdir(),'antiagent-no-cdp-'));
  const token=randomUUID();let child,timer,resolveReport,rejectReport;
  const reported=new Promise((resolve,reject)=>{resolveReport=resolve;rejectReport=reject;});
  const server=createServer((request,response)=>{
    if(request.url!==`/${token}`||request.method!=='POST'){response.writeHead(404);response.end();return;}
    let body='';request.on('data',chunk=>{body+=chunk;if(body.length>4096)request.destroy();});
    request.on('end',()=>{try{const state=JSON.parse(body);response.writeHead(204);response.end();resolveReport(state);}catch(error){response.writeHead(400);response.end();rejectReport(error);}});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const url=new URL('http://127.0.0.1:5173/gpu-pixel-guard.html');
    url.searchParams.set('report',`http://127.0.0.1:${server.address().port}/${token}`);
    if(mode!=='off-idle')url.searchParams.set('guard','on');
    if(mode==='on-cpu')url.searchParams.set('cpu','on');
    const args=[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-blink-features=AutomationControlled','--new-window',url.href];
    child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args,{stdio:'ignore'});
    child.on('error',rejectReport);
    timer=setTimeout(()=>rejectReport(new Error('No-CDP page did not report its result')),15000);
    const state=await reported;
    assert.equal(state.ready,true);assert.equal(state.finished,true);assert.equal(state.gpuError,0);assert.ok(state.pixel[1]>150);
    if(mode==='off-idle')assert.equal(state.blocked,false);
    results.push({mode,repetition,headless:false,remoteDebuggingFlag:false,browserAutomationConnection:false,pageSelfReport:state});
  }catch(error){results.push({mode,repetition,error:error.message});}
  finally{
    clearTimeout(timer);
    if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,2000))]);}
    await new Promise(resolve=>server.close(resolve));
    if(!child||child.exitCode!==null||child.signalCode!==null)await rm(profile,{recursive:true,force:true});
  }
}
await writeFile('docs/gpu-guard-no-cdp-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,pageSelfReport,error})=>({mode,repetition,blocked:pageSelfReport?.blocked,initialMedian:pageSelfReport?.initialMedian,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'No-CDP control did not finish');
