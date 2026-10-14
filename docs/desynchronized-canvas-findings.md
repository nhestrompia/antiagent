# Low-latency canvas capture test

Date: 2026-10-14. Chrome 155.0.8059.40 on macOS. This tests the `desynchronized` context option, distinct from the prior WebGPU texture-usage experiment.

## Hypothesis and controls

A low-latency canvas can bypass ordinary paint scheduling. The candidate hypothesis was that this presentation path might omit the application from compositor screenshots. The test compares ordinary and requested-desynchronized 2D and WebGL contexts in both headless and visible Chrome, with three fresh browsers per configuration.

Each scene randomizes the positions of three labeled controls. The agent reads a viewport screenshot, locates Harbor Research through offline OCR, and sends a trusted coordinate click. The page accepts only that choice and reports its count after input. It exposes requested and actual context attributes but never the randomized layout in its diagnostic title. The raw client uses no Runtime or Debugger command.

The WebGL fixture renders a 2D text texture into a full-screen quad. This tests the final WebGL presentation path; it does not claim that the source text bitmap is inaccessible. The proposed mechanism concerns compositor capture, not hiding a bitmap from debugger inspection.

## Results

All 24 cases exposed the target label in the screenshot and accepted its coordinate click. Both the headless and visible controls worked in all repetitions.

| Context | Requested desynchronized | Reported desynchronized | Headless accepted | Visible accepted |
| --- | --- | --- | ---: | ---: |
| 2D | false | false | 3/3 | 3/3 |
| 2D | true | true | 3/3 | 3/3 |
| WebGL | false | false | 3/3 | 3/3 |
| WebGL | true | false | 3/3 | 3/3 |

[Full results](desynchronized-canvas-results.json) include requested and actual attributes, browser version, coordinates, action counts, and command inventories. Screenshots remain under `artifacts/desynchronized-canvas/`.

## Limits and decision

The browser accepted the 2D setting but reported the WebGL request as false. Attribute readback does not prove that a low-latency scanout path exists. The [primary-source review](desynchronized-canvas-source-review.md) identifies a Mac platform gate that makes the specific low-latency usage path a no-op in current Chromium main. These macOS tests do not validate that path on Windows, Android, or ChromeOS.

The result rules out protection for the tested browser and hardware. It cannot support a universal npm-package guarantee. No capture-excluded surface or detector enters the main application from this experiment.

## Reproduce

With the existing Vite server and offline OCR executable ready:

```sh
npm run benchmark:desynchronized-canvas
```

This compares 24 fresh-browser cases and fails if a baseline cannot render, OCR cannot find the visible target, or a recognized click does not count. Passing these assertions establishes the recorded bypasses, not agent prevention.
