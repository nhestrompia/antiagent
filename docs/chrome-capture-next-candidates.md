# Next Chrome capture candidates

Researched 2026-10-14 with primary sources. Scope: normal desktop Chrome on macOS, with a browser-only npm package. No native component, server, or OS changes. These are tests and limits. They are not protection guarantees.

## Test Document Picture-in-Picture

Chrome supports Document Picture-in-Picture from version 116. It opens an always-on-top window with arbitrary HTML. The window has the same origin as its opener. Opening needs a user gesture. A normal app action could supply that gesture without installation. Move the panel into that window. Compare its visible screen with raw CDP capture and input on the opener. [Chrome API guide](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)

The opener screenshot might omit the other window. This would separate targets; it would not protect pixels. List CDP targets after opening. Attach to the PiP target if it exists. Try capture and input there. Also try to read its document from the opener. Blocking only a client attached to the opener is not enough.

Check that a person can see and use the panel. Check window closure and OS capture too. No reviewed source promises PiP capture exclusion. This is the next useful shipped feature to test because it changes the display target.

## Unbounded surfaces remain in capture

Chromium's `RenderWidgetHostViewBase` capture helper finds an active unbounded surface. It makes a second copy request and combines that image with the main image. A TODO still covers passing the secure-copy flag to that surface. A separate compositor surface can therefore remain in screenshots. The code uses a browser feature gate. This review did not confirm a shipped desktop/macOS web API. Do not depend on experimental support. [Capture helper](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/renderer_host/render_widget_host_view_base.cc)

## Capture Handle needs a willing capturer

Capture Handle is shipped. The captured app publishes a handle. The capturer reads it from its media track. Chrome says the captured app does not know capture has started unless the capturer contacts it. A hostile CDP client need not do that. This API cannot act as an independent screenshot alarm. [Chrome Capture Handle guide](https://developer.chrome.com/docs/web-platform/capture-handle)

## Test conditions

Use random task choices. Let the attacker adapt to the new target. Do not rely on fixed coordinates. Record API support, visible human completion, opener capture, target discovery, PiP capture, and task completion as separate results.

A new CSS transform does not justify repeating the existing GPU and low-latency tests. A change in drawing does not prove capture exclusion. If the attacker can inspect PiP through its own target or its opener, record a failed test. Do not call it agent-proof.
