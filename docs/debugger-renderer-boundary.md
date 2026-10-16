# Debugger access to renderer state

Research date: 2026-10-14.

## Module scopes

CDP exposes paused call frames and their scope chains. `Debugger.evaluateOnCallFrame` evaluates in a selected paused frame. `Runtime.getProperties` returns properties of remote objects. These commands differ from a global lookup through ordinary page JavaScript. [Official protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/js_protocol.json).

V8 checks that execution is paused, finds the call frame, and invokes debugger evaluation. The caller chooses side-effect checks and result handling. An unexported module value can therefore remain available in a live paused frame. Uninitialized or optimized values can limit access. This source uses current V8 main, not a pinned installed build. [V8 implementation](https://github.com/v8/v8/blob/main/src/inspector/v8-debugger-agent-impl.cc).

Our Chrome test confirms this distinction for the actual renderer. Global lookup returned undefined. Call-frame evaluation recovered target positions and the original unmasked image cache. Removing that cache stopped its export, but target-position reads still allowed task completion. [Live test findings](debugger-renderer-findings.md).

## Workers

Chromium implements a DevTools agent host for dedicated workers. This establishes debugger infrastructure for that worker type. It does not establish access to every worker or worklet. [Worker agent host](https://github.com/chromium/chromium/blob/main/content/browser/devtools/dedicated_worker_devtools_agent_host.cc).

Chromium 155's Target handler implements discovery and attachment. Restricted access modes can reject commands. Auto-attach, filters, and startup waiting belong to the debugger session. They are not worker constructor options. [Pinned Target handler](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/devtools/protocol/target_handler.cc).

## Boundary

Object freezing does not change V8's call-frame evaluator. The debugger can also select skip-pauses behavior. These source paths place the command controls with the debugger client. No website-owned veto was found in the reviewed implementations. This is a source-based conclusion, not a proof about every browser feature.

Worker attachment, frozen-object access, and skip-pauses remain untested here. The live evidence concerns module scopes in our Chrome renderer.
