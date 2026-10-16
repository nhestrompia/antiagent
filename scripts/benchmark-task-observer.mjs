import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launchRawCDP} from './raw-cdp.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results=[];
const sham=process.argv.includes('--sham');
const consoleMode=process.argv.includes('--console');
const schedules=sham?[{load:false,constant:'detached'},{load:false,constant:'attached'}]:[{load:false},{load:true}];
assert.ok((await fetch('http://127.0.0.1:5173/task-observer-probe.html')).ok,'The local fixture server is unavailable');
for(let repetition=0;repetition<3;repetition++)for(const {load,constant} of schedules) {
  const chrome=await launchRawCDP({headless:false});
  let diagnostic;
  try {
    const version=(await chrome.send('Browser.getVersion')).product;
    const states=['detached','attached','attached','detached','attached','detached','detached','attached'];
    if(constant)states.fill(constant);
    else if(repetition%2)states.reverse();
    const start=Date.now()+2000;
    const {targetId}=await chrome.send('Target.createTarget',{url:`http://127.0.0.1:5173/task-observer-probe.html?start=${start}${load?'&load=on':''}${consoleMode?'&console=on':''}`});
    await chrome.send('Target.activateTarget',{targetId});
    let ready=false;
    for(let i=0;i<100;i++) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      if(targetInfo.title==='Task observer ready'){ready=true;break;}
      await sleep(25);
    }
    assert.ok(ready&&Date.now()<start-250,'Probe did not initialize before the schedule');
    const transitions=[];let sessionId;
    for(let phase=0;phase<states.length;phase++) {
      const planned=start+phase*750;
      await sleep(Math.max(0,planned-Date.now()));
      if(states[phase]==='attached'&&!sessionId)({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));
      if(states[phase]==='detached'&&sessionId){await chrome.send('Target.detachFromTarget',{sessionId});sessionId=undefined;}
      transitions.push({phase,state:states[phase],lateMs:Date.now()-planned});
    }
    await sleep(Math.max(0,start+states.length*750+100-Date.now()));
    let measurement;
    for(let i=0;i<100;i++) {
      const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
      if(targetInfo.title.startsWith('{')){measurement=JSON.parse(targetInfo.title);break;}
      await sleep(50);
    }
    diagnostic={measurement,transitions};
    assert.ok(transitions.every(item=>item.lateMs<100),'Attachment changed outside the excluded transition margin');
    assert.equal(measurement?.phases?.length,8);
    assert.ok(measurement.phases.every(item=>item.tasks.count>=10),'Too few samples in a phase');
    if(consoleMode)assert.ok(measurement.phases.every(item=>item.hiddenSamples===0&&item.unfocusedSamples===0),'The console probe lost foreground focus');
    assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
    if(consoleMode)assert.ok(chrome.commands.every(command=>!command.startsWith('Console.')));
    results.push({repetition,load,constant,version,headless:false,measurement,transitions,commands:[...new Set(chrome.commands)]});
  } catch(error) {results.push({repetition,load,constant,error:error.message,diagnostic});}
  finally {await chrome.close();}
}
await writeFile(consoleMode?(sham?'docs/console-cost-sham-results.json':'docs/console-cost-results.json'):(sham?'docs/task-observer-sham-results.json':'docs/task-observer-results.json'),JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({repetition,load,constant,measurement,error})=>({repetition,load,constant,phases:measurement?.phases,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'Task observer measurement failed');
