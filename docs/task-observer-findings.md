# Bare attachment and task timing

Tested 2026-10-16 in visible Chrome `155.0.8059.80` on the local Mac. The [source review](cdp-attachment-side-effects-review.md) identifies an attachment-only change: a renderer task observer exists while a DevTools session is attached. Its idle callbacks do not require Runtime or Debugger enablement. The source pins `.40`; the installed browser reports `.80`.

## Experiment

The page times batches of 1,000 sequential MessageChannel deliveries and a synchronous loop control. The messages aim to amplify per-task work. No native task-observer counter was collected, so a delivery count is not an instrumented native-task count.

The page receives a start timestamp and records eight 750 ms periods. It does not receive the attachment schedule. The driver alternates attached and detached states in a balanced sequence, including repeated states. It reverses the sequence in the second repetition. Measurement excludes 100 ms at each boundary. Every protocol transition must finish within that margin, and every period must contain at least ten accepted batches.

Three fresh browsers run normally and three include ordinary page work before each batch. The driver sends no protocol queries during the timed periods except attachment changes. Runtime and Debugger remain disabled. Final results come from the page title after measurement.

Six further control browsers keep the target detached or attached throughout measurement, three each. Detached targets have no page-target session during measurement. Chrome still has a debugging listener and browser-level CDP connection. These are not browsers launched without debugging support.

## Results

All 12 browser trials and 96 measured periods passed their measurement checks.

| Group | State | Periods | Range of period medians, ms per batch |
| --- | --- | --- | --- |
| Alternating, ordinary page | Detached | 12 | 1.4 to 4.2 |
| Alternating, ordinary page | Attached | 12 | 1.5 to 4.4 |
| Alternating, extra page work | Detached | 12 | 1.2 to 1.8 |
| Alternating, extra page work | Attached | 12 | 1.4 to 1.9 |
| Constant-state control | Detached | 24 | 1.4 to 3.6 |
| Constant-state control | Attached | 24 | 1.5 to 3.5 |

Period medians overlap. Timing does not consistently track attachment transitions. The constant-detached controls also drift without any page attachment. A threshold based on these medians cannot separate all measured attached and detached states. The source-level extra work is real; this experiment does not establish a reliable page-side detector for it.

No blocking rule was added. This does not exclude another measurement method or a device-specific statistical classifier. It does reject treating a slowdown, a first-period change, or an internal observer as sufficient proof of CDP usage. Before-load attachment, physical-human baselines, other hardware, and production false-positive rates remain untested. No protected action is attempted in this fixture.

Run `npm run benchmark:task-observer` for the alternating test. Run `node scripts/benchmark-task-observer.mjs --sham` for the constant-state controls. See [alternating results](task-observer-results.json) and [constant-state results](task-observer-sham-results.json). These complement the [endpoint and input-coordinate tests](cdp-multiple-angle-findings.md).
