# CSP and Playwright injection

Run `node scripts/benchmark-injection-policy.mjs`. This creates two isolated pages using route-provided HTML and response policies. It requires Chrome and the existing development server origin. No new service is deployed.

Both pages used nonce-only script-src without unsafe-eval. The second also required Trusted Types for script and disallowed Trusted Types policies. Playwright bypassCSP was not enabled.

Positive controls proved enforcement: the approved nonce script ran, the unapproved inline script did not, page eval raised EvalError, and addScriptTag did not execute its content. Despite that enforcement, Playwright addInitScript and page.evaluate executed in both pages.

CSP blocks specified web-content script paths. It did not block the privileged browser injection path in this test. Trusted Types did not change that result. These policies remain useful against ordinary script injection, but are not established anti-Playwright controls.

Results: [injection-policy-results.json](injection-policy-results.json). Repository survey: [anti-playwright-injection-research.md](anti-playwright-injection-research.md).

Upstream Playwright includes its own should-work-with-CSP init-script test: [official test source](https://github.com/microsoft/playwright/blob/main/tests/page/page-add-init-script.spec.ts). This provides an independent primary example of the distinction between blocked script tags and successful init scripts.
