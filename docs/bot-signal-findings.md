# Browser detector benchmark

This experiment pins `bot-signal` 2.0.18 as a development dependency. The fixture uses `detectInstantClientAsync(window)` with default options and gates trusted pointer activation on its documented `isLegitClient` verdict. Compact diagnostics preserve the verdict, score, triggered signals, and framework/CDP flags. It does not replace or falsify any result.

The client captures the screen, finds Harbor Research through local OCR, and sends mouse input to the visible canvas. The raw client performs no Runtime or Debugger operations. It launches Chrome with the Blink automation marker disabled; the page's native getters are not patched. Headed and headless modes use separate fresh profiles. Actual Playwright controls use the installed Chrome channel, once with default launch configuration and once with the same marker-disable flag.

The results are in `bot-signal-results.json`. Default Playwright and headless raw Chrome were blocked 3/3 each. Visible raw CDP returned zero suspicion and completed 3/3. Marker-disabled visible Playwright also returned zero suspicion and completed 3/3 using normal page screenshot and mouse APIs.

Run `npm run benchmark:bot-signal`. Add `-- --require-blocking` to demand zero completed actions; the strict gate fails whenever a measured client succeeds. A passing expected-outcome matrix is not an agent-proof result.

The fixture is served by Vite during development. Its direct node_modules browser import is not a packaged public API. Production packaging and legitimate-human false positives are not validated by this benchmark. Behavioral and server signals are not part of this instant-browser experiment.

The [project's own README](https://github.com/okasi/bot-signal) describes probabilistic automation attribution. The independent source review in `anti-crawler-project-source-review.md` compares this approach with server challenges and crawler traps. Detecting default framework artifacts is useful; a negative classifier verdict is not authenticated human identity.
