# Document Picture-in-Picture capture experiment

Research date: 2026-10-14. Hypothesis: moving UI to a Document Picture-in-Picture window removes it from the source tab's screenshot while keeping it visible to a human. This tests separation of browser surfaces, not protected pixels.

## Supported behavior and scope changes

Chrome documents a separate always-on-top, same-origin window containing arbitrary HTML. Opening it requires a user gesture. Its position cannot be selected by the site, its requested dimensions may be clamped, and it closes with its opener. Moving the application into it changes the normal application window and does not satisfy transparent, automatic wrapper integration. An existing ordinary click might provide the gesture, but activation is not proof that a human made it. [Chrome API documentation](https://developer.chrome.com/docs/web-platform/document-picture-in-picture).

The UI is deliberately accessible from the opener through `documentPictureInPicture.window.document`. This is a direct documented DOM access path even if a framework ignores the additional window. For a canvas UI, opener code can likewise find the moved canvas; ordinary canvas readback restrictions still apply. Therefore a source-tab screenshot losing pixels would establish a restriction on a source-target-only screenshot agent, not resistance to arbitrary opener JavaScript. [Chrome: accessing elements in PiP](https://developer.chrome.com/docs/web-platform/document-picture-in-picture#access_elements_in_pip_window).

## Chromium source evidence

The current Document PiP controller retains a distinct child `WebContents`, observes its lifecycle, and closes it through `ClosePage`. That supports the separate-surface hypothesis. Current source also calls `PipScreenCaptureCoordinator::OnPipInitiated` with a comment about screen capture exclusion before the window becomes visible. The coordinator implementation could not be retrieved during this pass, so its exact capture selection and platform scope remain unverified. This comment does not establish exclusion from direct CDP capture of the child's own surface. Current main is not the installed Chrome 155 build. [Current controller, `SetChildWebContents`](https://github.com/chromium/chromium/blob/main/content/browser/picture_in_picture/document_picture_in_picture_window_controller_impl.cc).

Pinned Chromium 155's renderer DevTools agent reports a target type through the embedder delegate. Chrome's delegate reports tab and `views::WebView` contents as `page`, with `other` as its fallback. This is a reason to inspect all discovered targets rather than only `page`; these functions alone do not prove which classification or discovery path the installed PiP window uses. [Pinned renderer agent, `GetType`](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/devtools/render_frame_devtools_agent_host.cc), [pinned Chrome delegate, `GetTargetType`](https://github.com/chromium/chromium/blob/155.0.8059.40/chrome/browser/devtools/chrome_devtools_manager_delegate.cc).

## Decisive tests

1. Record browser version and targets before opening PiP. Open it through an ordinary action, move a labeled canvas and a working action into it, and confirm human visibility.
2. Capture the source target unchanged. Compare labels and accepted action count against the pre-move baseline.
3. Enumerate every target type after opening. Attach to each new candidate and attempt `Page.captureScreenshot`, DOM observation, and coordinate input. Do not infer protection from a framework's page-list filter.
4. From the source target, evaluate `documentPictureInPicture.window.document` and attempt the same information recovery/action. Test canvas readback independently of screenshot capture.
5. Compare a native screen capture to source and child captures. An always-on-top separate window is not documented as globally protected against native capture.

Repeat the cases three times. If only the source screenshot omits the interface, describe the result as moving UI outside that observation target. If the child or opener exposes the UI/actions, record the bypass explicitly. Do not claim general Playwright/CDP blocking from the source screenshot alone.
