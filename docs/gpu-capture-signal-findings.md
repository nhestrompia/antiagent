# GPU readback as a CDP signal

Tested 2026-10-16 in visible Chrome `155.0.8059.80` on the local Mac. The hypothesis was that compositor capture changes the latency of the page's own GPU work. Earlier probes measured animation-frame intervals. This probe measures synchronous WebGL pixel-readback call time instead.

## Method

The page draws a green 512 by 512 WebGL2 canvas. Each animation frame measures wall time around a one-pixel `readPixels` call. This includes browser, driver, scheduling, and graphics costs. It is not a hardware GPU timer or a direct observation of another context's queue.

A trusted key starts the test. The page excludes the first 250 ms and collects three seconds of samples. The detached control removes the page's target session during that warmup, then attaches again after measurement. The browser debugging listener and browser-level connection remain active. This is a target-attachment comparison, not a browser launched without remote debugging.

Each mode runs three times in a fresh visible browser. Mode order rotates across repetitions. No Runtime or Debugger command is sent. The ordinary GPU control issues 128 draws per frame instead of one. The ordinary CPU control spends four milliseconds on page work before each measured draw/readback. The screenshot controls require a green region in every captured frame. The fixture also requires a green readback pixel, no graphics error, and no context loss.

## Results

| Mode | Captures per trial | Median readback, ms | P95 readback, ms |
| --- | --- | --- | --- |
| Detached target | 0 | 1.2 to 1.4 | 1.8 to 1.9 |
| Attached idle | 0 | 1.3 | 1.9 |
| Frequent screenshots | 101, 97, 79 | 0.6 to 0.8 | 1.5 to 1.6 |
| Sparse screenshots | 7, 7, 7 | 1.0 to 1.3 | 1.8 |
| Ordinary GPU load | 0 | 1.4 to 1.6 | 2.0 to 2.1 |
| Ordinary CPU work | 0 | 0.6 | 1.1 to 1.3 |

All 18 final cases passed their measurement checks. Frequent capture correlates with lower readback time in this fixture. A median threshold below one millisecond would flag all three frequent-capture cases and all three ordinary-CPU controls. It would miss all three sparse-capture cases. This is not a CDP-specific signature. Attached idle and detached results overlap.

No blocking rule was added. The experiment measures after capture starts and does not establish warning before the first useful screenshot. Sparse capture does not establish task completion against the layered app. This fixture has no DRM or business-action flow, so these measurements do not replace the full-stack bypass tests.

## Corrections retained

The first pilot put too much JSON in the title; Chrome truncated it at 4096 characters. The next pilot used WebGL `finish()`. Pinned Chromium `.40` implements that method with `Flush()`, explicitly choosing a flush rather than a finish. It was unsuitable as a GPU-completion measurement. The final probe uses actual pixel readback. [Pinned implementation, lines 3553 to 3557](https://chromium.googlesource.com/chromium/src/+/155.0.8059.40/third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc#3553).

The early color check also rejected readable screenshots. Visual inspection found green screenshot pixels at RGB 96, 201, 77, despite a different framebuffer value. The corrected control compares channel dominance and green area. Drawing also continues after measurement. The failed title, drawing, and color pilots remain in their separately named JSON files. None counts as capture protection. The source pin and installed patch versions differ.

Run `npm run benchmark:gpu-capture-signal` with the local Vite origin on port 5173. Final samples, capture counts, positive controls, and protocol methods are in [raw results](gpu-capture-signal-results.json). Images remain local under `artifacts/gpu-capture-signal`. The [fresh source search](cdp-detection-leads-2026-10-16.md) covers the separate loopback-listener and legacy input-coordinate leads.
