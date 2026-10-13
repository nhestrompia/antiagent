# Foreground agent boundary: further renderer candidates

Research date: 2026-10-14. Scope: website code in ordinary Chrome, with no server, browser policy, extension, installation, or extra human step. The target is a foreground viewport screenshot followed by coordinate input through Playwright/CDP.

This pass found no new supported mechanism within that scope. This result does not prove what every future browser can do.

## Capture-prevention proposal

The TPAC 2024 presentation proposes a capturable or sensitive attribute. Its example uses capturable=false. It discusses hiding content or warning before capture. The user must retain control. The presentation does not specify CDP behavior or establish Chrome support. [Primary presentation](https://www.w3.org/2024/Talks/TPAC/breakouts/capture-prevention.pdf).

Manifest issue #1154 closed because the feature belongs in a different standards venue. Closure does not mean implementation. The maintainer recommends WICG. The linked Chromium request required sign-in, so I could not verify its status. [Manifest discussion](https://github.com/w3c/manifest/issues/1154), [Chromium request](https://issues.chromium.org/issues/41461179).

The local test used Chromium 152 inside T3. Both reference regions remained readable in the browser snapshot. The restricted region retained its capturable=false attribute. Unknown HTML attributes can remain in the DOM without browser support. See [test findings](capture-hint-findings.md). This result covers that browser snapshot, not native capture or every Chrome version.

## HTML-in-canvas exclusions

The explainer excludes browser-private information from element snapshots, including cross-origin resources, visited-link appearance, and pending autofill. These rules constrain the element-drawing APIs. They do not let an app classify its own button labels as private. The result allows pixel readback. [Read-back-allowed rendering](https://wicg.github.io/html-in-canvas/#read-back-allowed-rendering).

The explainer preserves DOM and accessibility information. Chrome's introduction describes AI indexing and DevTools access as benefits. Neither source documents a CDP screenshot veto. That boundary is an inference from the stated API scope, not a live CDP test. [Chrome introduction](https://developer.chrome.com/blog/html-in-canvas-origin-trial).

The current explainer describes experiments behind a flag. The earlier Chrome article describes an origin trial. Neither establishes default support in the installed Chrome 155. [Current status](https://wicg.github.io/html-in-canvas/#status).

## Decision

Keep capturable on a standards watchlist. Do not use the proposed attribute as protection. HTML-in-canvas may help integration, but its documented semantics and readback do not close the requested gap. This pass identified no supported new input-attestation or foreground screenshot-veto API.
