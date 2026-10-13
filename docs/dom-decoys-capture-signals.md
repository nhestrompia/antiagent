# Invisible DOM decoys and capture signals

Researched 2026-10-13 using official specifications and browser/framework documentation. No implementation or live-test results are claimed here.

## Invisible does not mean unclickable to Playwright

Playwright explicitly considers an element with `opacity:0` visible when it has a nonempty bounding box and is not `visibility:hidden`. `display:none`, zero-size elements, and `visibility:hidden` fail its visibility check. A normal locator click must also resolve to one element, remain stable, receive pointer events at the action point, and be enabled. An invisible decoy can therefore receive a stock locator click if it remains hit-testable; a hidden or pointer-inert decoy has different behavior. [Playwright actionability](https://playwright.dev/docs/actionability)

This supports a precise experiment: compare opacity-zero, display-none, offscreen, and pointer-inert decoys using identical business-looking labels. Measure what DOM selectors, text/role locators, accessibility snapshots, and screenshots expose, and whether actual actions hit the decoy. Opacity-zero alone must not be advertised as a bot-only interaction surface: it can intercept a human's pointer, and keyboard focus or assistive technology may also expose it.

WAI-ARIA distinguishes exclusion from the accessibility tree from visual presentation. `aria-hidden` is not a generic permission barrier against DOM inspection. Removing a decoy from accessibility exposure also removes a channel that some agents use, so it may reduce both false positives and intended detection. Design and verify keyboard/screen-reader behavior rather than assuming visually invisible content is invisible to humans using assistive technology. [WAI-ARIA hidden state](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden)

Decoy activation is evidence of an interaction with that element, not proof of automation. A DOM agent can inspect styles and skip decoys, while a screenshot agent may never see them. Any useful protection claim must therefore be a task-completion or detection measurement against named agent configurations, not screenshot blocking.

## Is there a screenshot notification or veto?

| Capture path | What the captured website can rely on |
| --- | --- |
| CDP `Page.captureScreenshot` / browser automation | The command returns encoded image data to its privileged caller; no page consent, cancellation callback, or DOM screenshot-start event is specified. |
| Native macOS screenshot or recording | No reviewed ordinary-web API reports that capture to page JavaScript. Native protected video layers are a separate browser/OS mechanism. |
| Another page's `getDisplayMedia` | User/browser consent controls capture. The captured page has no general notification merely from being selected. |
| This page's own `getDisplayMedia` | It receives the stream it requested and can observe/control its own tracks; that says nothing about other capture sessions. |

The CDP screenshot contract has screenshot options and an image return value, but no document veto. Browser-protocol notifications are not DOM events delivered to the captured application. Page script that wraps canvas exports or listens for PrintScreen cannot intercept an independent CDP command. [Official CDP protocol definition](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json)

Chrome's Capture Handle documentation is explicit: the captured web app does not know it is being captured unless the capturing app cooperates by using handle information to communicate. `capturehandlechange` belongs to the capturing side's MediaStreamTrack and reflects handle changes/navigation, not a captured-page screenshot event. Limiting permitted origins limits handle disclosure, not capture permission. [Chrome Capture Handle](https://developer.chrome.com/docs/web-platform/capture-handle)

The Screen Capture specification's `display-capture` permissions policy controls whether documents may **call** `getDisplayMedia`; it does not make that document ineligible to appear in another capture. It requires user consent for the capture API and describes browser indicators, not a page-wide native/CDP capture notification. [W3C Screen Capture](https://www.w3.org/TR/screen-capture/)

Element Capture allows a cooperating capturing app to restrict its own self-capture video track to an eligible element. It is not a way for an unrelated captured website to force cropping or exclude itself. [Chrome Element Capture](https://developer.chrome.com/docs/web-platform/element-capture)

Apple's native AVSampleBufferDisplayLayer `preventsCapture` property protects a media layer. It is not exposed as a JavaScript event or ordinary page screenshot veto. Native media protection should remain separately measured from application capture signals. [Apple preventsCapture](https://developer.apple.com/documentation/avfoundation/avsamplebufferdisplaylayer/preventscapture)

## Recommended verification

Record decoy hits separately from screenshot success. Include stock Playwright locators, a DOM agent filtering computed style, accessibility-based observation, screenshot-only coordinate input, keyboard navigation, and manual pointer use. Place no real operation behind a decoy. Use only reversible local outcomes and require zero human decoy activation before considering a detection gate.

For capture-signal experiments, log actual documented events and compare before/after native screenshot, CDP screenshot, and cooperative tab sharing. Treat timing, focus, visibility, or console-serialization changes only as heuristics requiring a positive control; none establishes a universal screenshot notification or blocking hook.

## Additional browser-only candidates

**Closed Shadow DOM is the strongest cheap next locator-deterrence experiment.** Playwright explicitly says its locators do not support closed-mode roots. A protected region built inside a closed root could therefore defeat stock role/text/CSS locators while retaining native controls, visual fidelity, and keyboard behavior. This is a narrower and easier integration experiment than recreating controls in canvas. It does not hide rendered pixels. [Playwright shadow-root support](https://playwright.dev/docs/locators#locate-in-shadow-dom)

The DOM standard makes `element.shadowRoot` return null for closed roots; it does not make them a privileged-browser security boundary. Pre-navigation code can intercept `attachShadow` and retain the returned root, or change its requested mode. Such an interception is a concrete bypass hypothesis supported by the browser's creation/return interface, not a measured result here. [DOM shadow-root interface](https://dom.spec.whatwg.org/#dom-element-shadowroot)

CDP's DOM commands support piercing shadow roots; related worker targets can be attached and paused at startup. Therefore benchmark privileged root inspection and startup instrumentation separately from stock locator failure. Accessibility snapshots and screenshot coordinates must also be tested; blocking the locator API alone is not blocking the framework. [Official CDP protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json)

**Worker-rendered OffscreenCanvas is a second, more expensive deterrence candidate.** Rendering in a worker moves the drawing workload off the main thread and can reduce useful native DOM controls and simple main-realm canvas instrumentation. The canvas is still displayed normally. This may raise the effort required by a limited DOM agent while improving rendering responsiveness, but it does not automatically protect screenshots or worker state from debugger access. Worker startup instrumentation, message inspection, and coordinate input are required bypass tests. [Chrome OffscreenCanvas documentation](https://web.dev/articles/offscreen-canvas)

**Invisible decoys remain narrow behavioral instrumentation.** Prefer an inert local canary outcome over blocking on the first hit. Measure whether a DOM agent acts on information that screenshots do not show. If an informed agent filters opacity, accessibility visibility, or pointer eligibility, the detector's advantage may disappear. These are useful graded outcomes rather than a claim that hidden DOM reliably identifies automation.

**Client puzzles without a server verifier impose cost, not an enforceable boundary.** A locally generated puzzle and local success check run in the same instrumentable client as the application. An agent may solve the puzzle, replace its verifier, or enter the post-success code path. A puzzle that gates rendering also delays humans and spends their CPU. The proposal is not equivalent to server-validated proof of work and should be rejected for this scope unless a measured cost/usability advantage appears. This is architectural inference from the location of computation and enforcement, not a reported test result.

**Permissions Policy does not restrict the user's debugger.** It governs use of policy-controlled web features by documents and embedded content. Removing permission for display capture can reduce what scripts in this document request; it does not revoke CDP, ordinary DOM inspection, or external native screenshots. CSP and iframe sandboxing likewise need to be evaluated against their declared web-content boundaries, not presented as browser-controller exclusion. [Permissions Policy specification](https://www.w3.org/TR/permissions-policy-1/)

Next benchmark order: closed native Shadow DOM, then worker canvas if the closed-root result adds meaningful resistance. For each, preserve one task and one viewport, test stock locators, screenshot-coordinate operation, pre-navigation instrumentation, and privileged CDP inspection. Include keyboard and accessibility use by humans. Report the smallest adversary capability that restores completion; do not discard a useful partial deterrent simply because a stronger client can bypass it.
