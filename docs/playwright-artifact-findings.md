# Playwright binding artifacts: source and live tests

Installed Playwright 1.64.0 creates page-visible binding properties when a client uses function-binding APIs. The new artifact check looks for those properties before loading the real demo app and during later monitoring. It is now part of the decoy gate and the combined-defense checks.

The descriptor check does not invoke property getters. The decoy gate watches every 100 ms; the existing layered monitor checks every second. A late match selects the decoy and removes the real view's input listener. Content observed before detection cannot be revoked. A timer can also miss a short-lived property or be delayed by throttling.

## Measured outcomes

Visible Chrome 155.0.8059.80, three trials per condition:

| Marker-disabled Playwright operation | First page | Real actions |
| --- | --- | ---: |
| Screenshot and coordinate input only | Real app | 3/3 |
| Plain addInitScript | Real app | 3/3 |
| exposeFunction before navigation | Decoy | 0/3 |
| exposeFunction after initial capture | Real app, then decoy | 0/3 |
| addInitScript with exposeFunctions enabled | Decoy | 0/3 |

Both early binding cases exposed __playwright__binding__ and __playwright__binding__controller__. The real app module was not requested in those normal page flows. The function still returned bridge-ok after diversion, so the result is not a broken binding mistaken for detection. The decoy action completed instead of the real action.

The late binding test first captured the real token, then selected the decoy. It proves late response, not secrecy before that response. Plain init scripts exposed neither binding property nor __pwInitScripts. The installed library contains zero occurrences of the latter string. Lists copied from older detector examples must not be treated as mandatory current markers.

Raw CDP screenshot/input controls remained readable and completed the real action in all three trials of each development group. Their command logs contained no Runtime or Debugger commands.

The production build repeated all five Playwright cases and the raw CDP case once, with the same outcomes. Its default Playwright canvas check also passed. After the new check entered the full layered application, the constrained raw CDP client still completed the three-decision task in 3/3 trials. That full-stack result includes DRM, freshness, temporal rendering, jitter, and clock checks; it is not a claim that the new marker check blocks bare CDP.

## Installed source trace

The audited coreBundle.js SHA-256 is 2325ca4c1c83070e89dc49fb82525508f0a68e0cf12e2a624277968da216b7e0.

- Line 24231 defines the native binding name __playwright__binding__.
- Line 20561 defines the binding-controller property name.
- Line 53153 installs the browser-context binding only when requested.
- Line 39480 sends Runtime.addBinding for that name.
- Line 39018 checks needsPlaywrightBinding before exposing it on a new frame session.
- The init-script client path checks options.exposeFunctions before using function bindings. Plain scripts follow the ordinary serialization path.

Run npm run audit:playwright-artifacts to check these installed-source sections and save their hash and excerpts under artifacts/playwright-source. The audit fails when a required section is missing. It does not establish universal automation detection. [Upstream page binding implementation](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/page.ts), [upstream Chromium frame session](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/crPage.ts), [bindings controller](https://github.com/microsoft/playwright/blob/main/packages/injected/src/bindingsController.ts). Upstream main links explain the design; the local version and hash identify the tested implementation.

## Limits and reproduction

The names identify optional instrumentation. A client can omit bindings, use another implementation, or alter the page checks. Another page script can also create a colliding property. No native human or accessibility false-positive study was run. The demo still serves its static app bundle publicly, so this is not a server authorization boundary.

Run npm run benchmark:playwright-artifacts for all artifact cases, or node scripts/benchmark-automation-decoy.mjs --function-init for the function-init group. The fixture server uses port 5173. Raw images and reports stay under artifacts/playwright-artifacts and artifacts/playwright-function-init. Seven local tests cover descriptor safety, matching, watcher cleanup, and the decoy loading lifecycle.

The GitHub detector review is in playwright-detector-followup.md. Its notification and MIME checks already exist in the installed BotD bundle; adding them again would not create a new layer. No reviewed detector establishes a mandatory signature for screenshot/input-only raw CDP.
