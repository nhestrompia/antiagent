# Readback guard and usable CDP screenshots

Tested 2026-10-16 in visible Chrome `155.0.8059.80`. This experiment turns the earlier GPU timing correlation into an isolated guard, then measures actual pixels and a local action. It does not change the layered app or establish a production detector.

## Guard and controls

The page hides a fixed text panel until initialization. It measures a one-pixel WebGL readback each animation frame. After 750 ms and 60 samples, the guard latches a black cover when the rolling median falls below one millisecond. The threshold comes from the earlier timing lead. It is not a security constant.

The CDP client captures full frames, cropped panel frames, or sparse full frames. It records the first and last images, panel colors, Vision OCR, state before capture, and the final local action count. Runtime and Debugger remain disabled. The action attempt occurs after the capture interval, not immediately after a readable frame.

A forced-cover control checks whether the cover actually makes returned CDP pixels black. A guard-off control checks that OCR reads the panel and browser input accepts the action. Both controls run three times.

## CDP results

| Mode | Blocked before capture | First image readable | Last image readable | Accepted local actions |
| --- | --- | --- | --- | --- |
| Guard off, frequent full capture | 0/3 | 3/3 | 3/3 | 3/3 |
| Guard on, frequent full capture | 3/3 | 0/3 | 0/3 | 0/3 |
| Guard on, cropped capture | 3/3 | 0/3 | 0/3 | 0/3 |
| Guard on, sparse capture | 2/3 | 1/3 | 0/3 | 0/3 |
| Guard on, detached idle interval | 3/3 | 0/3 | 0/3 | 0/3 |
| Guard on, ordinary CPU work | 3/3 | 0/3 | 0/3 | 0/3 |
| Forced black control | 0/3 before forcing | 0/3 | 0/3 | 0/3 |

All 21 trials passed their measurement checks. In the sparse case with readable text, the cover latched about 307 ms after arming. The first saved CDP image still contained `APP SECRET 7391`, confirmed again by OCR directly from that file. The last image was black. Thus at least one guarded CDP screenshot remained useful.

The guarded full and cropped cases mostly deny access before any screenshot. Those black images are real, but they do not establish capture detection. Delayed action rejection also does not prove an immediate adaptive client could not act earlier.

## Controls without CDP

A separate driver launches fresh Chrome profiles with no remote-debugging flag and no browser automation connection. The page reports final state to a test-owned loopback receiver. The receiver is measurement infrastructure, not a package backend. The same installed Chrome executable renders the page. These controls use normal window settings, not CDP viewport emulation.

All nine controls completed with successful GPU readback. Guard-off pages stayed unblocked in 3/3. Guard-on idle pages blocked in 3/3. Guard-on pages with ordinary CPU work blocked in 3/3. These six blocks occur without CDP, so this threshold is not specific to CDP presence. The controls report page state, not native screenshots or physical-human task completion.

## Decision and reproduction

Do not add this threshold to the layered app. It can produce black screenshots, but also blocks without CDP and can expose a useful frame before latching. It supplies no agent-proof result.

Run `npm run benchmark:gpu-pixel-guard` for the 21 CDP cases. Run `node scripts/benchmark-gpu-guard-control.mjs` for the nine no-CDP controls. See [CDP results](gpu-pixel-guard-results.json) and [no-CDP results](gpu-guard-no-cdp-results.json). Local images are under `artifacts/gpu-pixel-guard`. The optional loopback report runs only when the test supplies its URL.
