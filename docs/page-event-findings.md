# Page event tests for Chromium capture

Foreground same-viewport capture did not produce a required notification in these tests. Plain capture without device emulation and cropped capture also left the recorded event and geometry logs empty. Native-viewport target-session detach/reattach did the same in three trials.

| Condition | Valid trials | Recorded change |
| --- | ---: | --- |
| Idle | 3 | None |
| Same-viewport screenshots | 5 | None |
| Plain screenshots without device emulation | 3 | None |
| Cropped screenshots | 3 | None |
| Beyond-viewport screenshots | 3 | Window and visual viewport resize events |
| Real resize positive control | 3 | Resize events, ResizeObserver, geometry |
| Native viewport detach/reattach | 3 | None |
| Emulated viewport detach/reattach | 3 | Resize events, ResizeObserver, native geometry restored |

The original 18-case run had one initialization timeout and 17 valid trials. That timeout is inconclusive, not evidence of resistance. A separate three-trial same-viewport repeat passed. Its setup repeats Page.bringToFront during initialization. Logs retain the original failure and the repeat separately.

All valid capture and control trials recovered the token from the first and last evidence images and accepted the button action. Beyond-viewport capture emitted 126 to 128 window resize events per measurement, with matching visual viewport events. The animation-frame geometry samples did not catch those transient changes. Event listeners can therefore reveal some capture options even when geometry polling misses them. A client can select the demonstrated event-free capture route instead.

Detachment restored native dimensions only when the client had first set a device-metrics override. The source teardown calls EmulationHandler::Disable to restore that optional state. The native-viewport comparison had no such change. These results do not supply a general attachment event or an agent-proof guard.

The test page installs event listeners before capture begins. It records window resize, scroll, focus, print, page lifecycle, and orientation events; document visibility, freeze, resume, fullscreen, pointer lock, and selection events; and visual viewport resize and scroll events. ResizeObserver, MutationObserver, IntersectionObserver that checks visibility, and paint, largest-contentful-paint, and layout-shift performance observers record their callbacks. Animation frames sample viewport, screen, visibility, and focus changes.

The test compares idle, full viewport, plain full viewport without device emulation, cropped, and beyond-viewport captures. A real device-metric resize is a positive control. All observers receive a 750 ms warmup before recording, and measurement starts only when the page has focus and is visible. These tests seek event and geometry changes; they do not compare scheduling overhead or prove that every possible browser API was covered.

The attach-cycle test detaches the target session 500 ms after the fixture is ready, then reattaches after another 500 ms. Browser-level target control remains connected. This tests a target-session reconnection while the page is listening, not the start of Chrome's debugging transport.

Each trial must recover SIGNAL TOKEN 4826 with Vision OCR from its first and last images and complete a button action through CDP input. Runtime and Debugger commands are absent. Idle and resize-control trials take their evidence images after measurement; screenshots during the other capture trials are timestamped in the results.

The temporary local receiver only collects evidence from the test page. It is test infrastructure, not a proposed package server. The page does not black out pixels in this test: a missing event must be recorded directly before it can justify any guard.

Source conditions are in cdp-page-event-source-review.md. The audit script records source sections from Chrome 155.0.8059.80 in page-capture-event-source-audit.json. Run python3 scripts/audit-page-capture-events.py to refresh it. Run npm run benchmark:page-events with Vite on port 5173 and the local Vision OCR helper installed. Add -- --attach for the native target-session test, -- --attach-emulated for its emulated control, or -- --retry for the same-viewport repeat.
