# Playwright injected-runtime probe

Test date: 2026-10-14. Playwright 1.64.0, Chrome 155.0.8059.40.

## Finding

A read-only locator query initializes Playwright's injected helper. That helper watches document-root changes. Removing and immediately reattaching the same root makes it dispatch `__playwright_global_listeners_check__` on the shared window. The page can observe this event and reject later actions.

The fixture catches that event, paints its canvas black, and latches action rejection. This extends the earlier target-event guard to some DOM inspection that does not click a target. [Source audit](playwright-cdp-followup-source.md).

## Results

Each row used three fresh pages. The runner performs the listed operation, checks that no block has occurred, triggers the root probe, waits 100 ms, then attempts a coordinate click. It checks event logs, action counts, and the captured button pixel.

| Prior operation | Detection | Later clicks accepted | Capture after probe |
|---|---:|---:|---|
| None | 0/3 | 3/3 | Teal |
| Raw CDP screenshot | 0/3 | 3/3 | Teal |
| Playwright screenshot, caret unchanged | 0/3 | 3/3 | Teal |
| `locator.count()` | 3/3 | 0/3 | Black |
| Coordinate mouse movement | 0/3 | 3/3 | Teal |

An initial expectation that screenshot preparation would initialize the helper failed. The final test records screenshot-only operation as a bypass.

## Limits

The probe detects an initialized helper, not screenshot initiation. It runs after the prior operation. An agent may already have obtained data before detection. Screenshot and coordinate agents bypass it without modifying Playwright.

Root removal can affect focus, selection, accessibility, and application lifecycle code. This disposable fixture does not validate those effects in React. Do not add a repeating root probe to production applications based on these results. Modified helpers or early suppression of the page listener can also bypass detection. Physical human input and tracing variations remain untested.

## Reproduce

Start the Vite development server, then run:

```sh
node scripts/benchmark-playwright-root-probe.mjs
```

[Machine-readable results](playwright-root-probe-results.json), [fixture](../public/playwright-root-probe.html).
