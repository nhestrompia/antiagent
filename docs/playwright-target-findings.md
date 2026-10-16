# Playwright target-event guard

Test date: 2026-10-14. Chrome 155.0.8059.40; Playwright 1.64.0.

## Finding

Stock locator clicks emit internal DOM events before input. A page can listen for those events, cover its canvas, and reject subsequent actions. This guard blocked locator clicks in all three trials. It does not block direct coordinate input or compositor screenshots.

Playwright's `markTargetElements` dispatches `__playwright_reset_targets__` on the document and `__playwright_mark_target__` on the target. These events cross the isolated-world boundary through the shared DOM. The installed click path calls this helper first. [Official injected source](https://github.com/microsoft/playwright/blob/main/packages/injected/src/injectedScript.ts), [local source audit](playwright-source-audit.md).

## Results

Each row used three fresh pages in headed Chrome. The fixture draws a canvas button. On detection, it paints the canvas black and latches action rejection. Tests check the event log, accepted-action count, and a captured button pixel.

| Operation | Events observed | Actions accepted | Capture pixel |
|---|---:|---:|---|
| Locator click, guard off | 3/3 | 3/3 | Teal |
| Locator click, guard on | 3/3 | 0/3 | Black |
| `page.mouse.click`, guard on | 0/3 | 3/3 | Teal |
| Raw CDP mouse input, guard on | 0/3 | 3/3 | Teal |
| Element screenshot then coordinate click, guard on | 0/3 | 3/3 | Teal |

An initial trial expected element screenshots to emit target events. It failed that expectation. The installed screenshot path skips the marking helper. The final test checks that bypass explicitly.

Nine separate realm tests checked main-world traps for screenshot cleanup, target expandos, and font readiness. Screenshot and locator operations triggered none. Explicit main-world access triggered all three traps. Shared DOM events provide a useful signal where those property traps fail.

## Scope

This is a library-specific detection cue, not a browser security boundary. A modified Playwright build can omit the events. An agent can use coordinate input without modifying Playwright. Screenshots taken before a locator action remain readable. These trials did not test physical human input or tracing variations. Other scripts can emit these event names and cause a false block.

## Reproduce

Start the existing Vite development server, then run:

```sh
node scripts/benchmark-playwright-target.mjs
node scripts/benchmark-playwright-worlds.mjs
```

[Target results](playwright-target-results.json), [realm results](playwright-world-results.json), [interactive fixture](../public/playwright-target.html).
