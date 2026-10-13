# Existing approaches worth benchmarking

Researched 2026-10-13. Constraints: an ordinary Chrome website, client-side npm integration, no additional server service, extension, CAPTCHA, or human verification step. The shortlist concerns **deterrence and automation detection**, not a validated way to prevent arbitrary screenshots.

## BotD: best immediately usable baseline

BotD is a client-side bot detector distributed as `@fingerprintjs/botd`, under MIT. Its maintainers explicitly describe the open-source package as basic detection and its current roadmap as stability-only; sophisticated AI-agent and stealth detection are promoted as separate professional API capabilities. Therefore use the free package as a reproducible baseline, not import the paid service's accuracy claims. [Repository and maintenance statement](https://github.com/fingerprintjs/BotD), [package metadata](https://github.com/fingerprintjs/BotD/blob/main/package.json)

Its detector registry covers webdriver, user-agent/version, plugins, languages, notification permissions, WebGL, window dimensions, function/builtin inconsistencies, and distinctive globals. The distinctive-properties source scans window/document properties for known framework artifacts, including Selenium/WebDriver and legacy automation tools. These checks can supplement a simple webdriver gate without changing human interaction. [Detector registry](https://raw.githubusercontent.com/fingerprintjs/BotD/main/src/detectors/index.ts), [distinctive properties](https://raw.githubusercontent.com/fingerprintjs/BotD/main/src/sources/distinctive_properties.ts)

Important detail: BotD's error-stack detector checks for PhantomJS, not a general Playwright/CDP stack probe. Do not describe that existing detector as a modern debugger-attachment detector. [Error-stack detector](https://raw.githubusercontent.com/fingerprintjs/BotD/main/src/detectors/error_trace.ts)

**Tested adaptation:** the lab now bundles BotD 2.0.0 locally, disables optional monitoring, and withholds the canvas before rendering when it detects automation. The benchmark asserts that the page sends no external requests. In headed Chrome 154, BotD flags stock Playwright and refuses the action. Both the preload property override and the browser configuration suppressing the automation marker return `bot: false`, expose the reference, and complete the action. Adding the existing trusted-input and activation checks does not stop those bypasses. The classifier's `headless_chrome` label for stock Playwright is a library verdict; this benchmark uses headed Chrome. [Measured results](botd-results.json).

The BotD policies are available at `/automation-lab.html?policy=botd` and `?policy=botd-combined`. `npm run benchmark:automation` now exercises 18 client/policy combinations. Ordinary human Chrome false positives were not measured. The library is an experimental development dependency, not production enforcement or a capture blocker. The monitoring option follows the [official API](https://github.com/fingerprintjs/BotD/blob/main/docs/api.md).

## AI Browser Guard: useful ideas with an extension boundary

The project documents three detection layers: extension debugger-target monitoring, V8 stack patterns, and environment fingerprinting. Playwright classification includes debugger attachment and UtilityScript stack patterns. Its README explicitly limits action enforcement to best-effort page/injected automation; external CDP uses native input and bypasses page-realm policy. The documented hard stop is closing the tab, and a persistent driver can reopen it. It also admits no real Playwright harness currently validates its stack pattern, so detection claims need independent tests. Repository licensing is Apache-2.0. [AI Browser Guard README](https://github.com/opena2a-org/ai-browserguard)

The inspected extension manifest requests debugger/downloads permissions, installs a background service worker, and injects scripts at document start, including main-world code. Those privileged debugger and tab controls are not available to a website's npm bundle. Its fingerprint and stack-pattern ideas are candidates to independently reproduce in a browser page, but an npm package cannot inherit extension-level detection/enforcement. [Extension manifest](https://raw.githubusercontent.com/opena2a-org/AI-BrowserGuard/main/manifest.json)

**Source review and tested adaptation:** the source was subsequently retrieved at commit `bc33c1d05bf52f0c96abe7c66cf7f802a7a0c7b3`. Its V8 trap inspects frames when an error stack is formatted. This is an execution condition, not a notification that any CDP operation occurred. The local independently written probe uses that mechanism and a separate console-serialization getter experiment. [Reviewed stack implementation](https://github.com/opena2a-org/ai-browserguard/blob/bc33c1d05bf52f0c96abe7c66cf7f802a7a0c7b3/src/detection/stack-trace.ts).

`npm run benchmark:stack` measures stock Playwright and the browser-flag bypass in eight fresh pages. Both configurations trigger the framework signature when evaluating an application function that creates and formats an error stack. Neither triggers it for a compositor screenshot, a native Playwright button click, or ordinary evaluation of the page title. The serialization getter is never read in these trials. [Measured results](stack-probe-results.json).

This confirms a useful narrow execution signal but rejects the interpretation that the page can reliably detect attached automation or screenshots with it. The probe changes global error formatting and is isolated in `/stack-probe.html`; it is not enabled in the main app. Human DevTools false positives and other Chrome versions remain untested.

## Anubis: reference architecture, outside current delivery constraints

Anubis describes itself as a web AI firewall protecting upstream resources with challenges. It is a server-side access-control/challenge system rather than a client-only screenshot inhibitor. Its documented deployment and proof-of-work architecture require a server-side decision and computation before content access; moving only its client solver into an npm wrapper would remove that enforcement boundary and impose cost on humans too. It is not a zero-extra-server drop-in for this scope. [Anubis repository](https://github.com/TecharoHQ/anubis)

**Candidate:** none for the current package. Keep as a comparison if scope later allows a reverse proxy or existing-backend integration. No licensing or maintenance assurance is asserted here beyond the reviewed architecture.

## Visual/UI adversarial approaches: research-only candidates

The authors of *Are GUI Agents Focused Enough?* study black-box overlays of harmless UI elements that redirect visual grounding. They report results across multiple agent families and provide public code. This establishes a research direction for task deterrence, not screenshot exclusion or guaranteed human usability. Such overlays visibly alter the UI and can distract humans, so they conflict with preserved appearance unless a human study finds an acceptable bounded change. [Author paper](https://arxiv.org/abs/2604.07831)

**Candidate:** compare a small optional visual perturbation against unchanged canvas in a sandbox action benchmark. Measure actual model task completion, manual user mistakes, readability, and latency. Do not use malicious instructions, exfiltration, false transaction details, or deceptive irreversible actions. Keep deterministic task data and observable outcomes.

## Recommended order

1. BotD plus a webdriver-only control: lowest integration cost and directly compatible with a locally bundled npm runtime.
2. Explicit canvas controls: compare DOM/role-based task success with screenshot-based success using the existing approved browser seam.
3. Independent experimental stack probe: proceed only if repeated modern Chrome measurements show additional detection beyond BotD.
4. Visual perturbation: research branch with a separate human-usability gate.

For every candidate, run stock Playwright, the same browser with automation launch signals reduced, preload overrides, and a full JS/CDP adversarial driver. Log detector results, screenshots, actual action completion, and bypass details separately. Include human Chrome with DevTools open to catch debugger-related false positives. All candidate enforcement runs in the client's environment, so publish measured resistance against named configurations instead of promising control over a hostile browser.
