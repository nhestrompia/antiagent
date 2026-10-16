# Capture bursts and renderer timing

This test asks whether repeated capture disturbs the current layered renderer enough to identify it. The earlier timing fixture tested single screenshots. This experiment uses fresh visible Chrome sessions and the actual decoy, jitter, clock-check, and freshness configuration.

The opt-in `timing=on` diagnostic records animation-frame intervals. Trusted key input starts and ends a three-second measurement. The client reads the summary from a screenshot after measurement ends. It enables neither Runtime nor Debugger. The diagnostic reports measurements only. It does not install a blocking threshold.

## Results

Each mode ran three times. The screenshot mode continuously captured the choices. The screencast mode acknowledged frames from a full-page stream. Idle supplied the same keyboard input but captured no frames during measurement.

| Mode | Captured frames per trial | Median interval | P95 interval | Maximum interval | Intervals above 25 ms |
| --- | --- | --- | --- | --- | --- |
| Idle | 0 | 8.3 ms | 9.1 to 9.2 ms | 9.3 to 9.4 ms | 0, 0, 0 |
| Screenshots | 95 to 109 | 8.3 ms | 9.1 ms | 9.3 to 9.4 ms | 0, 0, 0 |
| Screencast | 288 to 291 | 8.3 ms | 9.0 to 9.2 ms | 9.3 to 9.4 ms | 0, 0, 0 |

No group produced the candidate signal. A threshold above 25 ms would allow every measured capture session. The observed timing distributions overlap. This is not a useful detection rule on the tested machine.

See [the recorded metrics and OCR](capture-burst-results.json). Run `npm run benchmark:capture-burst` to repeat the measurement. Screenshots remain local under `artifacts/capture-burst`.

## Limits

The earlier driver inherited the launcher's headless default. It also failed to verify whether the renderer remained unblocked. All nine earlier sessions had `browser-detector` blocks, so their 16.7 ms timing measurements did not represent the active layered renderer. Those invalid measurements remain in `capture-burst-headless-pilot-results.json`. They do not support the current result.

The corrected driver explicitly launches visible Chrome. It requires every metric, verified DRM playback, allowed detectors, readiness, and an unblocked app in the recorded summary. All nine current sessions passed those checks.

These nine sessions do not cover all hardware or workloads. The result rejects this threshold and measurement method, not every possible timing signal. Capture rates alone do not establish useful task reconstruction. The separate adaptive readers establish that screenshots remain useful. The next countertest is reconstruction from the screencast stream.

No blocking rule was added. Application behavior is unchanged unless the diagnostic query parameter is enabled. Human usability remains unvalidated for the existing experimental renderer.
