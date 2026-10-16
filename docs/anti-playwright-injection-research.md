# Anti-Playwright injection research

Researched 2026-10-13. The credible GitHub candidates found are **detectors of automation/tampering**, not a verified ordinary-page mechanism that prevents privileged Playwright initialization or debugger evaluation.

## CSP and Trusted Types: actual enforcement boundary

Playwright's own test `should work with CSP` installs an initialization script under a restrictive script source policy and verifies it executes. The same test verifies an unapproved inline script tag fails. This is direct source evidence that page script policy and privileged initialization are different paths, without enabling `bypassCSP`. [Playwright source test](https://raw.githubusercontent.com/microsoft/playwright/main/tests/page/page-add-init-script.spec.ts)

Trusted Types enforces typed values at dangerous string injection sinks, such as HTML/script creation paths. Its stated goal is preventing vulnerabilities from attacker-controlled inputs, not excluding a browser debugger or classifying humans. A successful CDP evaluation that modifies a global/property need not invoke a Trusted Types sink at all. Specific sink calls can still fail inside an injected script. [Trusted Types specification](https://www.w3.org/TR/trusted-types/)

The local Chrome 155.0.8059.40 experiment with `bypassCSP:false` confirms that distinction for nonce-only CSP and CSP plus Trusted Types: initialization and debugger evaluation executed; unapproved inline scripts, page-owned eval, and script-tag insertion failed. This validates policy enforcement without validating debugger exclusion. [Local evidence](injection-policy-results.json)

## CreepJS: strongest source-reviewed tampering candidate

The reviewed `src/lies/index.ts` creates cross-frame comparison realms, examines native function string forms, own descriptors/keys, prototype structure, illegal invocation/TypeError behavior, and Proxy-related anomalies. It records which APIs fail these consistency checks. This can detect simplistic preloads that redefine webdriver/getters or native functions; it does not stop those preloads from executing first, and it does not provide a screenshot veto. Some checks temporarily alter prototype structure and restore it, so blanket deployment needs performance/compatibility review. Its iframe construction uses `innerHTML`, requiring adaptation or an approved policy under strict Trusted Types. [CreepJS lie detector source](https://raw.githubusercontent.com/abrahamjuliot/creepjs/master/src/lies/index.ts)

CreepJS's license is MIT. Preserve its notice when adapting source; do not import the entire fingerprinting product just to test a few API-integrity checks. [CreepJS license](https://raw.githubusercontent.com/abrahamjuliot/creepjs/master/LICENSE)

**Recommended experiment:** add a small independent diagnostic using descriptor placement, fresh-realm native references, native string shape, and getter receiver-error behavior. Compare unmodified Chrome, a simple webdriver preload, a Proxy/native-string disguise preload, and a preload that instruments child realms. Measure whether the diagnostic adds information beyond BotD, and measure legitimate extension/framework false positives. A clean diagnostic does not prove absence of debugger automation.

## auto-browser-detector: catalog lead, source verification incomplete

`tylergets/auto-browser-detector` is described by its own indexed GitHub result as a catalog of known automation/agent-browser detection methods with Playwright tests and a live report. The repo page, raw README/package files, and source tree did not resolve through the research browser despite retries. Its individual methods, license, and test coverage therefore were **not verified** here. Treat it as a follow-up catalog, not evidence that injection can be blocked. [Repository](https://github.com/tylergets/auto-browser-detector)

## disable-devtool: detection and shortcut suppression

This npm project documents keyboard/context-menu suppression, monitoring probes, optional redirection/closing, and disabling copy/paste/selection. Its README also explicitly describes false triggers and cases where no probe triggers, with no universal diagnostic. These are user-facing DevTools deterrents and heuristics; the reviewed documentation does not establish prevention of Playwright/CDP injection. Disabling ordinary shortcuts and clipboard behavior conflicts with Anti-Agent's human usability goal. Use diagnostic callbacks only if benchmarking this project. Repository licensing is MIT. [disable-devtool README](https://github.com/theajack/disable-devtool)

## What to benchmark next

Keep three results separate: whether code was prevented from executing, whether tampering was detected, and whether the protected task was completed. CSP/Trusted Types deserve their ordinary application-security role, but source and live evidence rule out using the tested policies as an addInitScript blocker. The most useful next candidate is narrow CreepJS-inspired integrity diagnostics combined with the already measured canvas/closed-root task seam. Test early preload, debugger evaluation, locator interaction, screenshots, and coordinate input independently; don't convert a detector into a claimed enforcement boundary.
