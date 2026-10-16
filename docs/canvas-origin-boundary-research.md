# Canvas origin-clean boundary versus screenshots

Research date: 2026-10-14. Scope: browser-enforced readback restrictions without another server process or extra human step.

## Taint rules

Canvas bitmaps start origin-clean. Drawing a qualifying cross-origin image or non-clean canvas makes the destination non-clean. Image export and pixel readback then throw SecurityError. Copying into another canvas carries the restriction. Resetting dimensions clears both the flag and the bitmap, so it loses the original content. [HTML canvas security rules](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements).

A small qualifying image can taint the entire canvas. The app can then draw its UI. This protects source-origin isolation, not an application-selected confidentiality policy.

## Screenshot boundary

Pinned Chromium 155 PageHandler captures through the browser view or surface snapshot path. Its reviewed handler does not call canvas export APIs or check each canvas's origin-clean flag. This suggests a separate screenshot boundary; the handler alone does not prove all compositor behavior. [Pinned screenshot handler](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/devtools/protocol/page_handler.cc).

The [live test](canvas-origin-findings.md) confirmed the distinction. Original and copied canvases rejected export in the tainted cases. Compositor captures showed both controls, and coordinate input completed the action.

## Local generation and integration

A Blob URL normally inherits its creator's origin. A locally created SVG Blob does not automatically become cross-origin. Blob access also depends on storage partitioning. Generating it in an opaque sandbox does not establish parent access. [File API origin and access rules](https://w3c.github.io/FileAPI/#originOfBlobURL).

SVG image processing restricts scripts and external references. Those rules do not exclude its displayed pixels from screenshots. [SVG processing modes](https://svgwg.org/svg2-draft/conform.html#secure-static-mode).

The local test serves the page and image through different hostnames on the existing Vite process. Production would still need a qualifying resource origin or a verified local construction. This test fixture is not a universal installation recipe.

No reviewed source supplies an immutable, screenshot-excluded ordinary canvas. Tainting offers a real export restriction, while the tested privileged screenshots bypass it.
