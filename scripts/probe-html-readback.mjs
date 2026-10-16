import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launchRawCDP} from './raw-cdp.mjs';
const chrome=await launchRawCDP({headless:false});
try{
  const version=await chrome.send('Browser.getVersion');
  const {targetId}=await chrome.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await chrome.send('Target.attachToTarget',{targetId,flatten:true});
  const result=await chrome.send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    const prototypes={canvas:HTMLCanvasElement.prototype,context2d:CanvasRenderingContext2D.prototype,webgl:WebGLRenderingContext.prototype,webgl2:WebGL2RenderingContext.prototype};
    return {
      userAgent:navigator.userAgent,
      captureElementImage:typeof canvas.captureElementImage,
      drawElementImage:typeof context.drawElementImage,
      requestPaint:typeof canvas.requestPaint,
      layoutSubtreeProperty:'layoutSubtree' in canvas,
      relatedMethods:Object.fromEntries(Object.entries(prototypes).map(([name,prototype])=>[name,Reflect.ownKeys(prototype).filter(key=>typeof key==='string'&&/element|paint|capture/i.test(key))]))
    };
  })()`},sessionId);
  assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));
  const report={version,probe:result.result.value,conditions:{headless:false,canvasFeatureFlags:false,originTrialToken:false,automationMarkerDisabled:true},commands:[...new Set(chrome.commands)]};
  await writeFile('docs/html-readback-capabilities.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await chrome.close();}
