# Colored DRM control experiment

Date: October 13, 2026. This is a Phase 0 experiment, not package release validation.

## Result

Three paired repetitions distinguish a real DRM copy restriction from browser screenshot behavior. The encrypted color pattern remains visible in both Playwright and direct CDP screenshots. Copying that same video into an ordinary canvas produces opaque black output. The matching clear video preserves its color pattern in both operations.

The underlying reference canvas remains readable under the near-transparent encrypted overlay. Capture protection of the underlying interface has not been demonstrated. No Phase 1 or npm release work is justified by these results.

## Controls and environment

- A matching clear and Widevine-encrypted H.264 sequence with red, green, blue, and yellow quadrants.
- 64×64 pixels, 1 FPS, two seconds, no audio and no clear lead. Encrypted MP4 size is 2,100 bytes.
- The same documented public development key service and UAT license proxy as the original asset.
- Headed installed Chrome 154.0.8037.98 on macOS Darwin 25.6.0, Apple M5, isolated temporary profiles, 1280×900 CSS-pixel viewport.
- Requested and selected security level: SW_SECURE_DECODE.
- All encrypted protected captures had usable keys and advancing playback before and after capture. All clear captures had advancing playback without reporting DRM protection.

## Observations

| Operation | Clear colored control | Encrypted colored control |
| --- | --- | --- |
| Native-size Playwright screenshot | Four colors visible | Four colors visible |
| Native-size direct CDP screenshot | Four colors visible | Four colors visible |
| Native-size browser-tab capture | Four colors visible | Four colors visible |
| Decoded first frame of tab recording | Four colors visible | Four colors visible |
| Opaque viewport screenshot | Four colors visible | Four colors visible |
| Video copied into canvas | Four colors preserved | Opaque black pixels |
| Reference canvas export | Readable | Readable |
| Transparent overlay screenshot | Reference readable | Reference readable |

All three repetitions agree. For encrypted video-copy output, the checksum equals 64×64×255, and sampled alpha is 255 with black RGB. This distinguishes opaque black replacement from a transparent or uninitialized canvas. The clear copy retains the four colors.

The transparent encrypted overlay changes the reference region by about 1.610 mean RGB channel levels. Inspection still reads the account, amount, action label, and ALPHA-729 token. This measurement is a comparison aid, not an automated readability verdict.

Playwright and CDP use the same Chrome capture backend. Their agreement is not independent OS-level evidence. A separate three-repetition paired suite captured real getDisplayMedia browser-tab streams, recorded one-second WebM clips, and decoded recording frames with FFmpeg. Both controls retain their colored video pixels in tab captures and recording frames, and the transparent encrypted overlay leaves the reference text readable. All protected media captures retained valid playback before and after capture.

Native macOS screenshots were retried and again failed with “could not create image from display.” Whole-display screen recording, Chrome DevTools UI capture, Safari/FairPlay, and contemporaneous human live-display observations remain unvalidated.

## Evidence

The [paired summary](evidence/colored-control/summary.json) links to all clear and encrypted reports and artifacts. Each screenshot includes a separate video-region measurement and reference-canvas comparison. [Clear native capture](evidence/colored-control/clear/1-native-cdp.png), [encrypted native capture](evidence/colored-control/encrypted/1-native-cdp.png), [clear video copy](evidence/colored-control/clear/1-composition-copied-video.png), and [encrypted video copy](evidence/colored-control/encrypted/1-composition-copied-video.png) show the distinction. The [native capture attempt report](evidence/colored-control/native-attempt-report.json) records the unavailable OS path.

The [tab capture and recording suite](evidence/colored-control/tab-capture/summary.json) preserves the stream settings, capture-time viewport and region bounds, before/after media status, PNG frames, and WebM recordings. Representative evidence includes an [encrypted tab capture](evidence/colored-control/tab-capture/encrypted/1-native-tab.png), [encrypted recording frame](evidence/colored-control/tab-capture/encrypted/1-native-recording-frame.png), and [transparent-overlay recording](evidence/colored-control/tab-capture/encrypted/1-transparent-tab-recording.webm).

The classifier samples flat quadrant centers, away from edges. A tolerance of 80 RGB levels covers the observed clear screenshot conversion, including a green sample with red near 63. Black is recognized separately at no more than 20 RGB levels and near-opaque alpha. Transparent output has its own result. All raw samples and thresholds are saved. A video at 0.01 opacity is explicitly not eligible for color classification because underlying pixels dominate its appearance.

The tab adapter subscribes to requestVideoFrameCallback before starting playback. Subscribing afterward missed the static baseline's only frame and produced a false timeout; a real browser regression test now covers that timing. Browser sharing UI also changes captured frame height. Region comparisons accept different heights only if the whole reference region is present in both frames and the capture widths agree. Compression and stream conversion create small comparison differences, so readability is checked on the saved images rather than inferred from those numbers.

## Interpretation

The nonblack control fixes the ambiguity of the original black asset. It establishes that this browser path can restrict video copying without omitting the same video from browser screenshots. That is narrower than Netflix-like capture suppression and does not protect separate canvas pixels.

Any future apparent blackout must be paired with valid playback, matching clear capture, and human confirmation of visible live colored frames. Runtime captureProtectionVerified remains unknown. To test a different protected output path, provision valid media and licensing for that path and run the same paired protocol; do not infer success from encrypted playback alone.
