import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAutomationDecoy} from '../src/automation-decoy.js';

function environment(t,webdriver=false){
 const saved=new Map(['window','document','navigator'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const [key,value]of Object.entries({window:new EventTarget(),document:new EventTarget(),navigator:{webdriver}}))Object.defineProperty(globalThis,key,{value,configurable:true});
 t.after(()=>{for(const[key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 return{view:null,replaceChildren(){this.view=null;}};
}
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};}
const mountDecoy=root=>{root.view='decoy';};

test('a launch marker selects the decoy before detection or application loading',async t=>{
 const root=environment(t,true);let loaded=0;
 const gate=await mountAutomationDecoy({root,detect:()=>assert.fail('Should not need async detection'),loadApplication:()=>{loaded++;},mountDecoy});
 assert.equal(root.view,'decoy');assert.equal(loaded,0);gate.dispose();
});
test('a detection event wins over an unfinished async verdict',async t=>{
 const root=environment(t),verdict=deferred();let loaded=0;
 const pending=mountAutomationDecoy({root,detect:()=>verdict.promise,loadApplication:()=>{loaded++;},mountDecoy});
 document.dispatchEvent(new Event('__playwright_mark_target__'));verdict.resolve({suspected:false});
 const gate=await pending;assert.equal(root.view,'decoy');assert.equal(loaded,0);gate.dispose();
});
test('a detection event prevents an already pending module from mounting',async t=>{
 const root=environment(t),application=deferred(),loading=deferred();let mounted=0;
 const pending=mountAutomationDecoy({root,detect:async()=>({suspected:false}),loadApplication:()=>{loading.resolve();return application.promise;},mountDecoy});
 await loading.promise;document.dispatchEvent(new Event('__playwright_mark_target__'));
 application.resolve(()=>{mounted++;});const gate=await pending;
 assert.equal(mounted,0);assert.equal(root.view,'decoy');gate.dispose();
});
test('late detection cleans up the mounted app and stays latched',async t=>{
 const root=environment(t);let cleaned=0,decoys=0;
 const gate=await mountAutomationDecoy({root,detect:async()=>({suspected:false}),loadApplication:async()=>root=>{root.view='real';return()=>{cleaned++;};},mountDecoy:root=>{decoys++;mountDecoy(root);}});
 assert.equal(root.view,'real');document.dispatchEvent(new Event('__playwright_mark_target__'));window.dispatchEvent(new Event('__playwright_global_listeners_check__'));
 assert.equal(root.view,'decoy');assert.equal(cleaned,1);assert.equal(decoys,1);gate.dispose();
});
