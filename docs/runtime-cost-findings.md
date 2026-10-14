# Runtime stack-cost detector and adaptive bypass

Date: 2026-10-14. Chrome 155.0.8059.40. These tests use direct WebSocket CDP, not Playwright's browser connection. The page runs without an application server beyond the existing development server.

## Hypothesis

Enabling Runtime requests inspector exception stacks. Creating deep errors with `Error.stackTraceLimit=0` can therefore cost more. A page could detect default Runtime configuration before it reveals controls. The [primary source review](runtime-cost-source-review.md) identifies both this mechanism and explicit controls that disable it.

## Measurement

The fixture creates 2,000 errors at depths 0, 20, and 80. It measures nine batches after warm-up, for both ordinary creation and caught throws. Results come through the document title and `Target.getTargetInfo`, so measurement does not require Runtime evaluation. Each configuration uses three fresh isolated Chrome profiles.

At depth 80, ordinary creation took 18.7–21.2 ms with Runtime enabled, versus 1.1–1.2 ms for bare CDP, Runtime with capture size zero, and Runtime disabled. The full [measurement record](runtime-cost-results.json) includes every batch and the command inventory.

## Experimental guard

`combined-defense.html?runtime=on` enables a pre-render timing check. It takes the median of three batches and blocks at 8 ms. It restores the previous Error stack limit. This threshold comes from this machine's observed separation, not a human or hardware calibration. The guard stays off by default because slow hardware, open DevTools, contention, and other inspector sessions remain unvalidated.

## Actual application-use test

The raw client captures viewport screenshots, uses local OCR to locate each choice, reproduces pointer movement and hover, then sends input through the original application handlers. It recognizes the visible Task complete outcome after its three decisions. It does not use Runtime evaluation or paused-frame evaluation to choose actions.

| CDP configuration | Fresh sessions | Blocked | Task complete |
| --- | ---: | ---: | ---: |
| No Runtime or Debugger commands | 3 | 0 | 3 |
| Runtime enabled, default stack capture | 3 | 3 | 0 |
| Runtime enabled, capture size zero | 3 | 0 | 3 |
| Runtime enabled then disabled before navigation | 3 | 0 | 3 |

All 12 expected-outcome assertions passed. Every bare case asserts that its command inventory contains no Runtime or Debugger command. The [application results](bare-cdp-results.json) include final screenshot OCR, selected coordinates, browser version, and command inventory. Screenshot files stay under `artifacts/bare-cdp/`.

These successful sessions refute agent prevention by this detector. They do not depend on modifying the page, disabling its listeners, or fabricating a completion flag. The fixture can detect a debugger configuration, not immutable input provenance.

## Reproduce

Start the existing Vite server and compile the existing offline OCR tool. Run:

```sh
node scripts/benchmark-runtime-cost.mjs
node scripts/benchmark-bare-cdp.mjs
```

The raw CDP transport launches a fresh headless Chrome profile for every configuration and closes it afterward. Test infrastructure uses Node and the local OCR executable. The experimental website guard adds neither a server nor an OCR dependency to application deployment.

The application build, JavaScript syntax checks, and diff whitespace check pass. No package was published. The agent-proof goal remains unachieved.
