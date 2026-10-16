import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAutomationArtifacts,watchAutomationArtifacts} from '../src/automation-artifacts.js';

test('inspection does not invoke an instrumentation getter',()=>{
 let reads=0;const scope={};Object.defineProperty(scope,'__playwright__binding__',{get(){reads++;throw new Error('Getter must not run');}});
 assert.deepEqual(inspectAutomationArtifacts(scope),{suspected:true,artifacts:['__playwright__binding__']});assert.equal(reads,0);
});
test('ordinary page properties do not identify automation',()=>{
 assert.deepEqual(inspectAutomationArtifacts({chrome:{},app:{},playwrightDocumentation:'text'}),{suspected:false,artifacts:[]});
});
test('watcher catches a late binding once and can be disposed',async()=>{
 const scope={};let calls=0;const observed=new Promise(resolve=>{const stop=watchAutomationArtifacts(result=>{calls++;resolve({result,stop});},{scope,interval:5});});
 scope.__playwright__binding__controller__={};const {result,stop}=await observed;
 assert.equal(result.suspected,true);stop();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(calls,1);
});
