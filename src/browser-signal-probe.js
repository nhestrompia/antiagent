const parameters=new URLSearchParams(location.search),mode=parameters.get('mode')||'idle';
const video=document.querySelector('video'),source=document.createElement('canvas');source.width=256;source.height=144;
const context=source.getContext('2d'),samples={gpu:[],idle:[],video:[],raf:[]},errors=[];
const api={gpu:'gpu' in navigator,idle:'requestIdleCallback' in globalThis,video:'requestVideoFrameCallback' in video};
let running=true,measuring=false,started=0,accepted=0,frame=0,previousRaf,cpuTimer,idleHandle,videoHandle;
function summary(values){const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return{count:sorted.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],minimum:sorted[0],maximum:sorted.at(-1)};}
function draw(now){if(!running)return;context.fillStyle=frame++%2?'#1478ce':'#167acf';context.fillRect(0,0,256,144);context.fillStyle='white';context.fillText(String(frame),20,30);if(measuring&&previousRaf!==undefined)samples.raf.push(now-previousRaf);previousRaf=now;requestAnimationFrame(draw);}
context.fillStyle='#1478ce';context.fillRect(0,0,256,144);requestAnimationFrame(draw);
const stream=source.captureStream(30);video.muted=true;video.srcObject=stream;
let resolveFirst;
const firstFrame=new Promise(resolve=>{resolveFirst=resolve;});
function onVideo(now,metadata){resolveFirst();if(measuring)samples.video.push([now-started,metadata.presentedFrames,metadata.expectedDisplayTime-metadata.presentationTime,now-metadata.expectedDisplayTime]);if(running)videoHandle=video.requestVideoFrameCallback(onVideo);}
if(api.video)videoHandle=video.requestVideoFrameCallback(onVideo);
await video.play();
if(api.video){let timer;try{await Promise.race([firstFrame,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('No initial video frame')),5000);})]);}finally{clearTimeout(timer);}}
if(mode.startsWith('paused'))video.pause();
let device,pipeline,bindGroup,queries,resolveBuffer,readBuffer;
async function setupGpu(){
  if(!api.gpu)return;
  try{
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No GPU adapter');
    api.timestamp=adapter.features.has('timestamp-query');
    api.adapter={vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,description:adapter.info?.description};
    device=await adapter.requestDevice({requiredFeatures:api.timestamp?['timestamp-query']:[]});
    device.addEventListener('uncapturederror',event=>{if(errors.length<8)errors.push(event.error.message);});
    device.pushErrorScope('validation');
    const buffer=device.createBuffer({size:65536*4,usage:GPUBufferUsage.STORAGE});
    const module=device.createShaderModule({code:`@group(0) @binding(0) var<storage,read_write> values:array<u32>;
      @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>){var v=values[id.x];for(var i=0u;i<128u;i++){v=(v^(v>>13u))*1664525u+1013904223u;}values[id.x]=v;}`});
    pipeline=device.createComputePipeline({layout:'auto',compute:{module,entryPoint:'main'}});
    bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
    if(api.timestamp){queries=device.createQuerySet({type:'timestamp',count:2});resolveBuffer=device.createBuffer({size:16,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC});readBuffer=device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});}
    const validation=await device.popErrorScope();if(validation)throw new Error(validation.message);
    api.gpuReady=true;
  }catch(error){api.gpuError=error.message;api.gpuReady=false;}
}
await setupGpu();
async function gpuSample(stress){
  const encoder=device.createCommandEncoder();
  for(let i=0;i<(stress?8:0);i++){const extra=encoder.beginComputePass();extra.setPipeline(pipeline);extra.setBindGroup(0,bindGroup);extra.dispatchWorkgroups(1024);extra.end();}
  const pass=encoder.beginComputePass(api.timestamp?{timestampWrites:{querySet:queries,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:{});
  pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.dispatchWorkgroups(1024);pass.end();
  if(api.timestamp){encoder.resolveQuerySet(queries,0,2,resolveBuffer,0);encoder.copyBufferToBuffer(resolveBuffer,0,readBuffer,0,16);}
  const begin=performance.now();device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();const queueMs=performance.now()-begin;
  let gpuMs=null,mapMs=null;
  if(api.timestamp){const mapStart=performance.now();await readBuffer.mapAsync(GPUMapMode.READ);mapMs=performance.now()-mapStart;const times=new BigUint64Array(readBuffer.getMappedRange());gpuMs=Number(times[1]-times[0])/1e6;readBuffer.unmap();}
  return[performance.now()-started,queueMs,mapMs,gpuMs];
}
if(api.gpuReady)await gpuSample(false);
await new Promise(resolve=>setTimeout(resolve,750));
while(document.hidden||!document.hasFocus())await new Promise(resolve=>setTimeout(resolve,50));
started=performance.now();const startWallMs=Date.now();measuring=true;
const qualityBefore=video.getVideoPlaybackQuality?.(),videoPausedAtStart=video.paused;
if(mode==='cpu')cpuTimer=setInterval(()=>{const until=performance.now()+90;while(performance.now()<until){}},500);
if(api.idle){let requestedAt=performance.now();const onIdle=deadline=>{if(!measuring)return;const now=performance.now();samples.idle.push([now-started,deadline.timeRemaining(),now-requestedAt,deadline.didTimeout]);requestedAt=performance.now();idleHandle=requestIdleCallback(onIdle,{timeout:250});};idleHandle=requestIdleCallback(onIdle,{timeout:250});}
async function gpuLoop(){if(!measuring||!api.gpuReady)return;try{const value=await gpuSample(mode==='gpu');if(measuring)samples.gpu.push(value);}catch(error){errors.push(error.message);api.gpuReady=false;}if(measuring)requestAnimationFrame(gpuLoop);}
requestAnimationFrame(gpuLoop);
document.querySelector('button').addEventListener('click',event=>{if(event.isTrusted){accepted++;document.title=JSON.stringify({ready:true,finished:!measuring,accepted});}});
document.title='Browser signals ready';
setTimeout(()=>{
  measuring=false;running=false;clearInterval(cpuTimer);if(idleHandle!==undefined)cancelIdleCallback(idleHandle);if(videoHandle!==undefined)video.cancelVideoFrameCallback(videoHandle);video.pause();stream.getTracks().forEach(track=>track.stop());
  const quality=video.getVideoPlaybackQuality?.();
  const metrics={queueMs:summary(samples.gpu.map(x=>x[1])),mapMs:summary(samples.gpu.map(x=>x[2])),gpuMs:summary(samples.gpu.map(x=>x[3])),idleRemaining:summary(samples.idle.map(x=>x[1])),idleDelay:summary(samples.idle.map(x=>x[2])),videoSlack:summary(samples.video.map(x=>x[2])),videoCallbackDelay:summary(samples.video.map(x=>x[3])),raf:summary(samples.raf)};
  const result={mode,api,errors,startWallMs,durationMs:performance.now()-started,metrics,samples,videoFrames:samples.video.length,videoPausedAtStart,qualityBefore:qualityBefore&&{total:qualityBefore.totalVideoFrames,dropped:qualityBefore.droppedVideoFrames},qualityAfter:quality&&{total:quality.totalVideoFrames,dropped:quality.droppedVideoFrames},foreground:{hidden:document.hidden,focused:document.hasFocus()},accepted};
  document.title=JSON.stringify({ready:true,finished:true,accepted});
  const reportValue=parameters.get('report');if(!reportValue)return;const report=new URL(reportValue);if(report.protocol==='http:'&&report.hostname==='127.0.0.1')fetch(report,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(result)}).catch(()=>{});
},3200);
