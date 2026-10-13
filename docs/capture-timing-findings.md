# Foreground screenshot timing test

Run `npm run benchmark:capture-timing` with the existing Vite origin. Open `/capture-timing.html?guard=on`.

The hypothesis was that a foreground compositor screenshot stalls or perturbs page animation enough for a page-side timing guard to clear the protected UI before capture. The lab redraws a canvas every animation frame, records frame intervals and event listeners, and optionally locks on a frame interval over 25ms. The threshold is an experimental candidate, not a security constant. The guard arms after a 250ms startup period, so this is not a claim of protection before that period.

Seventy-two fresh-page cases ran in Chrome 155.0.8059.40. Each of three operations ran 12 times with guard on and off. The operations were idle, an unchanged-viewport CDP compositor screenshot, and 45ms of ordinary synchronous UI work. The benchmark reads actual captured pixels and attempts the real local action through pointer input. It does not set an application capture flag before the screenshot.

## Results

| Guarded operation | Cases | Lock after operation | Captured black control | Completed action |
| --- | --- | --- | --- | --- |
| Idle | 12 | 0 | Not captured | 12 |
| Foreground screenshot | 12 | 0 | 0 | 12 |
| Ordinary UI work | 12 | 12 | Not captured | 0 |

There were no pre-operation locks. The maximum recorded frame interval was about 9.4ms for both screenshot and idle groups. Ordinary UI work produced gaps up to 41.7ms with the guard. Unguarded actions completed in all 36 cases. No tested resize, visibility, focus, print or invented capture-name listener fired during screenshot observation. Names such as screenshot and beforecapture are not documented browser events; registering a listener does not create a notification source.

This falsifies this timing threshold as a useful discriminator in the measured environment. Lower thresholds would need false-positive analysis against the same idle intervals and real workloads. The screenshot did not require the page to call canvas exports, mutate the DOM, change geometry, or lose a graphics context.

Pinned Chromium source shows a forced compositor commit/presentation callback and a surface copy, with no page screenshot event in the traced path. Browser callback names must not be mistaken for a DOM API. [Source investigation](foreground-capture-event-research.md)

Results: [capture-timing-results.json](capture-timing-results.json). Images remain local under `artifacts/capture-timing/`. No production module, npm publication, or new application backend was introduced. Build passed. Native screenshots, WebGL context behavior and video-frame metadata were not measured by this 2D canvas lab.
