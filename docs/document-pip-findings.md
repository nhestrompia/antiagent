# Document Picture-in-Picture target boundary

Document Picture-in-Picture can move arbitrary HTML into a separate window. This experiment tests that display boundary on desktop Chrome. It does not integrate PiP into the full defense stack. The fixture uses randomized choices and validates trusted clicks against private task state.

## Result

The opener's screenshots omitted the task controls in all three sessions. Chrome exposed a new CDP target of type `page`, with URL `about:blank`. The client discovered it through `Target.getTargets` and attached directly.

The client captured that target, recognized each requested choice, and sent trusted mouse input. It completed all three original fixture actions in **3/3 sessions**. The opener recorded three trusted clicks and completion. The command records contain no Runtime, Debugger, or DOM commands. See [the results](document-pip-results.json).

This establishes an accessible screenshot/input route through the separate target. Hiding controls from a client that captures only the opener would be an incomplete test. PiP target separation does not prevent an adaptive CDP agent on the tested Chrome version.

The benchmark closes the PiP target and removes its temporary browser profile. It uses a fresh visible Chrome session for each trial. Run `npm run benchmark:document-pip` to repeat it. Add `--require-blocking` to reject successful agent sessions.

## Corrected test conditions

The earlier driver inherited the launcher's headless default. Its results remain in `document-pip-headless-pilot-results.json`. They were incorrectly described as visible trials. The current driver explicitly sets `headless:false` and records that condition.

The visible repeat also required Retina coordinate conversion. The PiP screenshot was 1040 by 700 pixels, while its CSS viewport was 520 by 350. Input now uses `Page.getLayoutMetrics` to map OCR positions into CSS coordinates. The earlier coordinate failures remain in `document-pip-visible-coordinate-pilot-results.json`. They were client failures, not protection.

The corrected visible repeat completed three sessions. A server-unavailable attempt remains in `document-pip-visible-server-pilot-results.json`. Navigation errors now fail immediately. None of these pilot failures counts as a block.

## Scope

This is a standalone boundary fixture, not another measurement of the full stack. It does not claim human usability, OS capture exclusion, mobile behavior, or protection on another browser. Those checks are unnecessary to reject this candidate once the direct target route succeeds.

[Chrome's API guide](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) documents the separate same-origin window and user-gesture requirement. The local test confirms that trusted CDP input can supply that gesture on this machine. It also confirms capture and input on the resulting target. The existing layered bypass remains unchanged.

The build, JavaScript syntax checks, and diff check passed. The existing DRM bundle still produces a large-chunk build warning.
