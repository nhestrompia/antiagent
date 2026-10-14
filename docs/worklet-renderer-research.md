# Worklets as a renderer boundary

Research date: 2026-10-14. Sources use Chromium main, not a pinned installed build. No worklet runtime test occurred in this pass.

## Inspector access

Chromium's worklet agent host reports type worklet and accepts session attachment. This shows debugging infrastructure, but not that every paint or audio configuration creates an independent target. [Agent host](https://github.com/chromium/chromium/blob/main/content/browser/devtools/worklet_devtools_agent_host.cc).

The script controller names main-thread worklet worlds and registers threaded contexts with the worker debugger. Worklet scopes route inspector probes through frame or worker infrastructure. A missing entry in Target discovery alone does not establish isolation. Existing page execution contexts also need inspection. [Script controller](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/bindings/core/v8/worker_or_worklet_script_controller.cc), [inspector routing](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/workers/worklet_global_scope.cc).

## Paint API limits

Paint callbacks consume geometry and CSS properties and produce an image. Their rendering context excludes text and image-data APIs. The exposed scope supplies no MessagePort action-return channel. Browsers normally maintain multiple scopes and can dispose instances. A single paint instance therefore cannot serve as a portable durable action validator. [CSS Painting specification](https://www.w3.org/TR/css-paint-api-1/).

Private paint calculations can reduce ordinary main-world exposure. Input still requires a DOM/CSS bridge, and application logic needs a separate return path. Those limits do not establish screenshot protection.

Audio worklets supply bidirectional messaging, but no protected visual output. Their actual debugger accessibility needs its own test. [Web Audio specification](https://www.w3.org/TR/webaudio/#AudioWorkletProcessor).

## Source replacement

Worklet modules load through addModule. CDP supplies response interception and CSP bypass controls. A failed direct evaluation in one realm would not establish module integrity. [Browser protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json).

A useful runtime test would record targets and execution contexts, pause inside callbacks, and inspect live scope bindings. It should also test controlled module replacement. No reviewed source supplies a website-selected non-debuggable worklet or a protected compositor output.
