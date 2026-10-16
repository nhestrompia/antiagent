# Console retention with bare CDP

Reviewed 2026-10-16. Sources pin V8 `56832c166a78bd1eb61068ac69876d6880eaabdf`, the revision in Chrome `155.0.8059.40`. Scope: a fresh CDP session with Runtime, Debugger, and Console disabled.

## Retention does not identify attachment

`V8ConsoleMessage::createForConsoleAPI`, lines 470–474, keeps strong global handles to logged arguments. Storage keeps messages with count and size limits, at lines 595–610. These operations do not require an attached session. `console.clear()` clears stored messages and releases each session's console object group, at lines 613–620. [Pinned message storage](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-console-message.cc#451).

Therefore, logging an object and observing that its WeakRef survives is not evidence of bare CDP attachment. The browser can retain it while detached. Failure of a FinalizationRegistry callback is also inconclusive: ECMAScript does not require prompt collection or finalization. [WeakRef processing rules](https://tc39.es/ecma262/multipage/managing-memory.html#sec-weak-ref-processing-model).

Runtime's `messageAdded`, lines 1231–1232, reports only when enabled. Console's equivalent, lines 53–54, also checks its enabled flag. With both disabled, this trace does not wrap logged objects for a remote frontend. Extra remote-object retention after enabling Runtime would test that domain, not bare attachment. [Runtime agent](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-runtime-agent-impl.cc#1231), [Console agent](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-console-agent-impl.cc#53).

## New bounded timing candidate

There is real per-session work even when the domains are disabled. Message insertion iterates attached sessions and calls their Console and Runtime agent checks, at lines 586–592 of the storage source above.

Ordinary console calls also request a stack. Despite the nearby comment's broad use of “debugger attached,” the actual `captureStackTrace(false)` implementation iterates sessions and increases stack depth only if a session's Runtime agent is enabled. Otherwise it captures one frame, including with no session. [Console call path, lines 114–153](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-console.cc#114), [actual stack condition, lines 1389–1405](https://chromium.googlesource.com/v8/v8/+/56832c166a78bd1eb61068ac69876d6880eaabdf/src/inspector/v8-debugger.cc#1389).

Hypothesis: many simple console calls could amplify session-iteration cost. This differs from Error getter serialization and the per-task observer test. It remains a timing hypothesis, not a new retention bit. Keep logs primitive, clear between batches, avoid recursion, and compare a synchronous no-console loop. Randomize attached/detached periods on the same warm foreground page. Include fresh never-attached browsers. Record results locally during measurement, without Runtime reads. No application guard should depend on this until held-out trials separate the states under normal CPU load.

`console.timeEnd` deliberately captures one frame for stable cost. `console.trace` deliberately captures a full stack even before attachment. These are poor starting points for an attachment-only depth test. Counter and timer state live in console storage; this review found no attachment-only reset or public return-value marker.

## Outcome

The [live console-call measurements](console-cost-findings.md) now record overlapping attached and detached timing ranges.

No source-backed WeakRef/finalization detector emerged for bare attachment. The concrete new candidate is amplified per-session console-call cost. Overlapping timing distributions would reject it as a reliable gate. A repeatable collection difference after clearing messages, with both reporting domains disabled and equal object lifetimes, would justify a deeper retention trace. This review does not prove that every such difference is impossible.
