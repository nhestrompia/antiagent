# Follow-up source audit: additional Playwright/CDP cues

Research date: 2026-10-14. Installed Playwright baseline: 1.64.0. This pass excludes already measured target marking, screenshot preparation, timing, webdriver and HDCP signals.

## New conditional cue: listener-survival check

Installed injected code registers a window listener named `__playwright_global_listeners_check__` and a document child-list MutationObserver. If an added node equals the current `document.documentElement`, it dispatches a CustomEvent with that name on the window to check whether its listeners survived. The snapshotter has a parallel `__playwright_snapshotter_global_listeners_check__` check. These are conditional on replacing/adding the document root, not emitted for every capture or input. [Official injected implementation](https://github.com/microsoft/playwright/blob/main/packages/injected/src/injectedScript.ts), [installed snapshotter check](../node_modules/playwright-core/lib/coreBundle.js#L15464).

**Cheap discriminating experiment:** in a disposable page, register main-world window listeners for those exact events before any automation helper executes. Replace the document root once while preserving the page's test harness through window-held references. Compare bare CDP, Playwright navigation-only, a locator operation, a screenshot-only operation, and tracing enabled. Record events and actual action/capture outcome. This tests whether initialized helper code reveals itself across the shared DOM; a missing event before helper initialization does not refute the source path.

**Limits:** whole-root replacement can disturb focus, selection, component state and accessibility. It is an experiment, not proposed production behavior. The signal can be absent for direct CDP and can be removed from a modified helper. Main-world preload can suppress the site's event handling. A positive result would identify a particular injected runtime, not prove human presence or disable the protocol.

## Listener infrastructure is not a page listener inventory

Installed injected code attaches capture listeners for hit-target interception to the window, restoring them after its survival check. A main-world `addEventListener` replacement is not established to intercept utility-world registration. Shared DOM dispatch and JavaScript prototype interception are different boundaries.

CDP's `DOMDebugger.getEventListeners` and breakpoint commands belong to the debugger protocol; their existence does not give the document equivalent access to other-world listener objects or a notification whenever the debugger enumerates them. No such page notification was identified in the reviewed protocol schema. [Official browser protocol definitions](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json).

## Pointer metadata is caller-shaped, not attestation

Pinned Chromium 155 accepts optional event timestamps and maps them to internal ticks. Pointer type, pressure, tilt, twist and related inputs are explicit debugger arguments. Dispatch also converts widget coordinates to screen coordinates. Thus a default-shaped event or unusual timestamp could support a restricted caller heuristic, but is not an immutable provenance flag. The reviewed construction supplies no new public attestation field. [Pinned InputHandler](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/devtools/protocol/input_handler.cc).

A narrow timestamp test can compare default versus explicitly supplied plausible timestamps on an otherwise identical action, with a physical mouse control. Any guard defeated by the parameterized call is a default-caller detector. Likewise require pen, touch and keyboard controls before promoting a pointer-shape rule. This is a test plan, not new evidence that the previously measured metadata failures have changed.

## Decision

The root-replacement listener-check event is the only new concrete source-derived cue from this pass. Test it against initialized and uninitialized helper cases. No new page-owned screenshot veto or unforgeable CDP input field was identified. Do not use listener-debugging protocol APIs as though they were available to website JavaScript.
