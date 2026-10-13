# Anti-Agent feasibility prototype

This is the Phase 0 research tool. It is private and has no npm release flow.

The current experiment does **not** demonstrate screenshot resistance. Widevine playback succeeds, but a nearly transparent protected video leaves the underlying canvas readable in the tested Chrome capture paths. See [the Phase 0 findings](docs/phase0-findings.md).

## Run locally

Requires Node 22.12+ or a supported newer version and installed Google Chrome.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173` in installed Chrome. The tiny asset is included. Start playback, select a configuration, and read the diagnostics. Escape reveals the page if an opaque overlay covers it.

The collaborative preview may lack Widevine even when installed Chrome supports it. An unsupported result is inconclusive.

## Test and capture

```bash
npm test
npm run build
# Keep the dev server running in another terminal.
npm run capture
npm run capture:control
```

The capture command launches headed installed Chrome, selects the encrypted colored control, runs baseline plus all four modes three times, and writes PNGs and a JSON report under `artifacts/`. It removes automation defaults that disable component loading or Chrome's sandbox. It does not change your normal Chrome profile.

`capture:control` runs both matching clear and encrypted colored assets, three repetitions each, and saves a paired summary. It measures the video region separately from the underlying reference canvas. The clear control checks that ordinary capture can reproduce the pattern. The encrypted control checks for preserved colors, opaque black replacement, or transparent output. Capture results are never inferred from a black source video.

Options:

```bash
REPETITIONS=1 npm run capture
ASSET=clear-control npm run capture
ASSET=tiny npm run capture
TAB_CAPTURE=1 npm run capture:control
HUMAN_REVIEW=1 npm run capture
NATIVE_CAPTURE=1 npm run capture
HEADLESS=1 npm run capture
ROBUSTNESS=HW_SECURE_ALL REPETITIONS=1 npm run capture
KEEP_OPEN=1 REPETITIONS=1 npm run capture
```

`HUMAN_REVIEW=1` asks whether you can read the live scene before each capture. `NATIVE_CAPTURE=1` attempts whole-display macOS screenshots and requires operating-system permission; verify that the experiment window was actually visible. Headless runs cannot establish human visibility. `EXPERIMENT_URL` overrides the page URL.

`ROBUSTNESS` selects an exact security requirement with no software fallback. The page also has a security-level probe and reports the requested and selected robustness separately. `KEEP_OPEN=1` leaves the isolated test instance open after capture for inspection; close that instance to finish the command. It does not reuse your normal browser profile.

`TAB_CAPTURE=1` adds real getDisplayMedia capture of the experiment browser tab, a one-second WebM recording, and inspection of the recording's first decoded frame. It uses Chromium's test picker flags to select only the isolated experiment tab, verifies the returned displaySurface is browser, and never uses fake camera/screen content. FFmpeg is required to decode recording evidence; otherwise the recording is retained with a review error. Whole-display recording remains a separate manual test. The test adapter records failure stages and skips dependent capture attempts after an unavailable baseline.

Tab-capture frame heights can change as Chrome's sharing UI opens. Comparisons use the entire reference region only when it fits both frames and their widths agree; differing frame heights alone do not imply lost content.

Playwright and direct CDP screenshots share Chrome's capture backend. Their agreement is not evidence from two independent mechanisms. Pixel comparisons help locate changes; they do not decide whether content is readable.

Reports exclude license headers. Custom license URLs and manifest URLs may still appear in browser screenshots and network evidence. Use development credentials.

## Development media

The included asset is a black 16×16 H.264 video, two frames over two seconds, without audio or a clear lead. It uses Widevine CENC and the public development key service documented by [Shaka Packager](https://shaka-project.github.io/shaka-packager/html/tutorials/widevine.html). The license endpoint is `https://proxy.uat.widevine.com/proxy`. No custom headers are needed in the tested configuration.

The asset is served locally for the experiment. Static HTTPS hosting and reuse across deployments have not been validated. The development key service is not production licensing infrastructure.

