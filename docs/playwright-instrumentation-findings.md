# Playwright instrumentation follow-up

Tested 2026-10-16 with visible Chrome 155.0.8059.80 and Playwright 1.64.0. These checks detect optional instrumentation. They do not prove that a human or agent controls a browser.

## Passive additions

The detector now checks the own property `__pwClock` and own property names beginning with `__playwright_snapshot_streamer_`. It reads property descriptors and names without invoking getters. Both checks feed the existing early module gate and late decoy response.

Playwright installs the clock script through its clock API. Snapshot recording creates a randomly suffixed streamer in the page. The installed bundle audit requires the corresponding source anchors and records its hash. Sources: [clock implementation](https://github.com/microsoft/playwright/blob/v1.64.0/packages/playwright-core/src/server/clock.ts), [snapshotter implementation](https://github.com/microsoft/playwright/blob/v1.64.0/packages/playwright-core/src/server/trace/recorder/snapshotter.ts).

| Visible Chrome route | Trials | Result |
|---|---:|---|
| Marker disabled, snapshot tracing enabled | 3 | Decoy; real application module never requested |
| Marker disabled, clock installed | 3 | Decoy; real application module never requested |
| Marker disabled, screenshot-only tracing | 3 | Real token readable; real action accepted |
| Raw CDP screenshot and input, no Runtime/Debugger | 3 | Real token readable; real action accepted |

A production build repeated each route once with matching results. Evidence is under `artifacts/playwright-instrumentation-production/`.

The benchmark also checks stock Playwright against the combined defense. Raw results, screenshots and trace archives are under `artifacts/playwright-instrumentation/`. An initial run timed out taking its first screenshot. A retry and the complete three-repetition run passed without changing the screenshot assertion. The timeout is not counted as detection.

## Active root probe

Playwright helper scripts listen for reinsertion of the current document root. Their mutation observers dispatch named global-listener check events. A controlled page removed and reattached the same root, then recorded these events. Sources: [injected script](https://github.com/microsoft/playwright/blob/v1.64.0/packages/injected/src/injectedScript.ts), [snapshotter injected script](https://github.com/microsoft/playwright/blob/v1.64.0/packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts).

In 21 trials, locator reads, accessibility reads and snapshot tracing each triggered their check event in 3/3 cases. Coordinate input, an earlier screenshot, screenshot-only tracing and raw CDP each remained usable in 3/3 cases. Reads could recover the token before the probe: later black screenshots do not undo extraction.

The first pilot used `waitForFunction`, which itself installed the helper under investigation. It also blocked target events before testing the root challenge. The final run uses title polling and records target events without blocking them. Both pilot and final evidence remain under `artifacts/playwright-root-probe/`.

Six ordinary Chrome controls had no remote debugging flag or automation connection. The three root-move controls lost input focus and ran custom-element disconnect/reconnect callbacks. The three unchanged controls retained focus and did not disconnect. None emitted a Playwright check event. These are page-reported measurements, not a manual usability study. Evidence: `artifacts/root-probe-control/`.

The root probe remains a separate experiment. Its focus and component lifecycle effects make it unsuitable as a default protection.

## Remaining gap

The combined DRM, layered detection, freshness, decoy, clock, jitter and aligned-frame defenses were retested after this change. Bare CDP completed the task in 3/3 trials, without triggering a block. Evidence: `artifacts/decoy-full-stack/results.json`.

Neither passive marker is required for screenshot/input operation. A client can omit tracing and clock emulation; names can also change across versions or be patched. The tests preserve these negative controls rather than treating absence of a marker as proof of a human.

The native autofill attachment branch is covered separately in [the startup source review](playwright-startup-followup.md). No public attachment signal was established there.
