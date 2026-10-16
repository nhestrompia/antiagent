# Renderer attachment side effects

Reviewed 2026-10-16. Chromium pin: Chrome `155.0.8059.40`, commit `cfaadc5a132d78e1828635aa8405a499f3e14864`. Its DEPS pins V8 to `56832c166a78bd1eb61068ac69876d6880eaabdf`. Scope: a fresh attached session, without Runtime, Debugger, or Console enable commands.

## New candidate: per-task attachment cost

Bare attachment does change the renderer. `WebDevToolsAgentImpl::AttachSession`, lines 318–321, adds a thread task observer for the first session. Lines 327–334 ensure a debugger object exists and connect the V8 session. This is distinct from enabling protocol domains.

Before each observed task, lines 633–640 call `ThreadDebugger::IdleFinished`. After each task, lines 643–650 call `IdleStarted` and `FlushProtocolNotifications`. Last-session detachment removes the task observer at lines 470–477. [Pinned renderer session client](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/core/exported/web_dev_tools_agent_impl.cc#316).

The idle callbacks check whether a debugger object exists, then call the V8 inspector. They do not check whether Runtime or Debugger is enabled. V8 forwards them to `Isolate::SetIdle(true/false)`. [Blink callback, lines 20–28](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/platform/bindings/thread_debugger.cc#20), [pinned V8, lines 367–369](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-inspector-impl.cc#367).

Hypothesis: many short MessageChannel tasks could expose extra cost per task. This is not the earlier Error-stack or screenshot/rAF probe. A source-level extra operation does not prove a usable timing gap. OS load, power state, timer precision, other observers, and retained debugger initialization can obscure it.

Test on one warm foreground page. Let the page record batches of about 1,000 tasks without Runtime evaluation. Randomize detached and attached periods, then compare task-batch times and a synchronous loop control. Include a listener with no attached client. Retrieve results after measurement. Repeat across new browsers and idle/load conditions before choosing a threshold. Attach-after-load and attach-before-load need separate trials. A detached period after the first attach is not a pristine browser.

If held-out timing distributions overlap materially, reject it as a reliable gate. Even a good result would establish a Chrome/version/device-specific detector, not an unforgeable attachment bit.

## Other traced state

`DevToolsAgent::AttachDevToolsSessionImpl`, lines 261–279, creates the session and updates an internal crash key. The trace event and `devtools_present` crash key are not shown here as web Performance API entries. [Agent implementation](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/core/inspector/devtools_agent.cc#230).

V8's connection path creates a session and records it in its session map. The constructor creates protocol agent objects; it restores domain state only when saved state exists. This trace does not establish that a fresh connection enables JIT debugging, allocation tracking, or profiler collection. [V8 connection, lines 224–247](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-inspector-impl.cc#224), [session constructor, lines 105–161](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-inspector-session-impl.cc#105).

`Navigator::webdriver`, lines 100–106, reads AutomationControlled or a probe override. It does not directly read the session count. Attachment alone therefore must not be inferred from that property. [Navigator source](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/core/frame/navigator.cc#100).

No mandatory DOM event, resource entry, or public performance entry was found in this bounded attach path. This is not proof that no detector can exist. The task observer is a concrete new source-backed experiment; the [live measurements](task-observer-findings.md) now record overlapping attached and detached timings.
