# Capture bursts and renderer timing

This test asks whether repeated capture disturbs the current layered renderer enough to identify it. The earlier timing fixture tested single screenshots. This experiment uses fresh visible Chrome sessions and the actual decoy, jitter, clock-check, and freshness configuration.

The opt-in `timing=on` diagnostic records animation-frame intervals. Trusted key input starts and ends a three-second measurement. The client reads the summary from a screenshot after measurement ends. It enables neither Runtime nor Debugger. The diagnostic reports measurements only. It does not install a blocking threshold.

## Results

Each mode ran three times. The screenshot mode continuously captured the choices. The screencast mode acknowledged frames from a full-page stream. Idle supplied the same keyboard input but captured no frames during measurement.

| Mode | Captured frames per trial | Median interval | P95 interval | Maximum interval | Intervals above 25 ms |
| --- | --- | --- | --- | --- | --- |
| Idle | 0 | 16.7 ms | 16.7 to 16.8 ms | 16.8 to 33.3 ms | 0, 0, 1 |
| Screenshots | 60 to 61 | 16.7 ms | 16.7 ms | 16.8 ms | 0, 0, 0 |
| Screencast | 179 to 180 | 16.7 ms | 16.7 to 16.8 ms | 16.8 ms | 0, 0, 0 |

The captured groups did not produce the candidate signal. One idle session did. A threshold above 25 ms would therefore reject an idle session and allow every measured capture session. This is not a useful detection rule on the tested machine.

See [the recorded metrics and OCR](capture-burst-results.json). Run `npm run benchmark:capture-burst` to repeat the measurement. Screenshots remain local under `artifacts/capture-burst`.

## Limits

These nine sessions do not cover all hardware or workloads. The result rejects this threshold and measurement method, not every possible timing signal. Capture rates alone do not establish useful task reconstruction. The separate adaptive readers establish that screenshots remain useful. The next countertest is reconstruction from the screencast stream.

No blocking rule was added. Application behavior is unchanged unless the diagnostic query parameter is enabled. Human usability remains unvalidated for the existing experimental renderer.
