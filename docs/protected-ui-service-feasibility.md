# Protected live UI through a DRM service

Reviewed 2026-10-16. Chrome on an ordinary Mac remains required. Safari, Windows-only support, and a custom browser are outside the accepted solution. The hosted-service route below is technically implementable on supported clients, but it does not yet meet that requirement.

A concrete media delivery route exists: render the UI on a trusted server, encode its pixels as live video, encrypt the stream, and issue licenses that require the chosen client's protected playback path. Existing services supply key exchange and license issuance. This changes the earlier browser-only npm scope. It does not establish protection from every capture or input route.

## Client choice comes first

| Client | Candidate | Limit to prove |
| --- | --- | --- |
| Chrome on this Mac | Widevine with a strict hardware robustness request and matching license policy | The earlier local software-secure playback remained readable through CDP. A provider cannot add a hardware capability the client rejects. Do not silently fall back. |
| Safari on macOS | FairPlay-protected HLS | Apple lists Safari on macOS as a supported FPS client. Actual screen-capture exclusion on the selected Mac, OS, and browser still needs testing. |
| Edge on supported Windows hardware | PlayReady hardware DRM, with a license requiring SL3000 | Hardware support and protected output must be available. The browser must reject playback when the required protection cannot be met. |

[Local Chrome capture findings](chrome-capture-path-research.md), [Apple FPS technical note](https://developer.apple.com/library/archive/technotes/tn2454/_index.html), [Microsoft hardware DRM guidance](https://learn.microsoft.com/en-us/windows/uwp/audio-video-camera/playready-encrypted-media-extension).

The Microsoft article includes older EME interfaces. Use it as evidence of the supported hardware route, not current player code to copy. Query the actual client and record the selected key system and robustness. Platform labels alone are insufficient.

## A service path that can be procured

Axinom documents a trial account, external packager credentials obtained through support, and production paid plans. Its GCP Live Stream integration acquires content keys from Axinom, stores them in Secret Manager, and uses their key IDs later for license issuance. Supported exchange routes include SPEKE v2 and Widevine Common Encryption. This supplies a concrete integration path, rather than relying on somebody else's demo asset license. [Provider integration and prerequisites](https://docs.axinom.com/services/drm/encoders/gcp-live-stream).

Axinom's license policy examples include Widevine `HW_SECURE_ALL`, PlayReady `min_device_security_level: 3000`, and hardware-verification restrictions. These are policy controls, not guarantees that all clients can play. Ask the provider to supply the smallest supported policy for each target and to confirm rejection instead of software fallback. [Provider policy guidance](https://docs.axinom.com/services/drm/technical-articles/drm-best-practices/).

AWS MediaPackage is another documented packaging component. SPEKE connects the encryptor with a DRM key provider. Its live support includes Widevine, PlayReady, and FairPlay, with different encryption/container combinations. FairPlay uses HLS; a common provider does not remove client-specific packaging rules. [AWS live DRM matrix](https://docs.aws.amazon.com/mediapackage/latest/ug/encryption-choosing-speke-version.html), [SPEKE roles](https://docs.aws.amazon.com/speke/latest/documentation/speke-api-specification.html).

## Procurement and implementation gaps

- A provider trial, license-service credentials, key-service credentials, supported strict policy, and a production quote are still needed. No account was created and no purchase was made.
- FairPlay production credentials need Apple approval. The organization's Account Holder must apply; Apple says the team must provide a consumer streaming service and excludes applications from third parties acting for content owners. Whether this interactive UI use qualifies needs explicit confirmation. A DRM vendor account does not resolve that approval. [Apple deployment requirements](https://developer.apple.com/streaming/fps/).
- A trusted renderer/encoder must hold clear UI frames. Keys, provider signing credentials, and license-entitlement signing must remain server-side. A page-owned clear canvas would leave the original pixels available to privileged browser access.
- The service needs authenticated input, per-session authorization, coordinate/version binding, and server-side action validation. DRM protects media delivery; it does not attest that input came from a person.
- Encoding, segment packaging, network delivery, and buffering introduce latency. The acceptable interaction delay, concurrent personalized streams, cost, text quality, accessibility, and fallback behavior remain product decisions. None was benchmarked here.

## Smallest decisive experiment

Before a live backend, obtain one short moving test video under our own provider-issued keys. Put a changing random code in the encoded frames. Keep the code and clear source out of page DOM, canvas, logs, manifests, and license tokens.

For the accepted Chrome/Mac scope, first require a working protected playback configuration on that client. The capability result below currently fails that prerequisite. Windows/Edge and Safari/FairPlay would be separate platform experiments, not substitutes for this requirement. Require the intended robustness and policy, with no weaker fallback. Verify playback visibly with an external observation, not only player success events.

While playback advances, capture through the actual adversarial routes: CDP surface/window screenshots where available, ordinary OS screen capture, and any supported browser automation capture. Compare the random code in the real output. Verify that unrelated controls remain capturable, so a failed capture is not mistaken for protection. Test a deliberately unsupported policy/client as a negative playback control.

If the code remains readable through any required capture route, reject that client/policy combination. If protected playback works and required captures omit it, next stream a server-rendered two-button UI through the same encryption/license chain and measure action latency. This proves the missing service integration in small steps. It does not prove resistance to an external camera or a human-assisted agent.

## Installed Chrome capability check

The new diagnostic ran in visible Chrome 155.0.8059.80 on this Mac, at a trustworthy local origin. H.264 baseline, H.264 high profile, and VP9 each accepted SW_SECURE_DECODE. All three hardware robustness levels (HW_SECURE_CRYPTO, HW_SECURE_DECODE, HW_SECURE_ALL) were rejected for every tested codec. The HEVC configuration was rejected at the software level too, so its hardware failures are not independent evidence about hardware protection.

This was capability negotiation, not playback or screenshot validation. It used temporary sessions with persistent state and distinctive identifiers disallowed. Runtime evaluation is deliberate diagnostic instrumentation, not the screenshot-only attacker. Run `node scripts/probe-protected-playback.mjs` with the local Vite server on port 5173. Raw output stays in `artifacts/protected-playback/capabilities.json`, not docs.

The source explains the result. In Chrome 155.0.8059.80, the component installer registers desktop Widevine with `Robustness::kSoftwareSecure`. `AddHardwareSecureWidevine` supplies Android and protected ChromeOS paths, with no Mac branch. A provider's license policy is applied above these client capabilities; changing the license vendor cannot add the missing Mac playback implementation. [Desktop component registration](https://chromium.googlesource.com/chromium/src/+/155.0.8059.80/chrome/browser/component_updater/widevine_cdm_component_installer.cc#95), [hardware registration](https://chromium.googlesource.com/chromium/src/+/155.0.8059.80/chrome/common/media/cdm_registration.cc#251).

## Latency and the next engineering decision

An encoder can feed a live packager using a pipe. Shaka documents live input and LL-DASH delivery, but every delivery stage and the player must support progressive chunk delivery. Switching on lowLatencyMode alone does not prove usable remote UI latency. Apple's original LL-HLS design targets one to two seconds at scale, which illustrates why a streaming service's low-latency label is not a desktop-interaction guarantee. No end-to-end latency was measured here. [Live input](https://shaka-project.github.io/shaka-packager/html/tutorials/live.html), [LL-DASH requirements](https://shaka-project.github.io/shaka-packager/html/tutorials/low_latency.html), [Apple design target](https://developer.apple.com/videos/play/wwdc2019/502/).

The practical implementation would reuse a hosted DRM provider, a trusted per-session UI renderer, an encoder/packager, encrypted media delivery, and an authenticated input channel. Static UI-to-encrypted-video conversion already exists in scripts/generate-asset.mjs; the missing engineering is live updates and low-latency input feedback. Neither of those additions closes the demonstrated Mac Chrome compositor leak with software-secure playback.

Do not buy or build the live renderer as a claimed solution to this gap yet. The next required evidence is a supported Mac Chrome media path that produces readable live display pixels and unreadable CDP copies. None was found in this research. A service can deliver protected video today; the current required client does not expose the hardware path this proposal depends on.
