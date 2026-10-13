# Chromium-derived capture signals

Run `npm run benchmark:capture-signals` with Vite on localhost:5173. Open `/capture-signals.html?guard=on`.

The Chromium source investigation identified temporary layout changes in some full-page captures. This lab forces a 24px scrollbar and a tall document, records events and geometry, and optionally locks when the document width changes. It does not depend on navigator.webdriver or injected-script signatures.

Thirty-six fresh-page cases ran in Chrome 155.0.8059.40: six methods, guard on/off and three repetitions. Full-page Playwright and CDP captures changed clientWidth from 976 to 1000. Resize and visualViewport resize events appeared. With the guard, both full-page methods produced black pixels in the actual captured control region and completed zero actions in all three repetitions. Matching unguarded captures retained the green control and allowed the action.

Viewport Playwright and CDP captures produced no recorded lifecycle or geometry changes in any repetition. Their images retained the green control and subsequent coordinate clicks completed the action, including with the guard enabled. This is a tested bypass requiring no page tampering.

The resize control also locked all three guarded sessions. An ordinary user changing window size can therefore trigger the same gate. The signal is conditional on the measured layout and capture options. Do not ship this as a universal screenshot notification, or as a production gate with validated human usability.

CDP-derived pointer/click events were trusted and activated userActivation. Public fromDebugger property lookup was absent and getModifierState('FromDebugger') returned false. We recorded ordinary pointer pressure and sourceCapabilities fields without claiming they distinguish a human. The internal Chromium debugger marker is documented separately in [source research](chromium-capture-trigger-research.md).

Results include physical-pixel sampling with the correct full-page/viewport capture scale: [capture-signals-results.json](capture-signals-results.json). Images remain local under `artifacts/capture-signals/`. Build passed. Native screenshots and tab sharing are not validated by this new lab.
