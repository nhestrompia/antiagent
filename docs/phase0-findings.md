# Phase 0 findings

Date: October 13, 2026.

## Result

The implemented experiment has not met the Phase 0 exit criterion. In three valid Chrome runs, a 0.01-opacity protected overlay left the reference canvas readable in screenshots. Native-size video and canvas composition did not change the captured reference pixels. An opaque black video covered the whole page, which also prevents human use and cannot qualify as protection.

This is negative evidence for the tested browser capture paths. The broader feasibility decision remains inconclusive because human visibility observations and several capture mechanisms are outstanding. No screenshot-resistance claim or progression to the combined SDK is justified.

## Environment and asset

- macOS Darwin 25.6.0 on Apple M5.
- Installed Chrome 154.0.8037.98, headed, with an isolated temporary profile.
- 1280×900 CSS-pixel viewport; the report records device pixel ratio and captured reference bounds.
- 16×16 black H.264 video, 1 FPS, two seconds, no audio, no clear lead.
- Encrypted MP4 size: 1,974 bytes, excluding the manifest and license exchange.
- Widevine CENC using Shaka's public development key service and UAT license proxy.
- Confirmed media keys, usable keys, and time advancement before and after every protected capture in the repeated run.

The first launch reported Widevine unavailable. Removing Playwright defaults that disable component loading and disable the sandbox allowed playback. The collaborative preview independently reported Widevine unsupported, so it was used for interface checks only.

## Evidence

The saved [capture report](evidence/phase0/report.json) contains all three repetitions. Representative captures are [baseline](evidence/phase0/baseline.png), [transparent overlay](evidence/phase0/transparent.png), and [opaque overlay](evidence/phase0/opaque.png).

| Configuration | Reference-region mean channel difference | Pixels differing by more than 8 channel levels | Observation |
| --- | --- | --- | --- |
| Native size | 0 | 0% | Reference pixels unchanged |
| Transparent viewport | 2.781 | 0% | Canvas text remains readable on inspection |
| Opaque viewport | 238.585 | 100% | Entire page covered by black video |
| Canvas composition | 0 | 0% | Reference pixels unchanged |

All three repetitions produced the same comparison values. Pixel comparisons are supporting measurements, not automated readability judgments. Playwright and direct CDP share a capture backend. Ordinary reference canvas export and pixel readback succeeded in every mode.

## Coverage and open work

| Capture path | Status |
| --- | --- |
| Headed Chrome Playwright screenshots | Captured; reference remains readable under transparent overlay |
| Direct CDP screenshots | Captured; reference remains readable under transparent overlay |
| Canvas export and pixel readback | Succeeded |
| Protected video composition | Draw succeeded; a black source cannot establish whether black output is a genuine copy |
| Native macOS screenshots | Attempted; screencapture could not create an image from the display |
| Chrome DevTools UI screenshot command | Manual test pending |
| Tab capture | Manual test pending |
| Screen recording | Manual test pending |
| Safari / FairPlay | Unavailable without compatible media and licensing |
| Contemporaneous human visibility | Pending human run |

The browser tests verify baseline readback, lack of business-action DOM controls, all mode configurations, unknown capture status, report observations, removal detection, invalid configuration, composition before frame readiness, and narrow-screen usability. They are not DRM feasibility tests. The actual capture report provides separate DRM evidence.

## Milestone decision

The Phase 0 experiment implementation is ready for manual validation and is committed before later milestone work. The research gate is unmet. Continue capture validation or reassess the architecture; do not start Phase 1 or npm release flows on these results.
