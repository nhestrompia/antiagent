# CDP controls without OS changes

Researched 2026-10-14. Avoiding OS configuration is different from retaining an ordinary browser-only npm package: a custom browser, extension, or Electron host changes who controls the browser even if no OS policy is installed.

## Ordinary website

No reviewed CSP or Permissions Policy directive lets a document disable debugger attachment. CSP governs document resource/execution policy; Permissions Policy governs defined web features. Neither reviewed specification supplies a `devtools` or CDP veto. This is a finding about supported directives, not a claim that every future browser feature is impossible. [CSP](https://www.w3.org/TR/CSP3/), [Permissions Policy](https://www.w3.org/TR/permissions-policy-1/)

`Permissions-Policy: display-capture=()` prevents the document from calling the policy-controlled `getDisplayMedia` feature. It does not mark that document's displayed pixels as unavailable to browser-process `Page.captureScreenshot`. A capturer-side web permission and privileged debugger capture are separate paths. [Screen Capture specification](https://www.w3.org/TR/screen-capture/#permissions-policy-integration), [Chromium screenshot implementation](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/page_handler.cc)

disable-devtool intercepts shortcuts/context-menu access and detects console serialization, window-size, timing, and debugger-library patterns, then reacts within the page. Its documentation lists configurable bypass/suspension/ignore mechanisms. These are page-level probes and reactions, not a browser-process debugger gate. The project's broad “disable all access” wording is not evidence that it rejects silent CDP screenshot/input/heap acquisition. [Project documentation](https://raw.githubusercontent.com/theajack/disable-devtool/master/README.md)

## Browser or host control

Chrome 136 restricts remote-debugging port/pipe use with the default data directory. Chrome explicitly permits a separate `--user-data-dir` and recommends Chrome for Testing for automation. This protects an existing default profile; it does not prevent an attacker from loading the application in a separately launched browser. [Chrome announcement](https://developer.chrome.com/blog/remote-debugging-port)

A launcher can omit debugging switches from a browser instance it owns. That removes a deliberately exposed transport in that instance, but the page cannot compel arbitrary clients to use that launcher or prevent them opening another instance. It is a browser deployment constraint, not a transferable HTTP-header setting.

Electron provides `webPreferences.devTools=false`, documented as preventing `webContents.openDevTools()`. Electron separately supports `--remote-debugging-port` and a main-process Debugger transport. Therefore `devTools=false` alone is not documented as denying all CDP. A controlled host could avoid exposing debugging transports and constrain its browser delegate, but that needs implementation and attachment tests. Installing/running an Electron host changes the current npm-in-ordinary-browser scope. [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window), [Switches](https://www.electronjs.org/docs/latest/api/command-line-switches), [Debugger](https://www.electronjs.org/docs/latest/api/debugger)

## An extension does not occupy a universal debugger lock

`chrome.debugger` is a privileged CDP transport requiring an installed extension's debugger permission. Current Chromium extension attachment calls `DevToolsAgentHost::AttachClient`. The generic host maintains multiple sessions and rejects repeat attachment by the same client, rather than universally rejecting a second distinct client. Inference: attaching a defensive extension is not evidence that it monopolizes a target against every remote client. Exact coexistence and target-specific restrictions require live verification; an extension also changes installation scope. [Chrome API](https://developer.chrome.com/docs/extensions/reference/api/debugger), [Extension attachment source](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/extensions/api/debugger/debugger_api.cc), [Agent-host session source](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/devtools_agent_host_impl.cc)

The supported enforcement owner remains the browser/host. Browser-management policies reviewed in [the earlier boundary report](cdp-enforcement-boundary-followup.md) provide actual startup/inspection controls, but are excluded by the user's scope. No reviewed website-only mechanism prevents active CDP. No alternative above was configured or tested here, and none is a claim of resistance to native screen/input agents.
