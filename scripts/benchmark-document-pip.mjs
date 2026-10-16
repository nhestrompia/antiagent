import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {PNG} from 'pngjs';
import {launchRawCDP} from './raw-cdp.mjs';
const execute=promisify(execFile),results=[];
const directory='artifacts/document-pip';await mkdir(directory,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(let repetition=0;repetition<3;repetition++){
  const chrome=await launchRawCDP({headless:false});let evidence={repetition,conditions:{headless:false,automationMarkerDisabled:true}};
  try{
    evidence.version=(await chrome.send('Browser.getVersion')).product;
    const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
    await chrome.send('Target.activateTarget',{targetId});
    await chrome.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false},sessionId);
    const navigation=await chrome.send('Page.navigate',{url:'http://127.0.0.1:5173/document-pip.html'},sessionId);assert.ok(!navigation.errorText,navigation.errorText);await sleep(500);
    let captureIndex=0;
    async function capture(session){
      const {data}=await chrome.send('Page.captureScreenshot',{fromSurface:true},session);
      const bytes=Buffer.from(data,'base64'),png=PNG.sync.read(bytes),path=`${directory}/${repetition}-${captureIndex++}.png`;
      await writeFile(path,bytes);const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
      const {cssVisualViewport}=await chrome.send('Page.getLayoutMetrics',{},session);
      return {width:png.width,height:png.height,cssWidth:cssVisualViewport.clientWidth,cssHeight:cssVisualViewport.clientHeight,text:JSON.parse(stdout)};
    }
    async function click(session,shot,label){
      const item=shot.text.find(item=>item.text.toLowerCase()===label.toLowerCase());assert.ok(item,`Missing ${label}: ${JSON.stringify(shot.text)}`);
      const point={x:item.x*shot.cssWidth,y:item.y*shot.cssHeight};
      await chrome.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point},session);
      await chrome.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1},session);
      await chrome.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1},session);
    }
    const before=await chrome.send('Target.getTargets');
    const initial=await capture(sessionId);evidence.initial=initial;
    await click(sessionId,initial,'Open task window');await sleep(500);
    const after=await chrome.send('Target.getTargets');
    const known=new Set(before.targetInfos.map(item=>item.targetId));
    const added=after.targetInfos.filter(item=>!known.has(item.targetId));evidence.addedTargets=added;
    evidence.openerAfter=await capture(sessionId);
    const pip=added.find(item=>item.type==='page')||added[0];assert.ok(pip,'No new CDP target after PiP open');
    const attached=await chrome.send('Target.attachToTarget',{targetId:pip.targetId,flatten:true});
    const observations=[];
    for(const label of ['Harbor Research','125 EUR','Confirm transfer']){
      const shot=await capture(attached.sessionId);observations.push({label,shot});await click(attached.sessionId,shot,label);await sleep(50);
    }
    evidence.observations=observations;evidence.final=await capture(attached.sessionId);
    evidence.completed=evidence.final.text.some(item=>item.text==='Task complete');
    evidence.openerFinal=await capture(sessionId);
    assert.equal(evidence.completed,true);
    assert.ok(chrome.commands.every(command=>!command.startsWith('Runtime.')&&!command.startsWith('Debugger.')&&!command.startsWith('DOM.')));
    evidence.commands=[...new Set(chrome.commands)];
    await chrome.send('Target.closeTarget',{targetId:pip.targetId});
    results.push(evidence);
  }catch(error){results.push({...evidence,error:error.message,commands:[...new Set(chrome.commands)]});}
  finally{await chrome.close();}
}
await writeFile('docs/document-pip-results.json',JSON.stringify({results},null,2));
console.log(JSON.stringify(results.map(({repetition,completed,error,addedTargets})=>({repetition,completed,error,targets:addedTargets?.map(item=>({type:item.type,url:item.url}))})),null,2));
assert.equal(results.filter(result=>result.error).length,0,'A PiP boundary case did not finish');
if(process.argv.includes('--require-blocking'))assert.equal(results.filter(result=>result.completed).length,0,'PiP target separation did not prevent automation');
