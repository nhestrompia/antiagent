import {load} from '@fingerprintjs/botd';
import {detectInstantClientAsync} from 'bot-signal/browser';
import {mountAutomationDecoy} from './automation-decoy.js';

const state={mode:'checking',reason:null,realAccepted:0,decoyAccepted:0};
function report(){document.title=JSON.stringify(state);}
report();
function mountDecoy(root){
  const heading=document.createElement('h1');heading.textContent='Workspace overview';
  const token=document.createElement('p');token.textContent='WORKSPACE CODE 2846';
  const button=document.createElement('button');button.textContent='Refresh workspace';
  root.append(heading,token,button);
  const click=event=>{if(event.isTrusted){state.decoyAccepted++;report();}};
  button.addEventListener('click',click);
  return()=>button.removeEventListener('click',click);
}
const gate=await mountAutomationDecoy({
  root:document.querySelector('main'),
  detect:async()=>{
    const [botd,instant]=await Promise.all([load({monitoring:false}).then(detector=>detector.detect()),detectInstantClientAsync(window)]);
    return{suspected:botd.bot||!instant.isLegitClient,reason:'browser-detector'};
  },
  loadApplication:async()=>{
    const application=await import('./decoy-real-app.js');
    return root=>application.mount(root,()=>{state.realAccepted++;report();});
  },
  mountDecoy,
  onChange:change=>{Object.assign(state,change);report();},
});
window.addEventListener('pagehide',()=>gate.dispose(),{once:true});
