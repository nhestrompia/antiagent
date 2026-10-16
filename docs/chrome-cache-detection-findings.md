# Chrome cache behavior as an automation signal

Two new experiments test browser behavior instead of the webdriver marker. They use visible installed Chrome, fresh temporary profiles, and test-owned HTTP pages without Vite or its development WebSocket. Page scripts collect their own results. Raw CDP trials use no Runtime or Debugger commands.

## Back/forward cache

The page starts black, navigates away, then returns through history. It shows a token and action only if pageshow.persisted is true. This gives the proposed detector a chance to hide content before the first useful frame.

| Condition | Trials | Restored from cache | Readable token and accepted action |
| --- | ---: | ---: | ---: |
| Ordinary Chrome, no debugging connection | 3 | 3 | Not captured |
| Ordinary Chrome, cache disabled by launch flag | 3 | 0 | Not captured |
| Bare page-target CDP attached | 3 | 3 | 3 |
| CDP detached during the roundtrip | 3 | 3 | 3 |
| Active CDP screenshots, repeat | 3 | 3 | 3 |
| Marker-disabled Playwright, default cache setting | 3 | 0 | 0 |
| Marker-disabled Playwright, cache-disable argument removed | 3 | 3 | 3 |

This detects a Playwright launch setting, not every controller. The cache-disabled no-debugging control also fails the proposed gate. The public reason field returned null in these reports and supplied no unique CDP identity.

The original active-capture group had two valid successes and one protocol error during navigation. That error was not a block. The repeat handles and logs only the known transient inactive-page error, then checks the final actual screenshot and input. All three repeat cases restored, exposed the token, and accepted input. Other errors still fail the harness.

## Prerendering

The second page starts without useful content, requests same-origin prerendering, and navigates to its destination after two seconds. The destination allows content only after an actual prerender activation with activationStart greater than zero. No-debugging runs use no browser automation connection. Their results are page self-reports, not native screenshot or human usability tests.

The source supplies a concrete condition: Chromium rejects prerendering when a page has a DevTools session without tab-target support. It checks session type rather than Runtime enablement. A modern tab-target session can avoid that branch. [Eligibility check](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/devtools_instrumentation.cc#1040), [session predicate](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/render_frame_devtools_agent_host.cc#1210).

Final Chrome 155.0.8059.80 results:

| Condition | Trials | Prerender activated | Readable token and accepted action |
| --- | ---: | ---: | ---: |
| Ordinary Chrome, no debugging connection | 3 | 3 | Not captured |
| Ordinary Chrome, preloading disabled in its test profile | 3 | 0 | Not captured |
| Legacy page-target CDP attached | 3 | 0 | 0 |
| Legacy CDP with active screenshots | 3 | 0 | 0 |
| Browser-level CDP only during preflight, page attachment afterward | 3 | 3 | 3 |
| Modern tab-target CDP during preflight, activated-page attachment afterward | 3 | 3 | 3 |

The ordinary preloading-disabled control used a fresh test profile with net.network_prediction_options set to 2. It had no remote-debugging flag or browser automation connection. This is a measured false positive for a mandatory prerender gate. It does not change the user's normal profile. Source defines 2 as disabled. [Preference values](https://chromium.googlesource.com/chromium/src/+/155.0.8059.80/chrome/browser/preloading/preloading_prefs.h).

The gate did block legacy attached clients before useful pixels appeared. The successful adapted clients recovered actual token text through Vision OCR and completed the action through browser input. No Runtime or Debugger commands were used. The tab-target route maintained its tab session, then located and attached to the activated destination page for capture; it did not assume the earlier page session survived activation.

The adaptive client can also keep only its browser-level connection during preflight. It opens the page without a page-target session, waits for activation, and attaches for capture and input afterward. The page's earlier eligibility result cannot prove that no client attaches later.

The first prerender pilot lost modern page sessions when activation changed targets. Those three errors were inconclusive. The corrected client locates the activated destination target before capture. The pilot's detach-after-rules strategy also raced the eligibility decision; the final detached strategy has no page-target session during setup.

## Combined gate

A further nine trials required both prerender activation and a history-cache restore before showing the token. Ordinary no-debugging controls passed both in 3/3 page reports. The browser-only preflight CDP client and the modern tab-target client each passed both, obtained readable screenshots, and completed the action in 3/3. Their command logs contained no Runtime or Debugger commands. These are tests of the two new gates together, not a rerun of every earlier application layer.

Run `npm run benchmark:prerender-detection -- --combined` for that case. Its evidence stays under `artifacts/prerender-cache-combined`.

## Scope and reproduction

These tests are small controlled probes. They do not install a new gate in the full application. The local renderer includes a known test token in JavaScript, so this is screenshot/action testing, not protection from source extraction. Focus and visibility are recorded; continuous OS focus is not controlled. Platform, profile, memory, and power settings affect eligibility. Chrome documents that prerender requests are hints that can be declined for ordinary reasons. [Chrome prerender limits](https://developer.chrome.com/docs/web-platform/prerender-pages/).

Run npm run benchmark:bfcache-detection or npm run benchmark:prerender-detection. Add -- --capture-only for the bounded cache capture repeat. The harnesses create their own temporary HTTP servers. Vision OCR must be installed at /private/tmp/anti-agent-ocr. Raw evidence remains under artifacts/bfcache-detection and artifacts/prerender-detection.

Browserbase source research is separate in browserbase-detection-review.md. Its live service was not tested; the user chose to keep this work focused on Chrome.

## Decision

Neither gate enters the application by default. Prerendering adds a real conditional signal against legacy CDP clients, but both adapted CDP routes bypass it and a normal browser setting triggers it. The cache gate similarly catches a removable Playwright launch argument. These results reject perfect detection through either mechanism, alone or as a requirement that both succeed.
