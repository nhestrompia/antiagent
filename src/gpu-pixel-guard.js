const parameters=new URLSearchParams(location.search);
const guard=parameters.has('guard'), cpu=parameters.has('cpu');
const gl=document.querySelector('canvas').getContext('webgl2',{antialias:false});
const state={ready:false,guard,cpu,blocked:false,reason:null,lockAtMs:null,accepted:0,finished:false};
const samples=[],pixel=new Uint8Array(4);
let armedAt;
function publish(){document.title=JSON.stringify(state);}
function block(reason){
  if(state.blocked)return;
  state.blocked=true;state.reason=reason;state.lockAtMs=armedAt===undefined?null:performance.now()-armedAt;
  document.querySelector('#cover').style.display='block';publish();
}
if(!gl){state.error='WebGL2 unavailable';publish();}
else {
  function shader(type,source){const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(result));return result;}
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,`#version 300 es
    void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`#version 300 es
    precision highp float;out vec4 color;void main(){color=vec4(.1,.8,.2,1);}`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const initialized=performance.now();
  document.querySelector('button').addEventListener('click',event=>{if(event.isTrusted&&state.ready&&!state.blocked){state.accepted++;publish();}});
  document.addEventListener('keydown',event=>{if(event.isTrusted&&event.key==='b')block('forced-control');});
  function frame(){
    if(cpu){const until=performance.now()+4;while(performance.now()<until){}}
    gl.drawArrays(gl.TRIANGLES,0,3);
    const begin=performance.now();gl.readPixels(256,256,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    samples.push(performance.now()-begin);if(samples.length>60)samples.shift();
    if(performance.now()-initialized>=750&&samples.length===60){
      const sorted=[...samples].sort((a,b)=>a-b),median=sorted[30];
      if(!state.ready){state.ready=true;armedAt=performance.now();state.initialMedian=median;document.querySelector('#secret').style.display='flex';}
      if(guard&&median<1)block('readback-median');
      if(!state.finished&&performance.now()-armedAt>=3500){state.finished=true;state.finalMedian=median;state.gpuError=gl.getError();state.pixel=[...pixel];publish();
        const report=parameters.get('report');
        if(report){const target=new URL(report);if(target.protocol==='http:'&&target.hostname==='127.0.0.1')fetch(target,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({...state,environment:{devicePixelRatio,innerWidth,innerHeight},userAgent:navigator.userAgent})}).catch(()=>{});}
      }
      else if(!state.publishedReady){state.publishedReady=true;publish();}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
