# Chromium capture-trigger investigation

Researched 2026-10-13. Browser-side code contains capture/input markers, but a marker inside Chromium is not automatically readable by page JavaScript. The strongest remaining observable candidates are **conditional geometry changes during full-page/clip capture** and **painting activity in otherwise hidden tabs**, not a universal screenshot event.

## Pinned Chrome 155 screenshot path

Chrome 155.0.8059.40's PageHandler creates a screenshot request with a temporary capturer handle: empty preferred size, `stay_hidden=true`, `stay_awake=true`, `is_activity=false`. This asks the browser to produce frames even when hidden. `fromSurface=false` takes a different view snapshot path and requires a trusted protocol client. Surface captures with clips/device emulation set temporary viewport/view sizes. `captureBeyondViewport` sets `hide_scrollbars` and `record_whole_document`, briefly sets an emulated 1×1 view, then sets the requested view; screenshot completion restores saved state. These are concrete potential resize/scrollbar observability hypotheses, conditional on parameters and timing. No screenshot-start DOM event or page permission check appears in this path. [Pinned PageHandler](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/content/browser/devtools/protocol/page_handler.cc)

Current main retains that capturer-handle mechanism, with additional screenshot surface handling and rounding changes. Do not use current-main details to claim every installed 155 behavior is identical. [Current PageHandler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/page_handler.cc)

Pinned WebContents code distinguishes visible and hidden capturer counts. Hidden capture must use an empty preferred capture size to avoid that resizing side effect. It refreshes page/view visibility and, when the tab is otherwise hidden, selects internal `kHiddenButPainting` rather than `kHidden`. These browser states are not a public capture-status property. A visible tab can remain visible throughout. Possible painting/rAF differences require live measurements; browser thumbnails, media/PiP, and other capture clients are controls for false positives. [Pinned WebContents](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/content/browser/web_contents/web_contents_impl.cc)

## Input markers versus DOM properties

Pinned Chrome 155 InputHandler adds internal `WebInputEvent::kFromDebugger` to protocol-generated modifiers. The same flag is used by browser-side acknowledgement handling to complete pending protocol input callbacks. This establishes a reliable internal marker, but not a JavaScript-readable event property. [Pinned InputHandler](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/content/browser/devtools/protocol/input_handler.cc)

Current Blink UIEventWithKeyState maps public modifier getters and `getModifierState` to a finite list of ordinary keys/locks. It has no debugger entry, and unknown modifier names return false. Therefore `getModifierState('FromDebugger')` is not a documented route to the internal bit. Current MouseEvent retains modifier state internally and passes source capabilities through event construction; its inspected code has no `kFromDebugger`-to-public-property conversion. This is a scoped source finding, not proof that every conceivable behavioral side channel has been exhausted. [Modifier implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/events/ui_event_with_key_state.cc), [MouseEvent implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/events/mouse_event.cc)

Pointer source capabilities, pressure, IDs, timestamps, coalesced-event counts, and motion sequences can differ across actual input sources. No inspected source establishes a public boolean in these properties that universally means debugger input. A browser automation client also controls many dispatch parameters. Treat correlations as heuristics, and compare real mouse, trackpad, keyboard, touch emulation, and CDP separately.

## Recommended observability lab

Record resize/visualViewport/scroll/visibility/focus events, continuous geometry and scrollbar-width samples, rAF timestamps, and pointer/key properties into an in-memory log. Run:

1. Default viewport surface screenshot, no clip/full-page option.
2. Clip at unchanged dimensions, then a different-size clip.
3. `captureBeyondViewport=true` with a tall page.
4. View snapshot if supported for the trusted client.
5. Hidden/background tab surface capture and an equivalent idle interval.
6. Manual resizing, tab switching, DevTools opening, browser thumbnail/PiP behavior, and ordinary scrolling as controls.

For input, compare CDP and manual action using the same element/coordinates and inspect all public properties, including trust and modifier names. A candidate is useful only if it fires before the sensitive observation/action and remains distinguishable from ordinary human behavior. Resize triggered by some full-page screenshots is a partial detector; the default no-resize viewport path is an essential bypass control. There is no evidence here of a page-side veto that makes the privileged screenshot operation fail.

## Follow-up measured outcome

The Chrome 155 lab completed 36 fresh-page cases, with guard on/off and three repetitions per method. Full-page Playwright and CDP captures changed document client width from 976 to 1000 and emitted resize signals. A geometry guard produced black pixels in the actual captured control region and accepted zero actions in all three runs for each full-page method. Unguarded controls remained readable and actionable. **Viewport screenshots emitted no recorded geometry/lifecycle change and bypassed the guard without tampering. Ordinary resize also triggered the guard**, establishing a human false positive. This confirms a useful conditional capture side effect, not universal screenshot prevention. [Measured findings](capture-signals-findings.md), [Raw results](capture-signals-results.json)

CDP input in that lab was trusted and activated userActivation; public `fromDebugger` was absent and `getModifierState('FromDebugger')` returned false. Pressure and source capabilities were recorded without establishing a human/automation discriminator. [Measured findings](capture-signals-findings.md)

## Event Timing and pointer-marker follow-up

Current main's Event Timing code filters ordinary input by `IsFullyTrusted`, excluding high-frequency move/wheel events. It does not check `kFromDebugger`. Event's `IsFullyTrusted` walks underlying events and checks their trusted status; it does not define a human-only debugger exclusion. Current responsiveness-metrics and pointer-event-factory files likewise contained no `kFromDebugger` test in the reviewed source. Consequently, missing Event Timing entries, interaction IDs, or coalesced events are **not established** as a debugger flag escape. Entry thresholds, supported event types, timing and real device behavior need controls. The pinned155 Event Timing file did not resolve, so these additional source observations are explicitly about current main. [Event Timing source](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/timing/event_timing.cc), [Event trust source](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/dom/events/event.cc), [Responsiveness metrics](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/timing/responsiveness_metrics.cc), [Pointer event factory](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/events/pointer_event_factory.cc)
