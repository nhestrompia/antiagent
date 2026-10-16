# Playwright source audit

Research date: 2026-10-14. Installed Playwright: 1.64.0. Tests use the installed bundle. Official main-branch links explain the implementation but do not pin this release.

## Target events

The injected `markTargetElements` helper dispatches `__playwright_reset_targets__` on the document and `__playwright_mark_target__` on target elements. Both events bubble across the shared DOM. The click and hover paths call this helper before input. [Installed action path](../node_modules/playwright-core/lib/coreBundle.js#L21410), [official injected source](https://github.com/microsoft/playwright/blob/main/packages/injected/src/injectedScript.ts).

The prototype blocked stock locator clicks in 3/3 trials. Coordinate input and raw CDP bypassed it. Element screenshots skip the helper; screenshots followed by coordinate clicks also bypassed it. Tracing variations remain untested. [Test findings](playwright-target-findings.md).

The snapshotter also uses `__playwright_target__` as a JavaScript property. It adds a synthetic attribute to serialized snapshots. This does not imply that the live DOM contains that attribute. [Snapshotter listener](../node_modules/playwright-core/lib/coreBundle.js#L15483), [snapshot serialization](../node_modules/playwright-core/lib/coreBundle.js#L15807).

## Isolated-world traps

Screenshot preparation and cleanup run in the utility world. Font readiness checks run there too. Main-world property traps cannot intercept these accesses. Nine trials confirmed this boundary: screenshots and locator clicks triggered no traps; explicit main-world accesses triggered them. [Preparation](../node_modules/playwright-core/lib/coreBundle.js#L22944), [isolated-world creation](../node_modules/playwright-core/lib/coreBundle.js#L38987), [results](playwright-world-results.json).

Direct CDP capture skips Playwright preparation. The cleanup helper can also be absent when preparation does nothing. Chromium does not always toggle a temporary stylesheet. Style, mask, caret, and animation options can change the shared DOM, but those effects depend on the options. [Official screenshotter](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/screenshotter.ts).

## Form helpers

Select-options helpers set values and dispatch script-created input and change events. Some specialized input types use similar fill helpers. Text fields instead use focus and keyboard insertion. Rejecting untrusted events could catch some form helpers, but it cannot reject all automated input. These form paths need separate compatibility tests.

## Decision

Keep target events as a stock locator-action signal. They provide no browser-enforced boundary: callers can omit the helper and request capture or input directly.
