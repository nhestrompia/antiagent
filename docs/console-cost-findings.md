# Console calls with bare CDP attachment

Tested 2026-10-16 in visible Chrome `155.0.8059.80`. The [source review](cdp-console-retention-review.md) found per-session work in console message insertion even when Runtime and Console reporting are disabled. It did not find an attachment-only object-retention bit. Logging already retains arguments while detached.

## Test

The existing attachment probe now has an isolated console mode. Each measured batch calls `console.log(0)` 1,000 times, then clears the console. A separate synchronous loop supplies a control. The historical `tasks` result field stores console-batch duration in this mode. The page sends no remote protocol commands itself.

The driver runs balanced attached/detached periods on one page, three times with and without extra ordinary page work. It also runs three fresh pages with no target attachment during measurement and three that stay attached. A browser-level debugging connection remains active in all cases. No Runtime, Debugger, or Console domain is enabled.

Each page records eight 750 ms periods. Logging pauses during the excluded 100 ms margins around transitions. Between active batches, the page yields through a message task. Every accepted period must have at least ten batches, no hidden samples, and no unfocused samples. Protocol transitions must finish within the excluded margin. The page receives the timing schedule but not the attachment-state sequence.

## Results

All 12 final browser trials and 96 periods passed the checks. Alternating periods contained at least 89 batches each. Constant-state periods contained at least 183 each.

| Group | State | Periods | Range of period medians, ms per 1,000 calls |
| --- | --- | --- | --- |
| Alternating, ordinary page | Detached | 12 | 2.3 to 2.5 |
| Alternating, ordinary page | Attached | 12 | 2.4 to 2.5 |
| Alternating, extra page work | Detached | 12 | 2.3 to 2.4 |
| Alternating, extra page work | Attached | 12 | 2.3 to 2.5 |
| Constant-state control | Detached | 24 | 2.3 to 2.4 |
| Constant-state control | Attached | 24 | 2.3 to 2.4 |

The period medians overlap, including the never-target-attached controls. This measurement supplies no reliable attachment threshold. The source-level iteration does not establish a usable detector on this browser. No console guard was added to the main app, and these timing results establish no screenshot-redaction claim.

The source review pins Chrome `.40` and its V8 revision. The installed browser reports `.80`. Native per-call instrumentation, other devices, and human false-positive rates remain untested. These are bounded measurements, not proof that every console-related detector is impossible.

## Preserved pilots

The timer-based pilot left several periods with too few samples. A second pilot yielded through message tasks but sometimes completed attachment changes outside the excluded margin. Both remain separately named JSON artifacts. Neither counts as prevention or a valid comparison for every period. The final probe pauses logging around transitions and records visibility and focus.

Run `npm run benchmark:console-cost` and `npm run benchmark:console-cost-sham`. See [alternating results](console-cost-results.json) and [constant-state results](console-cost-sham-results.json). The separate [pixel guard experiment](gpu-pixel-guard-findings.md) tests actual returned CDP images and local actions.
