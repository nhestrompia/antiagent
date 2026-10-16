const documentEvents=['__playwright_reset_targets__','__playwright_mark_target__'];
const windowEvents=['__playwright_global_listeners_check__','__playwright_snapshotter_global_listeners_check__'];

// Factories mount synchronously and return a cleanup function. Loading may be async.
export async function mountAutomationDecoy({root,detect,loadApplication,mountDecoy,onChange=()=>{}}){
  let decoy=false,disposed=false,cleanup=()=>{};
  const listeners=new AbortController();
  root.replaceChildren();
  function divert(reason){
    if(disposed||decoy)return;
    decoy=true;cleanup();root.replaceChildren();
    cleanup=mountDecoy(root)||(()=>{});
    onChange({mode:'decoy',reason});
  }
  function dispose(){if(disposed)return;disposed=true;listeners.abort();cleanup();root.replaceChildren();}
  for(const name of documentEvents)document.addEventListener(name,()=>divert('playwright-event'),{capture:true,signal:listeners.signal});
  for(const name of windowEvents)window.addEventListener(name,()=>divert('playwright-event'),{capture:true,signal:listeners.signal});
  if(navigator.webdriver)divert('webdriver');
  try{
    if(!decoy){const verdict=await detect();if(verdict.suspected)divert(verdict.reason||'automation');}
    if(!decoy&&!disposed){
      const mount=await loadApplication();
      if(!decoy&&!disposed){cleanup=mount(root)||(()=>{});onChange({mode:'application',reason:null});}
    }
  }catch{divert('initialization-error');}
  return{dispose,divert};
}

export function paintCanvasDecoy(context){
  context.fillStyle='#fff';context.fillRect(0,0,720,480);
  context.fillStyle='#172b35';context.font='bold 28px sans-serif';context.fillText('Workspace overview',40,70);
  context.font='18px sans-serif';context.fillText('No pending requests',40,120);
  context.fillStyle='#116456';context.fillRect(40,200,180,70);
  context.fillStyle='#fff';context.fillText('Refresh workspace',50,240);
}
