# Page events during CDP capture and attachment

Reviewed 2026-10-16. Primary pin: Chrome `155.0.8059.40`, commit `cfaadc5a132d78e1828635aa8405a499f3e14864`. The `CaptureScreenshot` function through `StartScreencast` is byte-identical in `155.0.8059.80` (SHA-256 `4c47ef4cd643466b10cf9bc2a7231add02966a508310dac43d8c7c7a2e7d159b`). This comparison does not cover all downstream browser changes.

## Required operations versus optional routes

The screenshot handler uses a hidden, awake capturer with an empty preferred size, at lines 1421–1427. It does not explicitly start printing, change selection, pause animation, or dispatch a capture event.

Resize-related work depends on parameters:

| Route | Source condition |
| --- | --- |
| Plain surface capture, no clip or emulation | No view-size setter; unchanged emulation can be a no-op |
| Clip | Changes emulated viewport and calls view `SetSize` |
| Existing device emulation | Adjusts scale/view size |
| Beyond-viewport | Temporarily hides scrollbars, records the whole document, and applies a 1×1 emulation workaround |
| Window capture | Separate trusted-client branch, skipping surface emulation work |

These branches explain possible resize, media-query, viewport, and observer effects. They do not make those effects mandatory for a foreground same-viewport capture. [Pinned handler, lines 1434–1569](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/protocol/page_handler.cc#1434), [.80 comparison](https://chromium.googlesource.com/chromium/src/+/155.0.8059.80/content/browser/devtools/protocol/page_handler.cc#1370).

`SetDeviceEmulationParams` explicitly returns when emulation remains disabled or parameters are unchanged. Calling it during capture is therefore not proof of a renderer mutation. [Emulation implementation, lines 1089–1104](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/protocol/emulation_handler.cc#1089).

## Capture count, lifecycle, and visibility

`IncrementCapturerCount`, lines 2749–2796, increments hidden/awake counts, requests a browser wake lock, and recalculates visibility. The hidden route requires an empty capture size specifically to avoid size side effects. Decrement reverses counts and recalculates visibility. These are browser operations, not DOM notifications by themselves.

Visibility propagation depends on calculated page state. The observer notification for visibility change is conditional, at lines 5230–5234. A page already visible need not change visibility merely because a hidden capturer starts. Hidden-page frame production remains a different case. [Capture count](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/web_contents/web_contents_impl.cc#2749), [visibility propagation](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/web_contents/web_contents_impl.cc#5202).

On Mac, `WebContentsViewMac::OnCapturerCountChanged` is empty. It supplies no extra native-view callback that a page could directly observe. [Pinned Mac implementation, line 193](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/web_contents/web_contents_view_mac.mm#193).

## Forced redraw is not a capture event

`GetSnapshotFromBrowser`, lines 2303–2323, chooses either the new-surface force-redraw/repaint/copy path or the older forced-redraw route. The new route's `WidgetBase::ForceRedraw` requests presentation feedback and a forced compositor commit. Its extra animation scheduling call is explicitly a production no-op used for web tests. This does not define an `animationstart`, resize, mutation, selection, or print event. Existing frame callbacks may run as rendering progresses; their occurrence is not capture provenance. [Browser snapshot](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/renderer_host/render_widget_host_impl.cc#2303), [renderer redraw, lines 423–435](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/platform/widget/widget_base.cc#423).

## Bare attachment

The previously traced attach path adds a task observer, connects V8, creates inspector agents, and sends internal widget/autofill connection notifications. The reviewed path does not dispatch a mandatory document lifecycle, selection, media, or print event. Internal connection notifications must not be confused with web events. [Exact attach trace](cdp-attachment-side-effects-review.md).

The live attach-cycle trial used `setDeviceMetricsOverride` before navigation. Detaching produced a resize to native `1200×755`, DPR 2, in 3/3 trials; reattachment caused no further event. This matches optional emulation teardown. Session setup calls each handler's `Wire`, then stores it. Disposal first resets the dispatcher, calls each handler's `Disable`, then clears the handlers; the session destructor calls disposal if necessary. Emulation's destructor is defaulted. Its `Disable`, lines 193–209, clears the emulation size and updates emulation state only when device emulation was enabled. This explicitly restores a disconnected client's override. A plain session without that override need not resize. [Session ordering, lines 150–193](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/devtools_session.cc#150), [emulation teardown, lines 135–224](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/protocol/emulation_handler.cc#187).

No overlooked mandatory page notification emerged from this bounded trace. That is not proof that all side channels are impossible. A repeatable event/state transition during foreground no-clip capture, absent under equivalent ordinary rendering, would justify tracing that specific callback. A readable capture without it would reject a required-notification claim. Optional full-page or emulation events cannot establish the stronger claim.
