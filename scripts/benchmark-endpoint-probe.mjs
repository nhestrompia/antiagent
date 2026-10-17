import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {launchRawCDP} from './raw-cdp.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
const results=[];
assert.ok((await fetch('http://127.0.0.1:5173/endpoint-probe.html')).ok,'The local fixture server is unavailable');
for(let repetition=0;repetition<3;repetition++)for(const mode of ['detached-target','attached-target']) {
  const hits=[];
  const unrelated=createServer((request,response)=>{hits.push({url:request.url,origin:request.headers.origin});response.setHeader('Content-Type','application/json');response.end(JSON.stringify({service:'unrelated-test-server'}));});
  const ordinaryPort=await listen(unrelated);
  const closed=createServer(),closedPort=await listen(closed);await close(closed);
  const chrome=await launchRawCDP({headless:false});
  try {
    const version=(await chrome.send('Browser.getVersion')).product;
    const ports={cdp:chrome.debuggingPort,ordinary:ordinaryPort,closed:closedPort};
    const url='http://127.0.0.1:5173/endpoint-probe.html?ports='+encodeURIComponent(JSON.stringify(ports));
    const {targetId}=await chrome.send('Target.createTarget',{url:mode==='detached-target'?url:'about:blank'});
    if(mode==='attached-target') {
      const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
      const navigation=await chrome.send('Page.navigate',{url},sessionId);
      assert.ok(!navigation.errorText,navigation.errorText);
    }
    await chrome.send('Target.activateTarget',{targetId});
    let measurement;
    for(let i=0;i<150;i++) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      if(targetInfo.title.startsWith('{')){measurement=JSON.parse(targetInfo.title);break;}
      await sleep(100);
    }
    assert.equal(measurement?.results?.length,6,'Endpoint probe did not finish');
    assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    results.push({mode,repetition,version,headless:false,knownPortsSuppliedByHarness:true,measurement,ordinaryRequests:hits,commands:[...new Set(chrome.commands)]});
  } catch(error) {results.push({mode,repetition,error:error.message});}
  finally {await chrome.close();await close(unrelated);}
}
await writeFile('docs/endpoint-probe-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results,null,2));
assert.equal(results.filter(result=>result.error).length,0,'Endpoint probe measurement failed');