To regenerate, install FFmpeg and download the matching official [Shaka Packager 3.9.3 release](https://github.com/shaka-project/shaka-packager/releases/tag/v3.9.3), then run:

```bash
PACKAGER=/absolute/path/to/packager node scripts/generate-asset.mjs
ASSET_KIND=control PACKAGER=/absolute/path/to/packager node scripts/generate-asset.mjs
```

The script uses the tutorial's public test credentials, generates a solid-color source locally, encrypts it with no clear lead, and records asset metadata. It never requires private Widevine credentials.

The colored control is 64×64 with red, green, blue, and yellow quadrants. Its encrypted MP4 is 2,100 bytes, excluding manifest and licensing traffic. An identical unencrypted source is included. Both are silent, two-second, 1 FPS sequences. Pixel classification samples the four centers, records RGBA measurements, and tolerates observed color deviations in the clear decoder/display path. Native-size and opaque video are measured at full opacity; nearly transparent video is marked unsuitable for color classification rather than misclassified as missing.

Sintel is included as an alternative playback baseline using [Shaka's documented test setup](https://shaka-project.github.io/shaka-player/docs/api/tutorial-license-server-auth.html). Its encrypted playback start is set to 12 seconds to skip the clear lead. It is not the tiny asset.

### Native positive control without browser capture

```bash
npm run capture:native-control
# Or use the documented movie sample:
ASSET=sintel npm run capture:native-control
```

This opens installed Chrome in an explicit temporary profile with minimal launch flags. It plays opaque protected video without requesting a browser screenshot or tab stream. Chromium can change its macOS overlay path during capture, so observe native capture before running the other adapters. See [capture-path research](docs/chrome-capture-path-research.md).

The terminal accepts `native`, `opaque`, `transparent`, `baseline`, `status`, and `stop`. Each mode saves playback, decoder, and GPU diagnostics under `artifacts/`. Use a native screenshot or computer-use observation and confirm that a human sees the live video. Saved playback diagnostics do not prove capture suppression. `stop` closes only this test browser and removes its temporary profile.

## Manual capture protocol

1. Use installed Chrome on macOS. Record OS version, Chrome version, hardware, viewport, and device pixel ratio.
2. Capture the baseline with no video. Confirm `ALPHA-729`, the account, amount, and button text are readable.
3. Start protected playback. Wait for Widevine, usable keys, advancing media, and the “Protected playback observed” status.
4. Run native-size, transparent viewport at 0.01 opacity, opaque viewport, and composition configurations. For each, record whether you can read the live reference scene immediately before capture.
5. Capture through macOS screenshots and Chrome DevTools' screenshot command. Save each artifact with its configuration, timestamp, and exported report. An opaque overlay hiding content from both you and the capture is not success.
6. Use “Record tab / screen,” choose the experiment tab or display in the browser picker, record your observation, and finish recording. Repeat for tab capture and whole-display recording, labeling the selected source. Keep recordings next to the JSON report.
7. Attempt video composition and canvas pixel readback. Compare matching clear and encrypted colored controls. The black source cannot distinguish a real copy from black substituted pixels. Record video-copy output separately from the original reference canvas.
8. Pause or remove the video and confirm diagnostics reflect interruption or removal. These checks are bypassable and are not server-trusted enforcement.
9. Run Safari only with compatible FairPlay media and licensing. Neither is provided here; mark Safari unavailable rather than treating it as Chrome-equivalent.
10. Inspect captured reference regions for readability. A pass requires unreadable underlying content while a human can still read the live scene, repeated with valid protected playback. Preserve all artifacts, including failures.

## Limits and next milestone

The reference canvas is a fixed diagnostic scene, not a canvas UI framework. Its drawn controls are not business-action DOM elements, but privileged JavaScript can read its pixels. Accessibility support for a real canvas interface still requires design and validation.

The playback runtime monitors support, usable keys, time advancement, interruption, and element removal. It does not attempt automatic recovery or assert tamper-proof enforcement. Capture protection remains unknown in runtime state. Recovery policy, CPU measurements, layout-shift measurements, cache behavior across deployments, and the remaining manual capture paths are still unvalidated.

The current research build includes Shaka Player and is about 832 KB of JavaScript, or 275 KB gzipped. This is not a validated lightweight SDK size.

Phase 1 and package integration remain gated on Phase 0 evidence or an independently tested replacement mechanism. Each implementation milestone must be verified and committed before the next begins.
