# HTML readback versus CDP capture

Researched 2026-10-15 with primary sources. Read the earlier [HTML masking review](html-capture-prevention-review.md) and [canvas origin review](canvas-origin-boundary-research.md) first. This review pins Chrome 155 source where available.

## What the mode protects

HTML-in-Canvas defines read-back-allowed rendering so a script can read the resulting pixels without gaining new private information. Its explainer excludes cross-origin content, visited-link state, pending autofill previews, spelling markers, and other browser-owned details. It does not describe an author-controlled arbitrary sensitive-content flag. Exclusion applies while drawing into a readable destination. It does not claim that normal display remains clear while CDP receives a redacted frame. [Primary explainer](https://wicg.github.io/html-in-canvas/)

The related HTML specification work is tracked in PR 12554. The SVG working group separately proposes using the mode for SVG-as-image foreign content. These are specific rendering consumers. Neither proposal establishes that browser screenshots use the mode. [HTML PR](https://github.com/whatwg/html/pull/12554), [SVG working-group issue](https://github.com/w3c/svgwg/issues/1151)

## Chrome 155 source paths

Chrome `155.0.8059.40` declares `CanvasDrawElement` experimental, with an `HTMLInCanvas` origin-trial feature. This source does not support calling it a normal stable API on every Chrome 155 desktop. A trial token or experimental flag would change the test conditions. [Pinned feature declaration](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/third_party/blink/renderer/platform/runtime_enabled_features.json5)

The pinned canvas implementation has `captureElementImage` and cached child paint records. It requires `layoutsubtree` and restricts which descendants can be drawn. These are author controls over canvas drawing eligibility. They are not flags marking normal page output unavailable to capture. [Pinned canvas implementation](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/third_party/blink/renderer/core/html/canvas/html_canvas_element.cc)

A pinned Chromium change shows the actual privacy paint call: `CanvasRenderingContext::GetElementPaintRecord` invokes `PaintLayerPainter` with `kCanvasElementImage`, `kPrivacyPreserving`, and `kOmitCompositingInfo`. Canvas subtree painting also adds `kPrivacyPreserving`. This ties the mode to element paint records. The inspected change is historical; it must not be substituted for proof of a complete current Chrome 155 call chain. [Pinned paint change](https://chromium.googlesource.com/chromium/src/+/8a6312f8adb0d0607115b88aa1f3334e46598a10%5E!/)

By contrast, pinned Chrome 155 `PageHandler::CaptureScreenshot` calls `RenderWidgetHostImpl::GetSnapshotFromBrowser`, with surface capture enabled by default. The reviewed handler does not invoke `GetElementPaintRecord`, `drawElementImage`, or a privacy paint flag. Inference: this API does not route through the element-to-readable-canvas paint operation. The handler alone does not prove every compositor step, but it supplies no evidence that CDP opts into this redaction mode. [Pinned CDP handler](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/content/browser/devtools/protocol/page_handler.cc)

## Concrete test and decision

If the installed browser exposes HTML-in-Canvas without extra flags, test one browser-owned private detail beside ordinary author text. Compare normal visible rendering, element-to-canvas pixel readback, and raw CDP screenshot. Record any trial token or flags. A readable-canvas omission paired with a clear CDP screenshot confirms separate consumers. An unavailable API is an acquisition failure, not capture protection.

No reviewed author control marks arbitrary app content sensitive for this mode. Putting ordinary text inside a readable canvas does not make that text private. No reviewed Chrome 155 call site establishes capture-only CDP redaction through this feature. This candidate can test a real privacy paint path, but it is not yet a source-backed defense for this package.
