# Canvas tainting versus compositor capture

Six installed Chrome trials compared a cross-origin no-CORS image with a CORS-approved control. Both used the existing Vite server: the page loaded through 127.0.0.1 and the tiny static image through localhost. This uses two origins, not another server process.

The image drew into the canvas before the reference UI. The UI then overwrote its visible pixels without clearing the origin-clean restriction. Each trial also copied the canvas into a second canvas.

| Case | Original export APIs | Copied canvas export | Compositor capture | Coordinate action |
| --- | --- | --- | --- | --- |
| No-CORS image, 3 trials | SecurityError in all three | SecurityError in all three | Both controls visible in all three | Accepted in all three |
| CORS-approved control, 3 trials | Allowed in all three | Allowed in all three | Both controls visible in all three | Accepted in all three |

The original APIs tested were getImageData, toDataURL, and captureStream. Original and copied screenshot samples each matched the reference RGB value 17, 100, 86. The browser version and all cases are in [results](canvas-origin-results.json). Images are under artifacts/canvas-origin/.

This establishes a browser-enforced export restriction that survives canvas copying. It does not prevent compositor capture or coordinate input. A production installation would need a qualifying cross-origin resource; the local hostname arrangement is a test fixture.

Run npm run dev, then node scripts/benchmark-canvas-origin.mjs. Open /origin-canvas.html for the restricted case and add ?cors=on for the control. No default app protection changed.

Primary-source research is in [canvas origin boundary research](canvas-origin-boundary-research.md).
