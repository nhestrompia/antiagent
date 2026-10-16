# CDP detection leads

Update: the [endpoint and coordinate experiments](cdp-multiple-angle-findings.md) now test both leads. Neither establishes an attachment detector.

Reviewed 2026-10-16. Target: desktop Chrome 155, with Runtime and Debugger disabled. A human may be blocked while CDP is active. That removes a usability constraint; it does not make every automation fingerprint a test for an attached session.

## Known-port listener probe

This is a distinct candidate, but its scope is narrow. A page could try a known loopback debugging port and compare response or error behavior. It would seek a listening service, not a JavaScript debugging side effect.

Chrome's local-network permission applies to public-site requests to loopback. The Chrome 142 release notes explicitly describe this gate. Fetch-based probing therefore cannot assume silent access in Chrome 155. The earlier Chrome 138 announcement says WebSockets were not yet covered; that historical exception is not proof of Chrome 155 behavior. [Chrome 142 notes](https://developer.chrome.com/release-notes/142#local_network_access_restrictions), [original LNA announcement](https://developer.chrome.com/blog/local-network-access).

There are further limits in the pinned Chrome 155 debugging server:

- Lines 818–830 reject WebSocket requests with an Origin outside `remote-allow-origins`. Browser page JavaScript supplies an Origin; a native CDP client need not supply one.
- `SendJson`, lines 948–971, sets JSON content type and `frame-ancestors 'none'`. It supplies no CORS allow-origin header. A cross-origin page cannot assume it can read `/json/version` and validate a Chrome-specific signature.

[Pinned server, Chrome 155 commit cfaadc5a132d78e1828635aa8405a499f3e14864](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/devtools_http_handler.cc#818).

Hypothesis: an opaque fetch result or load/error timing could distinguish a listener from a closed port in some deployments. This needs a live test on the app's actual origin. Such a result would not authenticate CDP, nor distinguish enabled-but-idle debugging from an active client. A random port or pipe has no required fixed-port signature. The protocol documents both port and pipe transports. [Official protocol transport documentation](https://chromedevtools.github.io/devtools-protocol/).

One useful, bounded experiment remains: probe only a test-owned known port, with no broad scan. Compare no listener, idle CDP listener, attached bare client, and an unrelated HTTP listener. Run from the app origin without permission or browser flags that relax access. Readable Chrome JSON would establish the listener; opaque differences would establish only the measured distinction. Equal idle/attached results would reject active-session detection by that probe.

## Claims traced to original project code

Brotector's source does not show a bare-attachment test. Its Runtime test logs an Error with stack/name accessors and uses worker `debugger` timing. Its pointer test checks `pageX==screenX && pageY==screenY`, with a fullscreen exception. Its PDF test reads an injected PDF iframe's style. Its other checks inspect driver globals, injected-script stacks, UA overrides, and a mouse-visualizer wrapper. [Project implementation](https://raw.githubusercontent.com/ttlns/brotector/master/brotector.js), [author's stated detection categories](https://github.com/ttlns/brotector#detections).

These are original implementations worth testing against the driver modes they target. They do not establish attachment detection when the client sends only screenshot and input commands. The coordinate equality test is a concrete input candidate if this browser still emits that bug, but it needs physical-input controls, a normal window, scroll offsets, and raw CDP trials. It is not an attachment test and can be platform/version dependent.

## Current conclusion

This search found no new established signal for an idle bare CDP attachment. It found a bounded listener-probe experiment and a legacy input-coordinate check. Neither is a proven gate for this app. A repeatable page-visible transition caused by attach/detach alone, without enabling other domains, would change this conclusion. Tests must include idle listening, attached idle, and active capture/input as separate states.
