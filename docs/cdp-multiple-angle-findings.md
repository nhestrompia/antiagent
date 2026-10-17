# Endpoint and input-coordinate detector tests

Tested 2026-10-16 in visible Chrome `155.0.8059.80` on the local Mac. These tests examine two concrete leads from the [source search](cdp-detection-leads-2026-10-16.md). They do not use Runtime or Debugger.

## Local endpoint

The page probes three test-owned ports: Chrome's debugging listener, an unrelated JSON HTTP server, and a closed port. The test supplies every port to the page. This is a best-case known-port experiment, not port discovery or a port scan. The unrelated server is a test fixture, not a package dependency.

Three fresh browsers run with no page-target attachment during measurement. Three run with the page target attached. Both groups retain a browser-level CDP connection. No browser access restriction is relaxed, and no local-network permission is granted.

| Endpoint | CORS fetch | No-CORS fetch | Attached versus detached |
| --- | --- | --- | --- |
| CDP listener | TypeError | Opaque response, status zero | Same outcome in all six trials |
| Unrelated JSON server | TypeError | Opaque response, status zero | Same outcome in all six trials |
| Closed port | TypeError | TypeError | Same outcome in all six trials |

The page detects a reachable listener with no-CORS fetch in this environment. It cannot read a Chrome signature or distinguish CDP from the unrelated server. The result does not identify an attached client. Timing varies across trials; no stable timing classifier is established.

The app origin is loopback, `http://127.0.0.1:5173`. A public production origin has different local-network restrictions. Random debugging ports and pipe transports also limit deployment. The [source review](cdp-detection-leads-2026-10-16.md) covers those restrictions. This test does not establish a silent public-site detector.

Run `npm run benchmark:endpoint-probe`. See [six final trials](endpoint-probe-results.json). The failed server-down pilot remains separate. The driver now checks the fixture origin before launching Chrome.

## Input coordinates

The legacy Brotector check expects `pageX == screenX` and `pageY == screenY` outside fullscreen. The fixture records trusted pointer and mouse movement in a normal window. It crosses viewport emulation on/off with scrolling on/off, three times each.

All 12 final cases passed their measurement checks. No recorded event satisfied the equality check. For example, a move to client coordinates 160,180 produced screen coordinates 320,367. Scrolling changed page coordinates while the screen offset remained plausible. Movement deltas also updated. These results reject that equality check as a necessary signature of raw CDP input on this browser.

No physical-human baseline was collected. It is unnecessary to show that these CDP events evade this exact check. It remains necessary before claiming that another field distinguishes human input. This fixture measures events, not completion of the layered app.

The initial readiness and layout pilots remain separate. An early mouse event could replace the readiness title, and scroll positions could change before layout settled. The corrected fixture delays readiness and records the actual scroll position. No failed initialization or control counts as prevention.

Run `npm run benchmark:input-coordinates`. See [12 final trials](input-coordinate-results.json). The separate [attachment-task review](cdp-attachment-side-effects-review.md) identifies another source-backed lead, independent of endpoint probing and input coordinates.
