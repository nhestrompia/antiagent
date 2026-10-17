# Original detector code follow-up

Reviewed 2026-10-16. Repository pins: Rebrowser detector `e1a25b1ff264cc9a5b5ea7fe8a6dfc26e3b1c718`; BotD `66da86e9d9e7206e817a0f7fdbdfa8fe37f3cd47`; Brotector `98b330999e9928a226ca0c8254dddf909d1583bd`. No detector was executed in this source review.

## Concrete checks outside the exhausted CDP signals

| Check | Actual operation | Scope and decisive control |
| --- | --- | --- |
| Notification permission mismatch | Query notification permission, then compare `Notification.permission === 'denied'` with queried state `'prompt'` | A browser/configuration inconsistency. No prompt is requested. Test the actual origin, clean browser, permission-denied browser, headful automation, and raw CDP. |
| MIME object consistency | Compare `navigator.mimeTypes` prototype with `MimeTypeArray.prototype`, and each item with `MimeType.prototype` | Can catch incomplete stealth patches. Native unmodified objects can pass under CDP. A genuine ordinary browser failure rejects a hard gate. |
| Exposed function implementation | Inspect an exposed function's source for binding implementation strings and its `__installed` property | Requires the client to expose a function into the inspected world. Omit that optional feature as the bypass control. |
| CSP bypass | Load a script forbidden by the page's CSP and detect successful loading | Catches optional policy bypass. Keep CSP enforcement enabled as the control; debugger evaluation is a different path. |

The first two come from BotD's original source. The notification detector classifies the mismatch as HeadlessChrome only when its browser classifier reports Chrome. MIME consistency checks object shape, not whether an inspector session exists. [Pinned notification source](https://github.com/fingerprintjs/BotD/blob/66da86e9d9e7206e817a0f7fdbdfa8fe37f3cd47/src/sources/notification_permissions.ts), [notification classifier](https://github.com/fingerprintjs/BotD/blob/66da86e9d9e7206e817a0f7fdbdfa8fe37f3cd47/src/detectors/notification_permissions.ts), [MIME source](https://github.com/fingerprintjs/BotD/blob/66da86e9d9e7206e817a0f7fdbdfa8fe37f3cd47/src/sources/mime_types_consistence.ts).

Rebrowser's expose-function check looks for Puppeteer/Playwright binding text, a `puppeteer_` global prefix, `__playwright__binding__`, or an enumerable function with `__installed === true`. Its CSP check inserts an external script and observes load/error. Its main-world query checks replace document methods and inspect calls or their Error stacks. Isolated-world or screenshot/input-only clients need not call those wrappers. The test page's `dummyFn` is a world-access diagnostic, not proof of automation. [Pinned implementation](https://github.com/rebrowser/rebrowser-bot-detector/blob/e1a25b1ff264cc9a5b5ea7fe8a6dfc26e3b1c718/index.js).

## What the broader detector names conceal

BotD's distinctive-property source mainly enumerates framework-specific globals and document properties, including older Selenium, PhantomJS, and embedded-browser names. Their presence may identify those environments. Their absence does not clear an arbitrary agent, and a site or extension can introduce a colliding property. [Pinned property list](https://github.com/fingerprintjs/BotD/blob/66da86e9d9e7206e817a0f7fdbdfa8fe37f3cd47/src/sources/distinctive_properties.ts).

Brotector's additional source checks include a full-page canvas mouse-visualizer wrapper, a PDF iframe's style, user-agent override inconsistencies, and injected-script stack signatures. These depend on a particular tool/configuration or optional action. Its popup-crash probe intentionally exercises a browser bug and is not evidence of a safe, mandatory attachment signal. No new raw-CDP detector emerged from that implementation. [Pinned Brotector source](https://github.com/ttlns/brotector/blob/98b330999e9928a226ca0c8254dddf909d1583bd/brotector.js).

## Recommended next use

The installed BotD bundle already contains notification mismatch and MIME prototype consistency checks. They are not new protection layers for this app. They should begin as observations with ordinary-browser controls. Binding/global tests belong in the separate installed-Playwright investigation. Do not convert a project's red test result directly into an application security rule.

A marker-disabled raw CDP client that passes these checks and completes the task falsifies their completeness. An ordinary supported browser that triggers a check rejects exclusivity. This review found useful configuration detectors, but no source-backed compulsory marker added by bare screenshot/input access.
