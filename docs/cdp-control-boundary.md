# CDP control boundary

Reviewed 2026-10-16. Scope: a browser-only npm package in ordinary desktop Chrome on macOS. Source pins use Chrome `155.0.8059.40`, commit `cfaadc5a132d78e1828635aa8405a499f3e14864`. This is a claim about the paths below, not every possible browser feature.

## Capture authority

`Page.captureScreenshot` defaults `fromSurface` to true. Chrome's browser-process handler sends this path to `GetSnapshotFromBrowser(..., true)` at lines 1566–1569. The false branch requires a trusted debugger client at lines 1435–1444. That client trust check does not ask the document for consent. The reviewed handler has no cancellable document event or document permission check before surface capture. [Pinned handler](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/protocol/page_handler.cc#1370).

Inference: a package can change the pixels it submits. It cannot intercept this browser command by replacing page canvas export functions. Full-page capture can cause size changes; that side effect is not a required precursor to a same-viewport surface capture.

`display-capture` policy controls a document's use of `getDisplayMedia`. It does not make the displayed document uncapturable through CDP. [Screen Capture policy integration](https://www.w3.org/TR/screen-capture/#permissions-policy-integration).

## Input authority

Chrome's CDP input injector forwards mouse and keyboard events through the widget, at lines 757 and 789. Blink creates mouse/click events and calls internal `DispatchEvent`, at lines 242–271 and 279–288. Internal dispatch sets `isTrusted=true`; JavaScript's dispatch path sets it false. Thus trust distinguishes these paths, not a person from a debugger. [CDP injector](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/protocol/input_handler.cc#757), [mouse conversion](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/core/input/mouse_event_manager.cc#242), [trust assignment](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/core/dom/events/event_target.cc#852).

The application can reject an action. The reviewed input path gives it no human attestation. Read-only event fields alone do not supply one. In particular, Chromium maps mouse `persistentDeviceId` without requiring a hardware ID. [Earlier field trace](persistent-device-id-source-review.md).

## Attachment signals and remaining candidate

The reviewed protocol defines attachment and detachment notifications for debugger clients. It defines no required web-page attachment event or page-owned refusal callback. This is protocol evidence, not proof that attachment has zero measurable effects. [Target domain](https://chromedevtools.github.io/devtools-protocol/tot/Target/), [Inspector domain](https://chromedevtools.github.io/devtools-protocol/tot/Inspector/).

No new untested page-controlled veto emerged. Mac protected video has a real native `preventsCapture` path, but it is separate from browser compositor copies. It also needs protected media metadata; arbitrary DOM/canvas cannot set it. [Producer trace and limits](secure-quad-producer-trace.md). It remains a route-specific experiment, not a package-wide screenshot/input gate.

## What would falsify these findings

A shipped page API or policy that cancels same-viewport CDP surface capture would falsify the capture finding. A browser-generated input field that all supported physical inputs have, and CDP input cannot obtain, would falsify the provenance finding. A mandatory page attachment event that runs before screenshot/input and can refuse the session would falsify the attachment finding. Each needs a source trace and a live test with Runtime absent. A timing correlation or one failed automation script is insufficient.
