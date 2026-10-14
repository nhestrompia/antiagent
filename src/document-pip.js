// Presentation-target experiment. This is not a protected rendering boundary.
const status=document.querySelector('#status');
const state={supported:Boolean(window.documentPictureInPicture),opened:false,completed:false,blocked:false,trustedClicks:0};
const tasks=[['Harbor Research','North Labs','West Studio'],['125 EUR','50 EUR','250 EUR'],['Confirm transfer','Cancel','Go back']];
function report(){status.textContent=JSON.stringify(state,null,2);}
report();
document.querySelector('#open').addEventListener('click',async event=>{
  if(!event.isTrusted||!state.supported||state.opened)return;
  try{
    const child=await documentPictureInPicture.requestWindow({width:520,height:350});
    state.opened=true;report();
    child.document.title='PiP task surface';
    const style=child.document.createElement('style');style.textContent='body{font:20px system-ui;margin:24px;background:#ecf2f3;color:#172b35}button{display:block;font:20px system-ui;background:#116456;color:white;padding:12px;width:100%;margin:10px 0;border:0}h1{font-size:24px}';
    child.document.head.append(style);
    let step=0;
    function draw(){
      child.document.body.replaceChildren();
      const title=child.document.createElement('h1');
      title.textContent=state.blocked?'Blocked':state.completed?'Task complete':`Choose ${tasks[step][0]}`;
      child.document.body.append(title);
      if(state.blocked||state.completed)return;
      const choices=[...tasks[step]];
      for(let i=choices.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
      for(const choice of choices){
        const button=child.document.createElement('button');button.textContent=choice;
        button.addEventListener('click',input=>{
          if(!input.isTrusted){state.blocked=true;report();draw();return;}
          state.trustedClicks++;
          if(choice!==tasks[step][0])state.blocked=true;
          else{step++;state.completed=step===tasks.length;}
          report();draw();
        });child.document.body.append(button);
      }
    }
    draw();
    child.addEventListener('pagehide',()=>{state.closed=true;report();},{once:true});
  }catch(error){state.error=error.name;report();}
});
