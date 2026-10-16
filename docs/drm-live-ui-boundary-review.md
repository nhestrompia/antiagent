# DRM and live UI boundary review

Researched 2026-10-14 against primary specifications and Google documentation. Browser-only npm, no server/license service or additional user steps, remains the required scope. This does not assert that DRM cannot protect media; it asks whether its protected pipeline can accept this application's live UI.

## What the web APIs provide

EME controls encrypted media playback through a selected content decryption module. It does not itself define DRM. `MediaKeys` manages sessions and policy queries; the reviewed interfaces supply no operation to encrypt a DOM subtree, canvas, or arbitrary live frame into a hardware-protected surface. Robustness is key-system-specific and must be supported by the actual browser/platform. An empty robustness request accepts any decrypt/decode capability. Clear Key supports only empty robustness and uses application-supplied clear-text keys; a local Clear Key example is explicitly supported, but it establishes decryption, not hardware protection. [EME specification](https://www.w3.org/TR/encrypted-media/)

WebCodecs can encode application-accessible `VideoFrame`s constructed from canvas/image sources. Its reviewed encoder interfaces produce encoded chunks and expose no CDM-backed encryption or protected-output configuration. Inference: encoding a canvas does not erase the clear input pixels or state that the application already held. A later protected player cannot retroactively protect that earlier source from privileged inspection. [WebCodecs specification](https://www.w3.org/TR/webcodecs/)

Media Source supplies buffered media segments to a media element. It provides an ingestion path for packaged media, not a DOM-to-protected-compositor conversion. Combining encoding, packaging, encryption, and MSE can produce playable encrypted media, but each step and the final key-system capability must actually be implemented. MSE alone grants no protection level. [Media Source specification](https://www.w3.org/TR/media-source-2/)

## Widevine's actual dependency

Google documents separate content-key retrieval for encryption and device license issuance. Cloud service access requires licensee organization credentials; requests pass through a partner proxy. Licenses become individualized to the requesting device and are no longer modifiable after generation. Its reference packager performs encryption using Widevine PSSH and creates DASH media. Therefore a licensed sample asset/license endpoint is not evidence that the page can submit arbitrary newly encoded UI frames using an arbitrary locally generated key. A complete candidate needs matching encryption keys, key IDs/init data, a CDM-accepted license, supported robustness, and protected playback. [Widevine overview](https://developers.google.com/widevine/drm/overview)

## Supported candidate versus missing boundary

A supported candidate is playback of properly encrypted prepackaged video, with a supported DRM configuration and an authorized license response. A browser experiment can establish whether that particular video receives protected composition and defeats particular capture routes. Existing licensed assets can test that boundary; they cannot prove protection of live DOM or canvas content.

A package could locally encode and encrypt known clear UI pixels and use Clear Key without a remote license service. That is an encrypted-media experiment with clear source/key state, not a supported hardware-protection route. The reviewed APIs establish no browser-only method that converts arbitrary live UI into CDM-owned protected pixels while keeping its clear source and keys outside the privileged browser attacker.

Pre-rendering every interaction state into licensed protected assets would change the content-production and license model. It would still require testing state leakage, input automation, supported hardware, fallback rejection, and capture routes. A protected video beneath ordinary DOM controls protects only its media surface, not those overlaid controls. These remain explicit hypotheses or scope changes, not an npm-only agent-proof implementation.
