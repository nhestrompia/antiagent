const records=[];
const state={ready:false,available:'PressureObserver' in globalThis,blocked:false,accepted:0,records,error:null};
let observer;
function publish(){document.title=JSON.stringify(state);document.querySelector('pre').textContent=JSON.stringify({available:state.available,error:state.error,last:records.at(-1)?.state,blocked:state.blocked});}
document.querySelector('button').addEventListener('click',event=>{if(event.isTrusted&&!state.blocked){state.accepted++;publish();}});
if(state.available){
  try{
    observer=new PressureObserver(updates=>{
      for(const record of updates)records.push({source:record.source,state:record.state,time:record.time});
      if(records.length>12)records.splice(0,records.length-12);
      state.blocked=['serious','critical'].includes(records.at(-1)?.state);
      document.querySelector('#cover').style.display=state.blocked?'block':'none';publish();
    });
    await observer.observe('cpu',{sampleInterval:1000});
  }catch(error){state.error={name:error.name,message:error.message};}
}
state.ready=true;publish();
addEventListener('pagehide',()=>observer?.disconnect());
