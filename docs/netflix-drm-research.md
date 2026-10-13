# Netflix and protected capture research

Researched 2026-10-13. Primary sources only. This is source research, not a new capture test.

## What the sources establish

Netflix does use real browser content protection. Its Chrome troubleshooting instructions explicitly require protected-content playback and the Widevine Content Decryption Module. This supports using Netflix as a protected-video comparison, but does not establish that Netflix protects the rest of a web page. [Netflix: M7701-1003](https://help.netflix.com/en/node/27451/)

Netflix lists different playback capabilities for browsers on the same Mac: Safari supports up to UHD while Chrome supports up to Full HD. Those limits are evidence that browser/platform paths differ, not proof of any particular screenshot behavior or DRM security level. Netflix does not document its current screenshot implementation in the help pages found. [Netflix browser requirements](https://help.netflix.com/en/node/30081)

Apple documents an explicit capture restriction for FairPlay video in iOS apps: recording with the iOS recording feature or QuickTime on a connected Mac omits the protected video region. The document distinguishes video protection from audio, and separately describes native APIs apps can use to react to capture. **This document describes iOS capture; it is not a promise about desktop Safari screenshots.** [Apple QA1970](https://developer.apple.com/library/archive/qa/qa1970/_index.html)

Android provides a native window-level `FLAG_SECURE` facility that suppresses screenshots and nonsecure display output of an activity. This can protect ordinary app UI, whereas browser EME operates on encrypted media. An npm package running in a normal web page cannot set its host browser's native Android window flag. The last statement is an inference from the API's native activity/window scope. [Android secure activities](https://developer.android.com/security/fraud-prevention/activities)

EME extends media elements to negotiate encrypted playback, keys, and licenses. It does not define a DRM system or a page-wide screenshot protection API. No reviewed source establishes a mechanism for transferring a video's capture restriction to arbitrary HTML or a canvas through CSS opacity or overlap. [W3C EME](https://www.w3.org/TR/encrypted-media/)

Microsoft's hardware PlayReady path protects keys and decoded video samples and enforces output policy inside its trusted execution environment. Output protection levels govern content output, including HDCP on supported external digital outputs. These are separate from the question of whether an OS or browser screenshot includes underlying DOM/canvas content; successful hardware DRM or HDCP negotiation is not a screenshot-protection test. These Microsoft pages concern Windows/UWP and do not establish desktop Chrome/macOS behavior. [Hardware DRM](https://learn.microsoft.com/en-us/windows/uwp/audio-video-camera/hardware-drm), [Output protection levels](https://learn.microsoft.com/en-us/playready/overview/output-protection-levels)

## Safari/FairPlay experiment requirements

Apple's overview describes FairPlay delivery via HLS, Safari's EME integration, a content-provider application certificate, a server playback context (SPC) request, and a key server returning a content key context (CKC). The video must be authored and encrypted for the supported FairPlay path. These are actual media/key-service requirements; merely renaming our Widevine manifest or selecting a FairPlay key-system string is insufficient. The overview is archival (2016), so current implementation details must follow the current SDK. [Apple FairPlay overview](https://developer.apple.com/streaming/fps/FairPlayStreamingOverview.pdf)

Apple offers SDK downloads and encrypted/unencrypted test streams. Production credentials require approval requested by an Apple Developer Program Account Holder; Apple says approval is for teams providing a consumer streaming service. The public landing page does not supply a complete anonymous certificate-and-license playback endpoint. Download availability must not be mistaken for production deployment permission. [FairPlay Streaming](https://developer.apple.com/streaming/fps/)

Apple's debugging note says SDK development credentials and test SPC vectors can validate a key server using `verify_ckc`, but those development credentials cannot test actual protected-content playback. Consequently, a credible Safari test needs a permitted working demo provider or valid deployment credentials, matching encrypted HLS media, certificate, and key server. It cannot rely on the SDK's development keys alone. [Apple TN2454](https://developer.apple.com/library/archive/technotes/tn2454/_index.html)

## macOS capture path and Max evidence

Current Chromium main has a specific macOS native-layer path. In `ca_renderer_layer_tree.mm`, protected IOSurface content is promoted to an `AVSampleBufferDisplayLayer` when AV layers are enabled; the test is non-clear protection, not hardware-only protection. Protected video is marked ineligible for downgrade to ordinary CALayer. Creation and reuse set `preventsCapture` for non-clear content. Opacity remains a separate property applied to that layer. HDR-copier selection precedes this branch, and actual upstream layer eligibility still matters. This is source behavior, not proof that our installed Chrome uses that path. [Chromium macOS layer tree](https://raw.githubusercontent.com/chromium/chromium/main/ui/accelerated_widget_mac/ca_renderer_layer_tree.mm)

Apple defines `preventsCapture` as protecting the layer against screen capture. Chromium applies it to the video layer, not the window or underlying page. The native layer path therefore gives a concrete mechanism for Chrome/macOS protected-video capture suppression even without hardware-secured Widevine. It does not establish how each OS capture API composites excluded translucent layers; native screenshots/recording require separate tests from Chromium copy-output/CDP screenshots. [Apple preventsCapture](https://developer.apple.com/documentation/avfoundation/avsamplebufferdisplaylayer/preventscapture)

Max's own troubleshooting page says screen-capture software can cause device-setup playback problems and recommends disabling it. It also documents HDCP requirements for connected output. This confirms capture/output restrictions affect Max playback, but does not describe its compositor, demonstrate page-wide screenshot suppression, or disclose which mechanism its current macOS browser player uses. [Max device setup help](https://help.max.com/my-en/Answer/Detail/000002595)

## Inference and unknowns

- **Source behavior:** Chromium's surface aggregator replaces a secure-output-only video texture quad with a black quad for insecure output or a copy-request pass, retaining its shared quad state. Therefore a near-transparent quad's substitution is expected to retain near-transparent compositing rather than automatically black out the page. This is source-based inference, not a test of this Mac's selected media path. [Chromium surface aggregator](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/surface_aggregator.cc)
- **Correction to an overly strong explanation:** Lack of hardware-secured Widevine does not by itself establish lack of screenshot suppression. Chromium's Windows DirectComposition overlay code explicitly prefers overlays for software-protected video's protection benefit. That comment is Windows-specific and does not establish Chrome/macOS behavior. [Chromium DirectComposition overlays](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/dc_layer_overlay.cc)
- **Supported inference:** Netflix-style protected video could make actual video frames unavailable to some capture methods while nearby application UI stays readable. This does not fulfill Anti-Agent's transparent-overlay success criterion.
- **Unknown:** Whether a particular Safari or Chrome/macOS compositor/capture combination substitutes an opaque rectangle before or after CSS blending, and whether such behavior survives a near-transparent full-viewport overlay. The sources above do not answer it.
- **Unknown:** The current Netflix license policy and internal capture implementation. Do not infer either from resolution limits or a black-video anecdote.

## Decisive next experiment

The colored-control milestone now supplies matching clear and encrypted, recognizable frames. Browser screenshots and browser-tab recordings preserve both controls. Native macOS capture remains unavailable in this agent session, so those browser results do not settle the native-layer hypothesis. See [colored-control findings](colored-control-findings.md).

Establish a native positive control with the colored asset and human confirmation of visible live frames. Capture through native macOS screenshot and OS recording, independently of browser/CDP captures. Record whether only the video rectangle is omitted. A capture API error is not evidence of DRM protection.

Once a positive control exists, keep an independently rendered readable canvas behind that exact video, compare opaque and near-transparent full-viewport configurations, and inspect both regions separately. Success requires unreadable underlying canvas in a capture while the human still sees it. If only the video's own frames disappear, Netflix's behavior has been reproduced but the overlay hypothesis has failed. A Safari/FairPlay run should be reported separately from Chrome/Widevine, with its provider and credential prerequisites explicit.

If protection remains limited to video pixels, a different experiment can encode the sensitive interface itself into encrypted video. This tests whether protected media can carry readable UI pixels. It abandons the shared tiny-overlay architecture, requires media updates for changing UI, and does not establish an interactive React renderer. Treat it as a separate architectural experiment, not a fix already demonstrated by Netflix.
