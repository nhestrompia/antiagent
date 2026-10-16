# Performance observers during compositor capture

Nine fresh installed Chrome trials compared idle observation, ten compositor screenshots, and a normal page timer performing 90 milliseconds of work. The page and viewport remained fixed. All available PerformanceObserver entry types registered successfully. The runner also listened for visibility, freeze/resume, print, resize, focus, and page lifecycle events.

| Operation | Performance entries | Lifecycle events | Accepted coordinate actions |
| --- | --- | --- | --- |
| Idle, 3 trials | None in all three | None in all three | 3/3 |
| Ten screenshots per trial, 3 trials | None in all three | None in all three | 3/3 |
| Page timer workload, 3 trials | Long-task and long-animation-frame entries in all three | None in all three | 3/3 |

The positive controls reported long tasks of 90 milliseconds and animation-frame durations between 90 and 90.2 milliseconds. They validate observer operation. The first saved screenshot from each capture trial contained the recognizable teal reference region. Visual inspection of the first confirmed the Confirm transfer label remained readable. See [results](compositor-observer-results.json) for entry types, measurement durations, events, pixels, and browser version.

The initial positive control ran work directly through debugger evaluation and produced no long-task entry. That invalidated the control, not the API. The final comparison schedules the work through a page timer. Initial records remain in [pilot results](compositor-observer-pilot-results.json).

This rejects an entry-based detector for the tested short foreground capture series. It does not exhaust all performance APIs, hardware conditions, longer captures, or every rendering workload. Event Timing uses a 16-millisecond threshold. No capture-specific event or guard was established.

Run npm run dev, then node scripts/benchmark-compositor-observers.mjs. The existing /capture-policy.html fixture supplies the canvas and action counter. Images are under artifacts/compositor-observers/. [Source research](compositor-observation-boundary-research.md) distinguishes browser callbacks from document observations.
