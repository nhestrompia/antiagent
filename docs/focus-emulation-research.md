# Focus emulation and hidden-tab capture experiments

Researched 2026-10-13. **Default Playwright focus emulation invalidates a physical-hidden-tab baseline unless explicitly disabled for that experimental arm.** Keep the default configuration as its own bypass/control arm; do not quietly turn it off and claim the result applies to stock Playwright.

Current Playwright Chromium page initialization sends `Emulation.setFocusEmulationEnabled({enabled:true})` for the main frame, except its explicit default-override skip path. This happens during normal setup, separately from screenshot commands. The locally installed bundle was also observed to send this command. [Playwright crPage source](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crPage.ts)

Pinned Chrome 155.0.8059.40 implements the command by setting widget focus emulation and, while enabled, retaining a WebContents capturer handle with empty size, `stay_hidden=false`, `stay_awake=false`, `is_activity=true`. Disabling runs and resets that handle. This is a continuously **visible** capturer, unlike Page.captureScreenshot's temporary hidden capturer. Therefore physically switching tabs need not produce the expected hidden renderer baseline while the emulation remains enabled. [Pinned Chrome155 emulation handler](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/content/browser/devtools/protocol/emulation_handler.cc)

Pinned WebContents calculates page visibility using capturer state; hidden capturers can keep painting, while visible capture contributes to visible state. This supplies the browser-side explanation for the failed hidden-state wait. Animation scheduling follows the effective page/renderer state rather than the researcher's assumption about the frontmost OS tab. Exact rAF behavior and screenshots still require the live test; the source does not establish a hidden-rAF screenshot detector. [Pinned WebContents](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/content/browser/web_contents/web_contents_impl.cc)

On the renderer side, current InspectorEmulationAgent forwards the setting to FocusController. The controller's `IsActive` and `IsFocused` return physical state OR the emulation flag, and document-focus queries use those predicates. Consequently, `document.hasFocus()` under emulation cannot attest physical human focus. Turning emulation on/off may itself cause focus events, which must be separated from events caused by capture. [Inspector emulation agent](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/inspector/inspector_emulation_agent.cc), [FocusController predicates](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/page/focus_controller.h), [FocusController event logic](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/page/focus_controller.cc)

## Required test arms

1. Physical baseline: disable focus emulation, foreground another tab, verify actual `visibilityState`, `hidden`, focus, and idle rAF counters before any screenshot.
2. Capture while that verified baseline is hidden: compare screenshot interval with an equally long no-capture interval and foreground-return control.
3. Stock Playwright default: retain focus emulation and record that the page may report visible/focused despite the physical tab switch. Test capture here as a bypass arm.
4. Re-enable focus emulation after hiding: record effects caused by the command itself, without screenshot.

Also record launch flags that affect background throttling/occlusion, browser version, whether the lab tab actually lost foreground status, and other capture/PiP clients. A timeout waiting for hidden state is a meaningful configuration result, not permission to assume a hidden baseline. A heuristic conditional on physical-hidden state cannot cover agents that keep or emulate the page as visible.
