# Protected copy-output source review

Researched 2026-10-14. The pinned change is Chromium commit `b24f276980930f375ff91144a68e3e8846b17431`, committed 2026-09-23. This is a screenshot-obfuscation lead, not website control over CDP.

## What the change actually adds

The change introduces an internal capture-classification flag, defaults it to false, passes it through copy-output/video-capture IPC, and marks view-transition saved-frame captures secure. Its tests verify flag propagation. The stated goal is distinguishing protected-content capture from secure browser uses such as tab previews. The diff does not add a renderer/aggregator rejection or blackening rule, does not modify `Page.captureScreenshot`, and does not mark arbitrary canvas/DOM output protected. Thus this commit alone establishes plumbing for enforcement, not the completed enforcement. [Dated commit and full diff](https://chromium.googlesource.com/chromium/src/+/b24f276980930f375ff91144a68e3e8846b17431%5E!/)

The current header describes secure captures as outputs not readily accessible to JavaScript/users or trivially exportable; this is browser-internal request metadata. An npm package has no reviewed web API to assign it. [CopyOutputRequest header](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/common/frame_sinks/copy_output_request.h)

## Screenshot and protected-video conditions

The reviewed `Page.captureScreenshot` handler defaults to surface capture and asks the RenderWidgetHost for a browser snapshot. It contains no document-owned flag assigning protected-video status. Full end-to-end assignment of `is_secure` through every installed-browser snapshot path was not established in this bounded review; the request default cannot be treated as proof of actual redaction. [Screenshot handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/page_handler.cc)

The reviewed Windows overlay implementation distinguishes clear, software-protected, and hardware-protected video quads. Hardware-protected Media Foundation output has mandatory overlay handling, while ordinary capture can suppress overlay promotion. This platform path does not prove that macOS software Widevine decoding receives equivalent capture exclusion. Protection metadata, decoder choice, browser version, and presentation path must all be verified. [Video/overlay conditions](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/dc_layer_overlay.cc)

## Consequence for the existing macOS test

This plumbing commit does not overturn successful captures of `SW_SECURE_DECODE` playback. Nor does that success prove every future protected-media configuration capturable. A changed conclusion requires a later enforcement change and an installed browser containing it, a genuinely protected decoded video surface, and a visible-playback positive control paired with redacted CDP output. No such new result is established here.

The narrow candidate remains properly protected media on supported hardware. It does not convert arbitrary live UI into protected content or hide ordinary DOM overlays. Follow-up work should locate the actual consumer of this flag and prove the full path before building an npm API around it. No screenshot-prevention guarantee follows from this flag's presence or the commit message.

## Current-main enforcement follow-up

The retrieved current-main `SurfaceAggregator::CopyQuadsToPass` does contain a concrete blackening rule: a `TextureDrawQuad` with `secure_output_only` becomes solid black when the display output is not secure **or** the quad is in a copy-request pass. The inspected rule uses `secure_output_only` and `in_copy_request_pass`, not the new request `is_secure` field. This establishes existing redaction for suitably flagged quads; it does not establish that every encrypted video is suitably flagged. [Surface aggregator, retrieved 2026-10-14, lines 1360–1374](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/surface_aggregator.cc)

`TextureDrawQuad` separately carries `secure_output_only`, `is_video_frame`, and `protected_video_type`. Its declarations distinguish the secure-output requirement from the protected-video classification. No equivalence between the requested EME string `SW_SECURE_DECODE` and `secure_output_only=true` follows from those fields. [Texture quad declaration](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/common/quads/texture_draw_quad.h)

The retrieved `SkiaRenderer` contained no occurrences of `is_secure`, `secure`, or `protected_video_type`; the above aggregator replacement occurs before that drawing stage. The retrieved Page handler contained no `is_secure` assignment. These are observations of the inspected files, not proof of every transitive helper or subsequent main commit. [Skia renderer](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/skia_renderer.cc), [Page handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/page_handler.cc)

The requested `video_draw_quad.h` path was unavailable; current texture quads supply the inspected video fields. Attempts to retrieve likely video-resource-updater paths did not produce source. Consequently, this review did not prove the producer mapping from software Widevine frames to either protection field. The valid conclusion remains conditional: copy-pass redaction exists for secure-output-only texture quads, but the existing visible macOS playback/capture result must not be overridden without proving that the tested decoder actually emits them.
