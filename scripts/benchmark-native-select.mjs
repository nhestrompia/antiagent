import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchRawCDP } from './raw-cdp.mjs';
const execute=promisify(execFile),results=[];
await mkdir('artifacts/native-select',{recursive:true});
for(const strategy of (process.env.STRATEGIES?.split(',')||['character-selection','cleared-character-selection','hardened-character-selection','observer-query-character-selection','hidden-observer-query-character-selection','heap-observer-character-selection','inline-heap-observer-character-selection','inline-focus-character-selection','synthetic-selection'])) for(let repetition=0;repetition<3;repetition++) {
  const chrome=await launchRawCDP({headless:false});
  try {
    const version=await chrome.send('Browser.getVersion');
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    const send=(method,params)=>chrome.send(method,params,sessionId);
    await chrome.send('Target.activateTarget',{targetId});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:`http://127.0.0.1:5173/native-select.html${strategy.startsWith('inline-')?'?harden=on&hide=on&inline=on':(strategy.startsWith('hidden-')||strategy.startsWith('paused-')||strategy.startsWith('heap-'))?'?harden=on&hide=on':(strategy.startsWith('hardened-')||strategy.startsWith('observer-query-'))?'?harden=on':strategy.startsWith('cleared-')?'?clear=on':''}`});
    async function report(){
      for(let attempt=0;attempt<50;attempt++) {
        const {targetInfo}=await chrome.send('Target.getTargetInfo',{targetId});
        if(targetInfo.title.startsWith('Select result:')) return JSON.parse(targetInfo.title.slice(14));
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      throw new Error('Select fixture did not render');
    }
    await report();
    await send('Page.bringToFront');
    const {root}=await send('DOM.getDocument');
    const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'#destination'});
    const {outerHTML}=await send('DOM.getOuterHTML',{nodeId});
    const options=[...outerHTML.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(match=>({value:match[1],label:match[2]}));
    const targetIndex=options.findIndex(option=>option.label==='Harbor Research');assert.ok(targetIndex>0);
    async function clickNode(id){const {model}=await send('DOM.getBoxModel',{nodeId:id});const [x0,y0,x1,y1,,y2]=model.content;const point={x:(x0+x1)/2,y:(y0+y2)/2};for(const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type,...point,button:'left',buttons:type==='mousePressed'?1:0,clickCount:1});}
    async function key(key,code,keyCode){for(const type of ['rawKeyDown','keyUp']) await send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:keyCode});}
    let popup=null,labelsAfterOpen=null,disabledObservers=null;
    if(strategy.includes('popup')||['cleared-character-selection','hardened-character-selection','observer-query-character-selection','hidden-observer-query-character-selection','paused-observer-character-selection','heap-observer-character-selection','inline-heap-observer-character-selection'].includes(strategy)) {
      await clickNode(nodeId);await new Promise(resolve=>setTimeout(resolve,250));popup=await report();
      const capture=await send('Page.captureScreenshot',{fromSurface:true,captureBeyondViewport:false});
      const path=`artifacts/native-select/${strategy}-${repetition}-popup.png`;await writeFile(path,Buffer.from(capture.data,'base64'));
      const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);popup.screenshotText=JSON.parse(stdout).map(item=>item.text);
      const html=await send('DOM.getOuterHTML',{nodeId});labelsAfterOpen=html.outerHTML;
      await key('Escape','Escape',27);
    } else await send('DOM.focus',{nodeId});
    if(strategy==='synthetic-selection') {
      await send('Runtime.evaluate',{expression:`(()=>{const s=document.querySelector('select');s.value=${JSON.stringify(options[targetIndex].value)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`});
    } else if(strategy.includes('character-selection')) {
      if(strategy.includes('observer-query-character-selection')) {
        const prototype=await send('Runtime.evaluate',{expression:'MutationObserver.prototype'});
        const objects=await send('Runtime.queryObjects',{prototypeObjectId:prototype.result.objectId});
        const disconnected=await send('Runtime.callFunctionOn',{objectId:objects.objects.objectId,functionDeclaration:'function(){for(const observer of this) observer.disconnect();return this.length;}',returnByValue:true});
        disabledObservers=disconnected.result.value;
        if(strategy==='hidden-observer-query-character-selection') assert.equal(disabledObservers,0);
        else assert.ok(disabledObservers>0,'No observer found to test the guard bypass');
      }
      if(strategy==='heap-observer-character-selection'||strategy==='inline-heap-observer-character-selection') {
        await send('HeapProfiler.enable');
        const chunks=[];
        const dispose=chrome.onEvent('HeapProfiler.addHeapSnapshotChunk',sessionId,event=>chunks.push(event.chunk));
        try {await send('HeapProfiler.takeHeapSnapshot',{reportProgress:false,exposeInternals:true,captureNumericValue:true});} finally {dispose();}
        const heap=JSON.parse(chunks.join(''));
        const fields=heap.snapshot.meta.node_fields,width=fields.length;
        const types=heap.snapshot.meta.node_types[fields.indexOf('type')];
        const candidates=[];
        for(let offset=0;offset<heap.nodes.length;offset+=width) {
          const name=heap.strings[heap.nodes[offset+fields.indexOf('name')]];
          if((types[heap.nodes[offset+fields.indexOf('type')]]==='object'||name==='MutationObserver')) candidates.push(heap.nodes[offset+fields.indexOf('id')]);
        }
        disabledObservers=0;
        for(let start=0;start<candidates.length;start+=30) {
          const matches=await Promise.all(candidates.slice(start,start+30).map(async id=>{
            try {
              const object=await send('HeapProfiler.getObjectByHeapObjectId',{objectId:String(id),objectGroup:'observer-attack'});
              const disconnected=await send('Runtime.callFunctionOn',{objectId:object.result.objectId,functionDeclaration:'function(){MutationObserver.prototype.disconnect.call(this);return true;}',returnByValue:true});
              return !disconnected.exceptionDetails;
            } catch {return false;}
          }));
          disabledObservers+=matches.filter(Boolean).length;
        }
        assert.ok(disabledObservers>0,`No disconnectable observer in ${candidates.length} heap candidates`);
      }
      if(strategy==='paused-observer-character-selection') {
        await send('Debugger.enable');
        const paused=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{dispose();reject(new Error('Debugger pause did not arrive'));},10000);
          const dispose=chrome.onEvent('Debugger.paused',sessionId,event=>{clearTimeout(timer);dispose();resolve(event);});
        });
        await send('Debugger.pause');
        const event=await paused;
        const disconnected=await send('Debugger.evaluateOnCallFrame',{callFrameId:event.callFrames[0].callFrameId,expression:'MutationObserver.prototype.disconnect.call(observer)'});
        assert.ok(!disconnected.exceptionDetails,JSON.stringify(disconnected.exceptionDetails));
        disabledObservers=1;
        await send('Debugger.resume');
      }
      if(['cleared-character-selection','hardened-character-selection','observer-query-character-selection','hidden-observer-query-character-selection','paused-observer-character-selection','heap-observer-character-selection','inline-heap-observer-character-selection'].includes(strategy)) {
        await send('DOM.setOuterHTML',{nodeId,outerHTML:labelsAfterOpen.replace(/<option value="([^"]*)"><\/option>/g,(match,value)=>value===options[targetIndex].value?`<option value="${value}">Harbor Research</option>`:match)});
        const refreshed=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'#destination'});await send('DOM.focus',{nodeId:refreshed.nodeId});
      }
      await send('Input.dispatchKeyEvent',{type:'char',key:'h',code:'KeyH',text:'h',windowsVirtualKeyCode:72});
    } else {
      await key('Home','Home',36);
      for(let index=0;index<targetIndex;index++) await key('ArrowDown','ArrowDown',40);
      await key('Enter','Enter',13);await key('Escape','Escape',27);
    }
    const button=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'#confirm'});await clickNode(button.nodeId);
    const final=await report();
    if(strategy==='inline-heap-observer-character-selection'||strategy==='synthetic-selection'||strategy==='hardened-character-selection'||strategy==='hidden-observer-query-character-selection') {assert.equal(final.blocked,true);assert.equal(final.accepted,0);if(strategy==='hardened-character-selection'||strategy==='hidden-observer-query-character-selection') assert.equal(final.reason,'dom-tamper');}
    else {assert.equal(final.accepted,1,JSON.stringify(final));assert.equal(final.blocked,false);assert.equal(final.lastChangeTrusted,true);}
    if(strategy.startsWith('cleared-')||strategy.startsWith('hardened-')||strategy.startsWith('hidden-')||strategy.startsWith('paused-')||strategy.startsWith('heap-')) {assert.equal(popup.labelsCleared,true);assert.ok(!labelsAfterOpen.includes('Harbor Research'));}
    results.push({strategy,repetition,version:version.product,targetIndex,disabledObservers,popup,labelsAfterOpen,final,commands:[...new Set(chrome.commands)]});
  } catch(error){results.push({strategy,repetition,error:error.message});}
  finally {await chrome.close();}
}
await writeFile(process.env.STRATEGIES?'docs/native-select-subset-results.json':'docs/native-select-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({strategy,repetition,disabledObservers,popup,final,error})=>({strategy,repetition,disabledObservers,popupOpen:popup?.popupOpen,labelsCleared:popup?.labelsCleared,accepted:final?.accepted,blocked:final?.blocked,error})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'One or more native select cases failed');

if(process.argv.includes('--require-blocking')) assert.equal(results.filter(result=>result.final?.accepted>0).length,0,'Agent-proof acceptance failed: native-select agents completed actions');
