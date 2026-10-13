# API tamper gate

Run `npm run benchmark:tamper` with the existing Vite origin on localhost:5173. Open `/tamper-lab.html`.

The gate runs before the first protected drawing and before each action. It compares selected API descriptors, names, arity, own keys and native source shapes using an iframe reference. A failed check leaves the canvas black and prevents the local action. It does not expose business text while blocked.

Five fresh-page cases ran in Chrome 155.0.8059.40 with AutomationControlled disabled. Clean browser APIs allowed the action. A plain preload drawing hook and a locally disguised Proxy hook both caused black canvas pixels, zero recovered labels and zero accepted actions. Screenshots checked the actual control region rather than trusting the reported gate state alone.

A cross-realm disguise changed the iframe serializer as the gate inserted the frame. That preload passed the checks, recovered the business label and completed the action. Replacing the downloaded gate module also restored completion. These are real Playwright bypasses, not inferred results.

The initial prototype only compared the page and reference APIs. Testing exposed that addInitScript runs in child frames too, so both could contain matching wrappers. The committed implementation also checks expected Chrome native shapes. Those shapes caught simple wrappers but not an instrumented reference realm. This module intentionally has a narrow experimental Chrome scope. Legitimate extensions or framework instrumentation can trigger it. Human false-positive rates remain unmeasured.

This is an independently written diagnostic inspired by the types of checks reviewed in [CreepJS source](https://github.com/abrahamjuliot/creepjs/blob/master/src/lies/index.ts). No upstream code was copied. It does not prove that a controller is absent: unmodified APIs under Playwright still pass. A clean screenshot-and-coordinate client therefore remains an independent bypass.

Results: [tamper-results.json](tamper-results.json). Images remain local under `artifacts/tamper-validation/`. No production gate, publishing, or real sensitive action was added.
