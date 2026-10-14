# Runtime error-stack cost source review

Researched 2026-10-14. Primary-source review; measured results belong in the live experiment's findings. These sources track main/master and do not establish the exact implementation of every installed browser version.

## Mechanism and explicit suppression

V8's Runtime agent enables the debugger's default maximum stack-capture size when `Runtime.enable` runs. `Runtime.disable` removes that agent's request with size `-1`. `Runtime.setMaxCallStackSizeToCapture` accepts nonnegative sizes, including zero, while Runtime is enabled; it stores the requested size and forwards it to the debugger. These are mutable session settings, not immutable attachment provenance. [V8 Runtime implementation](https://raw.githubusercontent.com/v8/v8/main/src/inspector/v8-runtime-agent-impl.cc)

The command is present as an experimental Runtime command in the current protocol. `Debugger.setAsyncCallStackDepth(0)` separately disables async-stack collection. `Debugger.setSkipAllPauses(true)` controls pauses, not this synchronous stack-capture setting; those two commands should not be assumed equivalent to setting Runtime's capture size to zero. [Protocol source](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/js_protocol.pdl)

V8 computes the maximum requested capture size across enabled Runtime agents. No agents means uncaught-exception capture is disabled. If agents remain but all request zero, it also calls `SetCaptureStackTraceForUncaughtExceptions(false, 0)`. A second session with a positive request can keep capture active. The source comments explicitly identify minimizing inspector overhead for performance automation as the reason for this control. This is direct evidence of an intended suppression path, rather than a speculative timing workaround. [V8 debugger implementation](https://raw.githubusercontent.com/v8/v8/main/src/inspector/v8-debugger.cc)

During error-stack creation, V8 can collect the maximum of the JavaScript program's `Error.stackTraceLimit` and the inspector's requested frame limit. The additional inspector branch stores detailed stack information when uncaught-exception capture is enabled. Setting `Error.stackTraceLimit=0` therefore does not itself remove the inspector's request; setting the debugger's effective request to zero disables that capture flag. This explains a possible Runtime-dependent creation-cost signal without proving a reliable numerical threshold. [V8 isolate implementation](https://raw.githubusercontent.com/v8/v8/main/src/execution/isolate.cc)

## Implication for screenshot/input automation

The reviewed Chromium screenshot and input handlers operate through browser widget capture and input routing, respectively, and do not require the V8 Runtime agent to be enabled in their handler paths. Inference: an attacker can attempt capture/input with Runtime absent or disabled, or leave Runtime enabled while requesting zero stack frames. Actual acceptance and application completion must be checked against the installed browser. [Chromium screenshot handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/page_handler.cc), [Chromium input handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/input_handler.cc)

A timing detector can identify a configuration that incurs extra work. It cannot infer that every attached debugger has that configuration, and it cannot prove human provenance from the absence of overhead. Required controls are bare CDP, Runtime enabled at default size, enabled plus size zero, then disabled; use isolated sessions and verify screenshot/input still work in each. Include genuine non-debugged execution so any false block remains visible.
