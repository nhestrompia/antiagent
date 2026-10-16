# Desynchronized canvas source review

Researched 2026-10-14 against the HTML standard and Chromium main. This candidate differs from the [WebGPU usage-flag experiment](webgpu-capture-findings.md). Source review alone does not replace the installed-browser screenshot/input test.

## Contract

`desynchronized=true` allows the browser to optimize input-to-raster latency, including bypassing ordinary rendering scheduling or using front-buffer rendering. The standard permits those optimizations; it does not require them. The setting is a latency hint with possible tearing, not a protected-output flag or a screenshot-denial permission. Context-attribute readback establishes the reported context setting, not which OS presentation path was actually selected. [HTML canvas standard](https://html.spec.whatwg.org/multipage/canvas.html#dom-canvasrenderingcontext2dsettings-desynchronized)

## Chromium path and platform limits

Chromium's `HTMLCanvasElement` creates a resource dispatcher for desynchronized contexts. Its low-latency frame path exports the rendered canvas resource and dispatches a frame. Only Canvas2D and WebGL receive these specific low-latency flows; the source calls other context types a no-op. [Canvas element implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/canvas/html_canvas_element.cc)

The dispatcher builds a `viz::CompositorFrame`, attaches the exported resource, and submits it through a compositor frame sink. Thus a bypass of ordinary main-thread paint scheduling is not evidence that the resource lives outside the browser's compositor infrastructure. [Resource dispatcher](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/platform/graphics/canvas_resource_dispatcher.cc)

Current `canvas_utils.cc` gates low-latency usage on platform capability: Windows needs shared-image swap-chain support; Android needs SurfaceControl and a feature flag; ChromeOS has distinct Canvas2D/WebGL conditions. Both Canvas2D and WebGL fallbacks return false on other platforms, with an explicit comment that desynchronized low-latency usage is currently a no-op on Mac. Apple delegated compositing can independently enable overlays, but that is a separate capability. Do not equate `getContextAttributes().desynchronized === true` with low-latency scanout or capture exclusion. Installed versions may differ from main. [Current platform gates](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/platform/graphics/gpu/canvas_utils.cc)

## Overlay does not establish protection

The Windows DirectComposition overlay processor covers video and low-latency canvas overlays. It skips ordinary overlay promotion when the render pass has capture/copy requests, and accounts for previous overlay damage. Hardware-protected video has separate handling. Inference: ordinary canvas overlay promotion is a presentation optimization that can fall back for capture; it does not confer hardware-protected video's security properties. This source is specific to that Windows path, not proof of identical behavior on every OS. [DirectComposition overlay processor](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/dc_layer_overlay.cc)

No reviewed contract or implementation grants this application an unforgeable capture-excluded surface through `desynchronized` or low-latency canvas settings. A blank or stale screenshot would require a visible-screen positive control and repeated capture attempts to distinguish an actual exclusion from unsupported rendering, cleared WebGL buffers, or timing artifacts. Chrome's original guidance recommends `preserveDrawingBuffer=true` to avoid WebGL flicker during desynchronized display, reinforcing that buffer lifetime is a separate concern. [Chrome low-latency guidance](https://developer.chrome.com/blog/desynchronized)
