import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const results=[],sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(let repetition=0;repetition<3;repetition++)for(const moveRoot of [false,true]){
 let finish,timer,child;const report=new Promise(resolve=>{finish=resolve;});
 const server=createServer((request,response)=>{
  if(request.method==='POST'){let body='';request.on('data',chunk=>{body+=chunk;if(body.length>10000)request.destroy();});request.on('end',()=>{response.writeHead(204);response.end();try{finish(JSON.parse(body));}catch{finish({error:'Invalid report'});}});return;}
  response.setHeader('Content-Type','text/html');response.end(`<!doctype html><html><head><title>Root control</title></head><body><input><probe-item></probe-item><script>
   const state={connected:0,disconnected:0,events:[]};
   customElements.define('probe-item',class extends HTMLElement{connectedCallback(){state.connected++;}disconnectedCallback(){state.disconnected++;}});
   for(const name of ['__playwright_global_listeners_check__','__playwright_snapshotter_global_listeners_check__'])window.addEventListener(name,()=>state.events.push(name));
   setTimeout(()=>{const input=document.querySelector('input');input.focus();const root=document.documentElement;state.focusBefore=document.activeElement===input;state.connectedBefore=state.connected;state.disconnectedBefore=state.disconnected;
    if(${moveRoot}){root.remove();document.appendChild(root);}
    state.focusAfter=document.activeElement===input;state.sameRoot=root===document.documentElement;fetch('/',{method:'POST',body:JSON.stringify(state)});
   },500);
  </script></body></html>`);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const profile=await mkdtemp(join(tmpdir(),'antiagent-root-control-'));
 try{
  child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--new-window',`http://127.0.0.1:${server.address().port}`],{stdio:'ignore'});
  const state=await Promise.race([report,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('No ordinary browser report')),12000);})]);
  assert.equal(state.error,undefined);assert.equal(state.focusBefore,true);assert.equal(state.sameRoot,true);assert.deepEqual(state.events,[]);
  if(moveRoot){assert.equal(state.focusAfter,false);assert.equal(state.disconnected-state.disconnectedBefore,1);assert.equal(state.connected-state.connectedBefore,1);}
  else{assert.equal(state.focusAfter,true);assert.equal(state.disconnected-state.disconnectedBefore,0);}
  results.push({repetition,moveRoot,remoteDebuggingFlag:false,browserAutomationConnection:false,pageSelfReport:state});
 }catch(error){results.push({repetition,moveRoot,error:error.message});}
 finally{clearTimeout(timer);if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([exited,sleep(2000)]);}if(!child||child.exitCode!==null||child.signalCode!==null)await rm(profile,{recursive:true,force:true});await new Promise(resolve=>server.close(resolve));}
}
await mkdir('artifacts/root-probe-control',{recursive:true});await writeFile('artifacts/root-probe-control/results.json',JSON.stringify({results},null,2));console.log(JSON.stringify(results,null,2));assert.equal(results.filter(result=>result.error).length,0,'Ordinary browser control failed');
