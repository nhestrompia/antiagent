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

## Follow-up computer-use and security-level tests

The user independently reported that captures still show the canvas. Computer use reproduced unsupported Widevine in the collaborative browser. Native actions were refused during user activity. Native control could not bind the separate test instance and instead resolved the user's normal Chrome window, so native testing was stopped. Collaborative snapshot capture also failed during this follow-up. These are tool limitations, not capture resistance.

Separate headed Chrome instances with temporary profiles tested the same page successfully. Explicit capability probes for the included H.264 CENC asset returned:

| Security requirement | Available |
| --- | --- |
| SW_SECURE_CRYPTO | Yes |
| SW_SECURE_DECODE | Yes |
| HW_SECURE_CRYPTO | No |
| HW_SECURE_DECODE | No |
| HW_SECURE_ALL | No |

Software playback selected `SW_SECURE_DECODE`, had usable keys and advancing video, and left the reference canvas readable. Its transparent capture comparison again had a mean channel difference of 2.781 and no pixels differing by more than 8 levels. The [software robustness evidence](evidence/phase0-followup/software-robustness.json) and [hardware requirement evidence](evidence/phase0-followup/hardware-robustness.json) preserve the capability results.

The page now rejects unsupported security requirements before media loading, reports the requested and selected level, and never silently substitutes a software level. See [the hardware run](evidence/phase0-followup/hardware-report.json). This implements the robustness configuration described by [Shaka Player](https://shaka-project.github.io/shaka-player/docs/api/tutorial-drm-config.html). Robustness specifies decryption and decoding requirements; it does not establish screenshot protection for unrelated canvas pixels. See [the EME capability definition](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemmediacapability-robustness).

A separate reproducible defect was fixed: Stop previously refused to cancel an initializing media load. A browser regression test first failed with the status stuck at initializing, then passed after cancellation was wired through the runtime. Baseline selection and Escape use the same cancellation path. Eight browser tests now pass.

The overlay hypothesis still has no successful capture path. This follow-up is a Phase 0 correction and investigation, not progression to Phase 1.
