# Headless blocking scope

Blocking known headless signals can reject basic automated clients. It does not exclude agents that run a visible browser. The native-select matrix explicitly calls `launchRawCDP({headless:false})`: the successful focus-only and heap clients already operate in visible Chrome.

[Playwright's library documentation](https://playwright.dev/docs/library) supports visible browser operation with `headless: false`. [Chrome's automation documentation](https://developer.chrome.com/docs/automation-and-testing) states that modern headless mode shares the browser implementation with visible Chrome. Neither mode is a proof of human control.

Our raw client disables Blink's automation indicator at launch. This is a deliberate adversarial test configuration, not a claim that all automation does this. A page cannot treat a missing indicator as proof that no client controls the browser.

Headless detection may be one risk signal in an automation filter. The existing successful visible-browser clients are counterexamples to the claim that rejecting every headless browser would make this application agent-proof. No package-wide headless-only blocking policy is introduced by this finding.
