# Heap snapshot detection boundary

Researched 2026-10-14 using primary V8, CDP, and W3C sources. Browser-only npm deployment remains the scope. No browser policy or native component is proposed.

## Privileged notifications are not page notifications

The CDP HeapProfiler domain defines snapshot chunks, progress, heap statistics, and reset events for its protocol client. `reportProgress` is optional. The reviewed definition supplies no document callback, consent gate, or DOM event for snapshot acquisition or debugger disconnection. Absence from this protocol is a narrow finding, not proof that acquisition causes no measurable side effects. [CDP protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/js_protocol.pdl)

V8's heap agent sends progress and chunks through its debugger frontend. Snapshot acquisition posts a non-nestable foreground task, except while paused or when non-nestable tasks are unavailable, when it captures immediately. It calls the isolate heap profiler and serializes the result. The reviewed path does not invoke a page-owned permission hook. HeapProfiler enable/disable state is held in inspector state, and disable clears tracking/object IDs. [Heap agent implementation](https://raw.githubusercontent.com/v8/v8/main/src/inspector/v8-heap-profiler-agent-impl.cc)

Inspector-session destruction discards injected scripts, disables its console/profiler/heap/debugger/Runtime agents, and disconnects the session. The inspected destructor has no document-visible disconnect notification. Inference: a page cannot rely on an immutable, sticky attachment flag from these paths after the privileged client detaches. [Session implementation](https://raw.githubusercontent.com/v8/v8/main/src/inspector/v8-inspector-session-impl.cc)

## Timing and collection side effects

The normal V8 snapshot generator enters a safepoint, collects available garbage with an internal heap-profiler reason, completes sweeping, and traverses references. These operations provide a concrete basis for a pause/collection hypothesis. The internal GC reason is not exposed as an authenticated web-page event in the reviewed path. Duration depends on heap and execution conditions; the source specifies no minimum page-observable pause. [Snapshot generator](https://raw.githubusercontent.com/v8/v8/main/src/profiler/heap-snapshot-generator.cc)

A heartbeat or worker heartbeat could notice scheduling delay; weak-reference/finalization probes could notice collection effects. These are hypotheses for measurement, not provenance guarantees. Collection and delays also occur without privileged heap reading. The Long Tasks standard explicitly says periodic-timer delay does not identify its cause; its own records concern tasks or rendering/UI pauses above 50 ms, with restricted attribution. Neither a delayed timer nor a long-task record identifies `HeapProfiler.takeHeapSnapshot`. [Long Tasks specification](https://w3c.github.io/longtasks/)

No reviewed source supports detecting every snapshot or disconnect without human false positives. A fail-closed timing rule can trade missed attacks for false blocks, but cannot turn delay into authenticated evidence. A separate worker can improve observation coverage only if its messages, timing source, and enforcement state remain trustworthy under the privileged attacker; that is an additional hypothesis to test.

## Useful experiment

Compare snapshot acquisition with ordinary garbage collection, legitimate heavy work, CPU contention, backgrounding, and sleep/resume. Test snapshots both while running and while debugger-paused, then detach and attempt completion. Record acquisition success and detector state separately. Reject any claim that a threshold proves agent resistance unless the actual attack is blocked and human controls pass. The source review establishes a leak path and possible side effects, not an npm-only prevention mechanism.
