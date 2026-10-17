const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2', {antialias: false});
const samples = [];
const pixel = new Uint8Array(4);
const workload = new URLSearchParams(location.search).get('workload') === 'on';
const cpuWork = new URLSearchParams(location.search).get('cpu') === 'on';
let started = null;
let finished = false;
let contextLost = false;
canvas.addEventListener('webglcontextlost', () => {contextLost = true;});
if (!gl) {
  document.title = JSON.stringify({error: 'WebGL2 unavailable'});
} else {
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `#version 300 es
    void main() {vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2); gl_Position=vec4(p*2.0-1.0,0,1);}`));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float; out vec4 color;
    void main() {color=vec4(0.1,0.8,0.2,1);}`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  document.addEventListener('keydown', event => {
    if (event.isTrusted && event.key === 's' && started === null) started = performance.now();
  });
  function frame() {
    if (finished) {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
      return;
    }
    if (cpuWork) {const until=performance.now()+4; while(performance.now()<until) {}}
    const begin = performance.now();
    for (let i = 0; i < (workload ? 128 : 1); i++) gl.drawArrays(gl.TRIANGLES, 0, 3);
    const submitted = performance.now();
    gl.readPixels(256, 256, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const completed = performance.now();
    if (started !== null && completed - started >= 250) {
      samples.push({atMs: begin - started, submitMs: submitted - begin, readbackMs: completed - submitted});
      if (completed - started >= 3250) {
        finished = true;
        const values = samples.map(sample => sample.readbackMs).sort((a,b) => a-b);
        const result = {workload, cpuWork, contextLost, gpuError: gl.getError(), pixel: [...pixel],
          warmupMs: 250, readbackTimesMs: samples.map(sample => Number(sample.readbackMs.toFixed(3))),
          metrics: {count: values.length, median: values[Math.floor(values.length*.5)],
            p95: values[Math.floor(values.length*.95)], maximum: values.at(-1)}};
        document.querySelector('pre').textContent = JSON.stringify(result.metrics, null, 2);
        document.title = JSON.stringify(result);
        requestAnimationFrame(frame);
        return;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.title = 'GPU probe ready';
}
