import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {launchRawCDP} from './raw-cdp.mjs';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
const repetitions=Number(process.env.REPETITIONS||3);
assert.ok(Number.isInteger(repetitions)&&repetitions>0&&repetitions<=10,'REPETITIONS must be an integer from 1 to 10');
await mkdir('artifacts/gpu-capture-signal', {recursive:true});
for (let repetition=0; repetition<repetitions; repetition++) {
  const modes = process.env.MODES?.split(',')||['detached','idle','screenshots','sparse-screenshots','ordinary-gpu-load','ordinary-cpu-work'];
  assert.ok(modes.every(mode=>['detached','idle','screenshots','sparse-screenshots','ordinary-gpu-load','ordinary-cpu-work'].includes(mode)));
  modes.push(...modes.splice(0,repetition));
  for (const mode of modes) {
    const chrome = await launchRawCDP({headless:false});
    let diagnostic;
    try {
      const version = (await chrome.send('Browser.getVersion')).product;
      const {targetId} = await chrome.send('Target.createTarget',{url:'about:blank'});
      let {sessionId} = await chrome.send('Target.attachToTarget',{targetId,flatten:true});
      const send = (method,params) => chrome.send(method,params,sessionId);
      await chrome.send('Target.activateTarget',{targetId});
      await send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
      const navigation = await send('Page.navigate',{url:'http://127.0.0.1:5173/gpu-capture-probe.html'+(mode==='ordinary-gpu-load'?'?workload=on':mode==='ordinary-cpu-work'?'?cpu=on':'')});
      assert.ok(!navigation.errorText,navigation.errorText);
      let ready=false;
      for(let i=0;i<100;i++) {
        const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
        if(targetInfo.title==='GPU probe ready'){ready=true;break;}
        await sleep(50);
      }
      assert.ok(ready,'GPU probe did not initialize');
      await sleep(500);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS'});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS'});
      const captures=[];
      const started=Date.now();
      let detachedAfterMs;
      if(mode==='detached'){
        await chrome.send('Target.detachFromTarget',{sessionId});
        detachedAfterMs=Date.now()-started;
        assert.ok(detachedAfterMs<100,'Detach did not finish within the warmup');
      }
      if(mode==='screenshots'||mode==='sparse-screenshots') {
        while(Date.now()-started<3400) {
          const capturedAtMs=Date.now()-started;
          const {data}=await send('Page.captureScreenshot',{fromSurface:true,optimizeForSpeed:true});
          const png=PNG.sync.read(Buffer.from(data,'base64'));
          if(captures.length===0)await writeFile(`artifacts/gpu-capture-signal/first-${repetition}.png`,Buffer.from(data,'base64'));
          let green=0;
          for(let i=0;i<png.data.length;i+=4)if(png.data[i+1]>150&&png.data[i+1]>png.data[i]*1.5&&png.data[i+1]>png.data[i+2]*1.5)green++;
          captures.push({atMs:capturedAtMs,durationMs:Date.now()-started-capturedAtMs,greenPixels:green});
          if(mode==='sparse-screenshots')await sleep(500);
        }
      } else await sleep(3400);
      let measurement;
      for(let i=0;i<100;i++) {
        const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
        if(targetInfo.title.startsWith('{')){measurement=JSON.parse(targetInfo.title);break;}
        await sleep(50);
      }
      diagnostic={measurement,captures};
      assert.ok(measurement?.readbackTimesMs?.length>0,'No completed GPU measurement');
      assert.equal(measurement.gpuError,0);
      assert.ok(measurement.pixel[1]>150,'The GPU readback lacked the green control');
      assert.equal(measurement.contextLost,false);
      if(mode==='screenshots'||mode==='sparse-screenshots')assert.ok(captures.length>0&&captures.every(frame=>frame.greenPixels>200000),'A capture lacked the readable green control');
      if(mode==='detached')({sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true}));
      const {data}=await send('Page.captureScreenshot',{fromSurface:true});
      await writeFile(`artifacts/gpu-capture-signal/${mode}-${repetition}.png`,Buffer.from(data,'base64'));
      assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')));
      results.push({mode,repetition,version,headless:false,detachedAfterMs,measurement,captures,commands:[...new Set(chrome.commands)]});
    } catch(error) {results.push({mode,repetition,error:error.message,diagnostic});}
    finally {await chrome.close();}
  }
}
await writeFile(process.env.RESULT_PATH||'docs/gpu-capture-signal-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({mode,repetition,measurement,captures,error})=>({mode,repetition,metrics:measurement?.metrics,captures:captures?.length,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'GPU capture measurement did not finish');
