const artifactNames=['__playwright__binding__','__playwright__binding__controller__','__pwInitScripts','__pwClock'];

// These names identify optional instrumentation, not every browser controller.
export function inspectAutomationArtifacts(scope=globalThis){
  const artifacts=[];
  for(const name of artifactNames){
    try{if(Object.getOwnPropertyDescriptor(scope,name))artifacts.push(name);}catch{}
  }
  try{for(const name of Object.getOwnPropertyNames(scope))if(name.startsWith('__playwright_snapshot_streamer_'))artifacts.push(name);}catch{}
  return{suspected:artifacts.length>0,artifacts};
}

export function watchAutomationArtifacts(onDetected,{scope=globalThis,interval=100}={}){
  let timer;
  const check=()=>{const result=inspectAutomationArtifacts(scope);if(result.suspected){clearInterval(timer);onDetected(result);return true;}return false;};
  if(!check())timer=setInterval(check,interval);
  return()=>clearInterval(timer);
}
