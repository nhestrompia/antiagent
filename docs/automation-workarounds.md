# Automation deterrents within the current scope

Researched 2026-10-13. A website can make ordinary automation less useful or refuse service when it identifies automation. No reviewed web API lets it veto arbitrary Playwright/CDP screenshots of an already displayed ordinary page. Preventing sensitive server actions is a separate, more enforceable goal.

The user confirmed browser-only protection, zero extra steps, and no server for this investigation. The implemented lab measures local detection checks. It does not change authorization or add detection gates to the protected-media application.

## What the tempting checks really mean

`navigator.webdriver` is a standardized indication supplied by cooperating WebDriver-controlled browsers. The specification explicitly frames it as cooperation, not attestation. Blocking when true can stop stock automation configurations, but false does not prove a human: non-WebDriver control, different launch configuration, or runtime instrumentation may avoid that signal. [WebDriver automation information](https://w3c.github.io/webdriver/#interface)

Playwright supports initialization scripts that run before page scripts, and its documented example replaces a JavaScript builtin. A privileged client can similarly influence the environment in which detection runs. Consequently, a client-reported automation verdict is not a trustworthy server authorization credential. This is an inference from the documented instrumentation capability, not proof that every individual detector has the same bypass. [Playwright initialization scripts](https://playwright.dev/docs/api/class-page#page-add-init-script)

`Event.isTrusted` means the browser dispatched the event rather than page code calling `dispatchEvent`; it does not mean a person acted. It can reject simple script-created events and `HTMLElement.click()`. Playwright's Chromium mouse implementation uses CDP `Input.dispatchMouseEvent`, and its keyboard implementation uses CDP input commands. It does not rely on page-created click events. Browser-generated automation input therefore must be tested and cannot be assumed rejected by an isTrusted gate. [DOM event trust](https://dom.spec.whatwg.org/#dom-event-istrusted), [Playwright Chromium input source](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crInput.ts)

Playwright exposes browser screenshots, while CDP exposes capture as a privileged browser command. Neither reviewed contract includes a document cancellation event or consent hook. Overriding canvas export, trapping PrintScreen, hiding when focus changes, or observing keyboard input therefore does not cover these commands or external OS capture. [Playwright screenshot API](https://playwright.dev/docs/api/class-page#page-screenshot), [CDP Page capture](https://chromedevtools.github.io/devtools-protocol/tot/Page/)

## Feasible options

| Option | Measurable benefit | Limit |
| --- | --- | --- |
| Optional automation detection and withheld UI | Stock agents may receive no useful content | Detection can fail; legitimate automated testing and some visitors may be denied |
| Explicit canvas controls | Removes native business-action selectors and semantic controls | Screenshot agents can still read pixels; privileged JS can inspect rendering/actions; accessibility needs a designed alternative |

## Measured guard bypasses

`npm run benchmark:automation` exercises the same canvas action in headed installed Chrome under four policies: webdriver refusal, trusted input, user activation, and their combination. It runs stock Playwright, an initialization-script override of the automation property, and a launch configuration suppressing the automation marker. The action has no native semantic button. The benchmark uses pointer coordinates to exercise its canvas hit test.

| Client configuration | Webdriver refusal | Trusted-input gate | User-activation gate | Combined gate |
| --- | --- | --- | --- | --- |
| Stock Playwright | Refused | Action accepted | Action accepted | Refused |
| Preload property override | Action accepted | Action accepted | Action accepted | Action accepted |
| Browser flag suppressing marker | Action accepted | Action accepted | Action accepted | Action accepted |

All 12 screenshot calls completed. Refused cases capture an intentionally blank canvas. Both bypass configurations render the reference values and accept the action. Ordinary Playwright pointer events have `isTrusted: true` and active user activation. A separate script-created click hits the same action but is rejected by the trusted-input gate. The latter check therefore works as designed, but does not distinguish Playwright from human browser input.

[Committed results](automation-guard-results.json) record the flags, events, and action outcomes. Local images remain under `artifacts/automation-guard-validation/`. This small lab tests these exact checks, not every possible detector. It establishes that these browser-only workarounds cannot satisfy the requested guarantee. Native DRM capture resistance remains a separate mechanism with the previously documented compositor limitation.

## Recommended next benchmark

Keep screenshot prevention and task completion as separate outcomes. Measure the same action against HTML, canvas, and an optional automation-refusal policy. Use stock Playwright first, then browser input through CDP, then an adversarial client allowed initialization scripts and JavaScript/network inspection. Compare headless and headed official Chrome and manual human input.

Record `navigator.webdriver`, event trust, screenshot readability, action completion, direct API completion, calls/time, and human false positives. Add an isTrusted-only control experiment: compare page `dispatchEvent`, Playwright locator click, coordinate mouse click, CDP mouse events, and real pointer input. A detector that blocks the first path but permits the others must not be described as preventing Playwright.

Ship a deterrent only if it measurably reduces the declared agent's task completion without unacceptable human cost. No current evidence supports a guarantee against a client that fully controls its browser and follows the same allowed workflow as a human.
