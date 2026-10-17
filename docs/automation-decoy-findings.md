# Automation-triggered decoy page

The new gate shows a separate workspace when it detects automation. It delays the real demo module import until the initial checks pass. The decoy has its own text and working refresh button; that button cannot approve the real action. The gate also handles Playwright target/runtime events after mounting and removes the real view's input listener before showing the decoy. Initialization errors select the decoy.

## Results

Visible Chrome development trials, three per condition:

| Client | First page | Final page | Real actions |
| --- | --- | --- | ---: |
| Default Playwright | Decoy | Decoy | 0/3 |
| Marker-disabled Playwright, coordinate input | Real app | Real app | 3/3 |
| Marker-disabled Playwright, locator click | Real app | Decoy | 0/3 |
| Screenshot/input-only raw CDP | Real app | Real app | 3/3 |
| Injected late-event positive control | Real app | Decoy | 0/3 |

OCR recovered the decoy code and found no real token in the default Playwright screenshots. Request logs showed no real app module request for those sessions. Decoy refresh actions completed in all three trials. Locator clicks emitted an event the gate detected, but the real token was already readable in the earlier screenshot. This is late diversion, not prevention of that exposure. The injected-event controls test the response, not detection of an actual client.

A production-build repeat covered each condition once and matched those outcomes. It also checked the generated real app chunk request. A separate default-Playwright check showed the decoy canvas on the combined-defense page in development and production.

The existing full stack, with DRM, freshness, temporal rendering, clock checks, jitter, and the new decoy response enabled, still allowed the constrained CDP screenshot/input client to complete 3/3. Runtime and Debugger were absent. Strict agent-proof verification rejected those saved results, as expected.

Four local lifecycle tests passed. They check early marker refusal, detection during an unfinished verdict, detection during module loading, and cleanup after a late event. The initial locator pilot timed out when its target disappeared; its log remains under artifacts. The final benchmark explicitly tests that diversion.

## Use and limits

Open `/automation-decoy.html`, or add `response=decoy` to `/combined-defense.html`. The combined page changes its blocked canvas response; it does not delay its original app module. The standalone gate demonstrates delayed loading and a separate interactive decoy.

`mountAutomationDecoy` accepts a detector, an async real-app loader, a decoy mount function, and an optional state callback. Mount functions run synchronously and return cleanup functions. The caller must stop app work and remove its event handlers in cleanup. The gate latches the decoy after detection; it cannot revoke content already observed or unload an imported module. The demo's title diagnostics intentionally expose the selected mode for testing.

This is client-side routing, not authorization. Static app bundles remain retrievable directly, and a privileged client can modify the gate. Real content and actions need server authorization if withholding them is required. Ordinary human sessions and accessibility tools were not validated, so false-positive rates remain unknown.

Run `npm run benchmark:automation-decoy` and `node --test scripts/automation-decoy.test.mjs`. The fixture server uses port 5173. The browser benchmark requires the local Vision OCR helper. Raw reports, screenshots, and logs stay under `artifacts/automation-decoy`, `artifacts/automation-decoy-production`, and `artifacts/decoy-full-stack`. No new raw results are stored under docs.

The decoy response works for detected routes. It does not close the detection gap or make the app agent-proof.
