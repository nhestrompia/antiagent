# WebGPU copy restrictions and compositor capture

Tested 2026-10-13 on macOS, headed Chrome 155.0.8059.40.

Removing COPY_SRC from a WebGPU canvas texture blocked application readback. It did not hide the displayed canvas from CDP Page.captureScreenshot with fromSurface: true.

| Canvas texture configuration | Application copy-to-buffer | Compositor screenshot |
| --- | --- | --- |
| RENDER_ATTACHMENT only | Validation rejected 3/3 | Control visible 3/3 |
| RENDER_ATTACHMENT and COPY_SRC | Pixels recovered 3/3 | Control visible 3/3 |

All six captures contained the expected teal control pixel. Visual inspection of the first restricted capture also confirmed that “Confirm transfer” remained readable. The successful copy control returned BGRA bytes; screenshot pixels were RGBA.

This is a static rendering experiment. It does not measure agent task completion, native screenshots, or human usability. No unsupported or failed initialization cases occurred in this run. An earlier run could not connect to the stopped development server; that failure is not capture protection evidence.

Run npm run dev, then npm run benchmark:webgpu. Open /webgpu-capture.html for the restricted case and add ?copy=on for the copy control. Results are in [webgpu-capture-results.json](webgpu-capture-results.json); local images are under artifacts/webgpu-capture/.

The documented [GPUCanvasContext configuration](https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure) governs application texture usage. This test shows that its copy restriction does not transfer to Chrome's compositor capture path on the tested system.
