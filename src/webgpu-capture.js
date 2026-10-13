async function run() {
  if (!navigator.gpu) return { unsupported: 'navigator.gpu unavailable' };
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return { unsupported: 'GPU adapter unavailable' };
  const device = await adapter.requestDevice();
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const copyEnabled = new URLSearchParams(location.search).get('copy') === 'on';
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, usage: GPUTextureUsage.RENDER_ATTACHMENT | (copyEnabled ? GPUTextureUsage.COPY_SRC : 0) });
  const source = new OffscreenCanvas(720, 480), drawing = source.getContext('2d');
  drawing.fillStyle = '#fff'; drawing.fillRect(0, 0, 720, 480);
  drawing.fillStyle = '#116456'; drawing.fillRect(40, 200, 180, 70);
  drawing.fillStyle = '#fff'; drawing.font = '18px sans-serif'; drawing.fillText('Confirm transfer', 50, 240);
  const bitmap = await createImageBitmap(source);
  const texture = device.createTexture({ size: [720, 480], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [720, 480]);
  bitmap.close();
  const shader = device.createShaderModule({ code: `
    struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f };
    @vertex fn vertex(@builtin(vertex_index) index:u32)->Vertex {
      let positions=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
      let p=positions[index];var result:Vertex;result.position=vec4f(p,0,1);result.uv=vec2f(p.x*.5+.5,.5-p.y*.5);return result;
    }
    @group(0) @binding(0) var image:texture_2d<f32>;
    @group(0) @binding(1) var imageSampler:sampler;
    @fragment fn fragment(input:Vertex)->@location(0) vec4f {return textureSample(image,imageSampler,input.uv);}
  ` });
  const pipeline = device.createRenderPipeline({ layout: 'auto', vertex: { module: shader, entryPoint: 'vertex' }, fragment: { module: shader, entryPoint: 'fragment', targets: [{ format }] } });
  const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: texture.createView() }, { binding: 1, resource: device.createSampler() }] });
  const output = context.getCurrentTexture();
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({ colorAttachments: [{ view: output.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
  pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
  device.queue.submit([encoder.finish()]);
  const bytesPerRow = Math.ceil(720 * 4 / 256) * 256;
  const buffer = device.createBuffer({ size: bytesPerRow * 480, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  device.pushErrorScope('validation');
  const copier = device.createCommandEncoder();
  copier.copyTextureToBuffer({ texture: output }, { buffer, bytesPerRow }, [720, 480]);
  device.queue.submit([copier.finish()]);
  const validation = await device.popErrorScope();
  let readbackPixel = null;
  if (!validation) {
    await buffer.mapAsync(GPUMapMode.READ);
    readbackPixel = [...new Uint8Array(buffer.getMappedRange(), 220 * bytesPerRow + 60 * 4, 4)];
    buffer.unmap();
  }
  buffer.destroy();
  return { copyEnabled, format, textureUsage: output.usage, copyError: validation?.message || null, readbackPixel };
}
try { document.querySelector('#status').textContent = JSON.stringify(await run()); }
catch (error) { document.querySelector('#status').textContent = JSON.stringify({ initializationError: error.message }); }
