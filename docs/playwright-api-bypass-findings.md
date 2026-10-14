# Ordinary Playwright API bypass

Date: 2026-10-14. Scope remains an npm package that runs in the website, with no application server, native component, managed browser, or extra user steps.

## Source audit

The installed Playwright 1.64.0 bundle is `node_modules/playwright-core/lib/coreBundle.js`. Its SHA-256 is `2325ca4c1c83070e89dc49fb82525508f0a68e0cf12e2a624277968da216b7e0`.

`RawMouseImpl` starts at line 37189. Its move, down, and up methods send `Input.dispatchMouseEvent`. The screenshot implementation sends `Page.captureScreenshot` at line 38817. This bypass does not need locator target marking. Official upstream sources explain the same delegation, but are not pins for the installed bundle: [mouse implementation](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/crInput.ts), [page implementation](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/crPage.ts).

The separate [Chromium boundary review](cdp-enforcement-boundary-followup.md) follows the browser-process screenshot and input paths. No page-owned capture veto or public human-input attestation emerged from that review. This is a finding about reviewed mechanisms, not a proof that future research cannot find a new signal.

## Live attack

The new `reactive-playwright` strategy uses `page.screenshot({fullPage:false})`, `page.mouse.move`, `page.mouse.down`, and `page.mouse.up`. It creates no explicit CDP session. It reads choice labels through local screenshot OCR. It reads application diagnostics only after its decisions.

Chrome launches with `--disable-blink-features=AutomationControlled`. The app code, layout, listeners, and pointer guard remain intact. The client moves into the canvas before capturing, reads the rotated choices, then reproduces motion and hover before selecting the recognized target.

The first isolated run completed 3/3 fresh sessions, in three decisions each. Thus ordinary Playwright APIs can still use the app, even without a custom CDP client.

## Acceptance gate

```sh
npm run verify:agent-proof
```

Run the local Vite server and compile the existing OCR tool before this command. Those are test infrastructure, not deployment requirements for the proposed package.

The command runs the attack matrix, records results in `artifacts/combined-defense/results.json`, then fails if a session completes or remains unblocked. Passing the benchmark's expected-outcome assertions alone cannot count as agent-proof acceptance. A successful adaptive agent must produce a failing acceptance verdict.

The ordinary benchmark remains available as `node scripts/benchmark-combined-defense.mjs`. Its assertions check expected experimental outcomes, including known successful attacks.

An initial full acceptance attempt stopped early when a reactive input sequence hit `pointer-continuity`. The runner now spaces movement samples 60 ms apart rather than 30 ms. The isolated three-session success predates that adjustment. Timing failures do not erase successful bypasses or establish agent prevention.

## Package status

The requested guarantee remains unmet. This milestone adds a reproducible counterexample and a strict acceptance gate. It does not add a website capture restriction, publish a package, or promote the experimental pointer requirements to production defaults.

The final full matrix completed all 27 fresh-page cases. All expected-outcome assertions passed. Both reactive clients completed 3/3 sessions each, while the seven other strategies blocked 3/3 each. The strict acceptance gate then exited 1 with `Agent-proof acceptance failed: 6 sessions bypassed the guard`. [Outcome record](playwright-api-bypass-results.json). This failure is the correct acceptance result for the current application.
