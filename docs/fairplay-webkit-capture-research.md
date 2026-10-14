# FairPlay and Safari automation capture

Research date: 2026-10-14. Source review uses current WebKit main, not a verified match to installed Safari. Native demo observations appear separately below.

## Protection scope

Apple QA1970 describes exclusion of FairPlay video from iOS screen recording and QuickTime capture of an iOS device. It does not promise macOS Safari WebDriver exclusion or protection for arbitrary canvas pixels. [Apple QA1970](https://developer.apple.com/library/archive/qa/qa1970/_index.html).

## Automation paths

Current WebAutomationSession uses a UI-process viewport snapshot on Cocoa for a viewport-clipped request without an element handle. It waits for presentation and calls takeViewSnapshot with ForceSoftwareCapturingViewportSnapshot::Yes. Element and whole-page requests use the Web-process TakeScreenshot path. The reviewed entry point has no explicit FairPlay check. Lower platform layers may still handle protected media. These sources therefore require a live comparison rather than proving either capture outcome. [WebKit screenshot implementation](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/Automation/WebAutomationSession.cpp).

## Assets and credentials

Apple supplies SDK and stream downloads. Its FPS page does not publish a turnkey browser license endpoint. Production credentials require approval for an eligible content owner or licensee. [Apple FPS resources](https://developer.apple.com/streaming/fps/).

Development credentials cannot test actual protected playback. They test key-server logic through SPC vectors and verify_ckc. [Apple TN2454](https://developer.apple.com/library/archive/technotes/tn2454/_index.html).

The parent agent subsequently opened the [EZDRM vendor demo](https://www.ezdrm.com/demonstration-of-shaka-player-security-ezdrm) in Safari. Its diagnostics reported License Acquired and its playback counter advanced. Capture failed when the native tool reported noWindowsAvailable. This establishes a public demonstration candidate, not reusable credentials or screenshot resistance. See [observation record](fairplay-demo-observation.md).

## Remaining test

Compare native, Safari WebDriver viewport, whole-page, and element captures after independently verifying protected frames. Test the video and underlying ordinary UI separately. Confirm human visibility; playback counters alone do not establish it.

FPS delivery to Safari does not establish desktop Chrome support. A Safari-only result would need a separate compatibility claim. Protection of video would still not prove protection of an arbitrary application or transparent overlay. [Apple client description](https://developer.apple.com/library/archive/technotes/tn2454/_index.html).
