# CDP enforcement boundary follow-up

Researched 2026-10-14 against current primary sources. This follows [browser-enforced-capture-research.md](browser-enforced-capture-research.md). No browser policy was installed or tested.

## What the page can control

The current `Page.captureScreenshot` protocol takes format, quality, clip, surface, viewport, and encoding options and returns image bytes. It defines no document permission, approval callback, or page-visible capture event. This supports a narrow finding: the reviewed protocol offers no page-owned screenshot veto. It is not a proof that every browser implementation has no observable side effect. [Protocol definition](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Page.pdl)

Chromium's browser-process `PageHandler::CaptureScreenshot` validates the target and parameters, keeps frames available, then calls `RenderWidgetHostImpl::GetSnapshotFromBrowser`. The inspected path does not ask the document for consent or execute a cancellable page event. Its `is_trusted_` check restricts a debugger client's window-capture mode; it is not the DOM event's `isTrusted` property and still permits surface capture. Inference: patching `canvas.toDataURL`, replacing page JavaScript functions, or catching DOM events cannot intercept this browser-process command. [Chromium screenshot handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/page_handler.cc)

`Input.dispatchMouseEvent` lets the debugger provide coordinates, event type, timestamp, buttons, click count, pressure, and pointer type. Chromium constructs a `WebMouseEvent` and forwards it through the widget input path. Inference: rejecting a particular timing or pointer pattern can stop that pattern, but the reviewed command supplies no page-readable, unforgeable assertion that a physical human supplied the input. Normal application handlers can reject actions; that is separate from denying debugger access. [Input protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl), [Chromium input handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/input_handler.cc)

## What browser administration can control

`RemoteDebuggingAllowed=false` prevents remote debugging. Its desktop scope explicitly includes `--remote-debugging-port` and `--remote-debugging-pipe`. The default is enabled. This is a browser management setting, not an application response header. [Chromium policy definition](https://raw.githubusercontent.com/chromium/chromium/main/components/policy/resources/templates/policy_definitions/Miscellaneous/RemoteDebuggingAllowed.yaml)

`DeveloperToolsAvailability=2` disallows DevTools and target inspection. Current policy documentation explicitly covers direct CDP and `chrome.debugger`. It distinguishes startup control by `RemoteDebuggingAllowed` from per-target inspection restrictions. URL allowlists and blocklists override the fallback setting, so configuration must inspect those policies too. Documentation on Chromium main must not be treated as proof that a particular installed Chrome version enforces every recently added path. [Chromium policy definition](https://raw.githubusercontent.com/chromium/chromium/main/components/policy/resources/templates/policy_definitions/Miscellaneous/DeveloperToolsAvailability.yaml)

## Consequence for this application

The page cannot claim agent-proof access by checking screenshot or input APIs it does not own. A managed browser can remove the documented CDP access route, provided the operator controls policy and verifies the actual browser/version. That is a different deployment boundary. It does not establish protection against OS capture, OS input automation, an attacker-controlled browser, or external cameras. Those require separate enforcement and tests.

The user reconfirmed npm-package-only deployment with no server, native component, managed browser, or extra user steps. Browser management is therefore outside the authorized solution. For that scope, this research establishes no page-owned enforcement mechanism that closes the capture/input route. Successful screenshot-driven completion remains a bypass, regardless of how many scripted attack patterns the page rejects.

If deployment scope changes later, browser enforcement needs a positive control: prove capture and input work with debugging permitted; prove debugger startup or attachment fails under the intended policies; then separately test desktop capture and input. This is an excluded future experiment, not work required of the current npm package.
