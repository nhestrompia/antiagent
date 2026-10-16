# Chrome native capture investigation

Researched 2026-10-13 against current Chromium main. These are implementation hypotheses to test against the installed official Chrome build, not claims that capture resistance is already working.

## A reproducible positive control

Shaka's official license-authentication tutorial supplies a recognizable encrypted Sintel movie and an unauthenticated development license endpoint:

- Manifest: `https://storage.googleapis.com/shaka-demo-assets/sintel-widevine/dash.mpd`
- Widevine license: `https://cwip-shaka-proxy.appspot.com/no_auth`
- Key system: `com.widevine.alpha`

The tutorial explicitly requires Chrome and HTTPS or localhost. Its examples are public testing material; endpoint availability and native capture suppression still need live verification. The official demo also labels Sintel as Widevine-protected. Use the non-ad rendition and wait until movie frames are visible so a clear ad or clear lead does not invalidate the test. [Shaka tutorial](https://shaka-project.github.io/shaka-player/docs/api/tutorial-license-server-auth.html), [official demo](https://shaka-project.github.io/shaka-player/demo/)

## Why native capture and CDP can disagree

Chromium's Mac overlay processor normally transfers draw quads to Core Animation overlay candidates instead of drawing the root render pass. On failure it tries forced protected-video underlays and includes the primary plane separately. OS capture consequently observes a native layer composition, rather than necessarily the browser's rendered copy-output bitmap. [Mac overlay processor](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/overlay_processor_mac.cc)

In the CA overlay processor, ordinary CA rendering is disabled when video capture is enabled or the render pass has copy requests. A video texture must be an overlay-candidate resource; its protection type is copied only when marked as a video frame. The fallback forces non-clear protected video into separate underlays, despite its narrower "hardware" comment. Opacity and transformations are retained; fully transparent quads are skipped. Nonstandard blend modes, unsupported clipping/masks, backdrop filters, and layer limits can reject the ordinary path. [CA overlay processor](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/ca_layer_overlay.cc)

When a protected IOSurface reaches the native Mac layer tree with AV layers enabled, non-clear protection selects AVSampleBufferDisplayLayer and prevents downgrade. Chromium sets its `preventsCapture` property for non-clear protection and separately sets opacity. Its debug overlay borders identify an 8-bit AV layer as yellow and an ordinary 8-bit AV-capable CALayer as green. This supplies a practical way to inspect whether the expected layer is present, without assuming hardware-secured decryption is necessary. [Mac layer tree](https://raw.githubusercontent.com/chromium/chromium/main/ui/accelerated_widget_mac/ca_renderer_layer_tree.mm)

Apple describes `preventsCapture` as a layer-level protection property. Native capture respecting that layer may therefore omit movie pixels even when an internal browser capture follows another rendering route. This does not automatically exclude sibling canvas/page layers. The exact treatment of a protected translucent layer in each OS capture API remains a measurement question. [Apple preventsCapture](https://developer.apple.com/documentation/avfoundation/avsamplebufferdisplaylayer/preventscapture)

## Metadata is a separate prerequisite

An EME session and successful decryption do not themselves prove a compositor texture reaches a protected native layer. Chromium's CDM adapter marks decrypted video frames with `protected_video` when the source is encrypted. The decrypting decoder forwards CDM-produced frames, merging color/HDR metadata. The remaining resource/overlay path still needs validation in the installed build. [CDM adapter](https://raw.githubusercontent.com/chromium/chromium/main/media/cdm/cdm_adapter.cc), [decrypting decoder](https://raw.githubusercontent.com/chromium/chromium/main/media/filters/decrypting_video_decoder.cc)

## Live observations on this Mac

Native computer use observed the user's HBO Max window with a black movie area and visible subtitles, controls, and Chrome. The user independently confirmed that only the video rectangle disappears in macOS screenshots. These observations establish the scope of the reported behavior, not HBO's private implementation or the state of our asset.

The new `capture:native-control` runner launched Chrome 154 in an explicit temporary profile without Playwright's normal browser flags, browser screenshots, or tab capture. The encrypted colored asset reached usable keys and advancing playback with `SW_SECURE_DECODE`. GPU diagnostics reported enabled compositing and video decode. Media diagnostics identified `DecryptingVideoDecoder`, CENC H.264 baseline, and a non-platform decoder. Native computer use selected the user's other Chrome process rather than the isolated test window. The runner remains a separate experiment from the existing browser capture suite.

To obtain a native observation, computer use opened a separate local experiment tab in the ordinary Chrome process. The encrypted colored asset reached usable keys, advancing playback, and 64×64 decoded dimensions with `SW_SECURE_DECODE`. Switching to opaque viewport mode produced a dark full-content rectangle in native computer-use capture. Chrome and the sidebar stayed visible. This differs from the colored pixels in prior CDP screenshots.

The user reported that the encrypted opaque video was dark live too. **This disqualifies the observation as a successful human-visible, agent-hidden positive control.** Active capture/output restrictions may explain it, but the observation alone does not establish that cause. Playback events, usable keys, and advancing time did not prove that a human saw decoded colors.

Native computer use then tested the transparent encrypted overlay at 0.01 opacity. Playback remained encrypted with usable keys and advancing time. The captured canvas was readable, including account NORTH-47, amount 125.00 EUR, recipient Harbor Research, and token ALPHA-729. The overlay therefore failed the PRD's underlying-content criterion on this native path too.

Finally, computer use restarted with the matching unencrypted asset and opaque viewport mode. Playback diagnostics confirmed `encrypted: false`, 64×64 dimensions, and advancing time. Native capture showed red, green, blue, and yellow quadrants. This rules out a general inability of the capture adapter to show video colors, but does not identify why the encrypted live view was dark. The ordinary test tab was stopped and returned to baseline afterward.

These are direct tool observations and the user's live-display report. Native image outputs remain in the session transcript, not saved image artifacts in the repository. This run did not validate native macOS keyboard screenshots or OS screen recording of our sample. Do not generalize it to those capture methods.

## Ordered experiments

1. Use official Chrome with a clean temporary profile, graphics acceleration enabled, no custom compositor flags, and no active tab capture. Record Chrome version, command line, graphics status, decoder information, actual moving movie playback, and Widevine session status.
2. Play opaque Sintel at ordinary dimensions. Take native macOS screenshot and recording first, with no simultaneous CDP screenshot. Then take browser/CDP capture of the same visible scene. Compare movie pixels and nearby ordinary text separately. A difference demonstrates capture-path dependence.
3. Repeat with Chromium's Mac overlay borders enabled in an isolated test instance to establish native AV-layer selection. Compare the actual installed version's source and switches before attributing failure to an AV-layer disable flag; no universal flag value was established in this research.
4. Only after positive video suppression, put readable canvas behind the same movie. Test opaque and 0.01 opacity, preserving ordinary source-over blending and simple geometry. Check whether video suppression survives and whether the canvas itself changes in native capture.
5. Repeat native capture with and without a concurrent CDP copy or browser tab capture. The CA renderer's explicit capture/copy-request branches make this a targeted hypothesis rather than a random configuration sweep.

A native movie blackout with readable underlying canvas reproduces protected-media behavior but fails Anti-Agent's overlay goal. If movie frames remain visible, resolve decoder/protection metadata and native-layer eligibility before testing more tiny asset sizes.

## APIs that do not solve a normal website's problem

ScreenCaptureKit gives the capturing native app content filters and capture controls. That is not a web page API permitting a website to dictate what arbitrary external capturers exclude. Apple's app-protected-content entitlement is documented for Vision Pro, not a general macOS website screenshot switch. Treat native-app window controls and visionOS entitlements separately from browser media layers. [ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit), [App-Protected Content](https://developer.apple.com/documentation/BundleResources/Entitlements/com.apple.developer.protected-content)
