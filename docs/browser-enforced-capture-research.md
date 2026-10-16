# Browser-enforced capture boundaries

Researched 2026-10-13. The search found real browser restrictions. None reviewed gives an ordinary page a shipped switch to deny foreground Playwright screenshots. The promising distinction is **who controls the policy**: a document, the capturing app, an administrator, or the browser's media pipeline.

| Mechanism | Actual enforcement scope | Fit for current npm-only scope |
| --- | --- | --- |
| Permissions/Document Policy | Restricts supported web features and document behavior | No reviewed screenshot/CDP-denial directive |
| Credentialless/sandboxed iframe | Restricts web-content capabilities, credentials, and communication | Useful isolation experiment, no protected compositor guarantee |
| Element Capture | Cooperating capturer restricts its own track | Does not veto another capturer or CDP |
| PiP exclusion proposal | Proposed getDisplayMedia option | Discussion, not proof of a shipped target-page veto |
| WebGPU texture usage | Validates app GPU commands against allowed texture uses | No reviewed protected/capture-excluded canvas flag |
| Enterprise DevTools/debugging policy | Browser administrator restricts debugging | Real enforcement, requires managed browser scope |
| Enterprise screenshot policy | Restricts specified browser/extension screenshot paths | Administrator control. Desktop native capture remains possible |

## Policy and frame isolation

Permissions Policy controls policy-governed features used by documents. Document Policy defines a mechanism to configure supported document behavior. No reviewed feature defines a target-page permission veto for CDP Page.captureScreenshot. Do not infer such a directive from the generic policy mechanisms. [Permissions Policy](https://www.w3.org/TR/permissions-policy-1/), [Document Policy](https://wicg.github.io/document-policy/)

Credentialless iframes load in an ephemeral credential/storage context, allowing third-party embedding in COEP environments. They do not convert the displayed pixels into protected media. Sandboxing restricts embedded web content. It does not remove browser debugger privileges. [Chrome credentialless iframe](https://developer.chrome.com/blog/iframe-credentialless), [HTML iframe sandbox](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox)

The fenced-frame design isolates privacy-sensitive communication between embedded content and its embedding site. Its stated threat model is colluding web contexts, not privileged browser capture. It is not evidence for protected screenshot pixels. Current MDN documentation reports withdrawal of fenced frames with other Privacy Sandbox features; deployment status must be checked before any experiment. No capture-protection candidate is established from it. [Original fenced-frame explainer](https://github.com/WICG/fenced-frame/blob/master/explainer/README.md), [Current API status](https://developer.mozilla.org/en-US/docs/Web/API/Fenced_frame_API)

## Capture restrictions and proposals

Element Capture applies after user-approved self-capture, allowing the capturing app to select its element subtree. It does not let an arbitrary captured website impose restrictions on the debugger's screenshot command. [Element Capture explainer](https://github.com/screen-share/element-capture)

A 2026 W3C issue proposes excluding Picture-in-Picture windows via getDisplayMedia options. It remains an open discussion in the reviewed repository. The proposal concerns the capturing application's options, not a hidden target-page capture veto. Do not present proposed PiPWindow parameters as implemented APIs. [W3C issue 330](https://github.com/w3c/mediacapture-screen-share/issues/330)

## WebGPU is not a protected-video switch

GPUCanvasContext configuration controls format, device, usage, alpha, color, and tone mapping. Omitting COPY_SRC prevents certain application copy commands from using the current texture as a source. That is command validation, not an instruction to hide the browser's final displayed surface from CDP or the OS. No protected-output/capture-exclusion member is documented. HDR or low-level rendering is therefore not enough to assume a protected surface. [GPUCanvasContext configuration](https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure)

The subsequent [live experiment](webgpu-capture-findings.md) tested RENDER_ATTACHMENT-only usage against a COPY_SRC control. Application copying failed in all three restricted cases, while foreground compositor screenshots exposed the control in all three. The positive controls allowed both copying and screenshots.

## Real enforcement requires another policy owner

Chromium's RemoteDebuggingAllowed policy disallows remote debugging when disabled, including desktop remote-debugging port/pipe use. DeveloperToolsAvailability also controls target inspection through direct CDP and extension debugger APIs, as its current documentation states. These are browser-management policies, not JavaScript or response headers an npm runtime can set. They are an option only if managed-browser deployment becomes acceptable. [Chromium policy source](https://raw.githubusercontent.com/chromium/chromium/main/components/policy/resources/templates/policy_definitions/Miscellaneous/RemoteDebuggingAllowed.yaml), [DevTools policy](https://chromeenterprise.google/intl/zh_cn/policies/developer-tools-availability/)

Chrome 155 strengthens enterprise-policy enforcement for extension debugger attachment, including screenshot/DLP restrictions. That concrete change must not be generalized into a website-side ability to configure it. [Chrome155 announcement](https://developer.chrome.com/blog/debugger-enterprise-policy-restrictions)

DisableScreenshots's own source explicitly says it restricts browser keyboard/extension screenshot paths and does not prevent OS/third-party desktop captures on Windows, macOS, or Linux. Thus even this administrator-owned control has a declared capture boundary. [Chromium screenshot-policy source](https://raw.githubusercontent.com/chromium/chromium/main/components/policy/resources/templates/policy_definitions/Miscellaneous/DisableScreenshots.yaml)

Chrome also has URL-scoped debugger restrictions through its [DeveloperToolsAvailabilityBlocklist](https://chromeenterprise.google/policies/developer-tools-availability-blocklist/) and [allowlist](https://chromeenterprise.google/policies/developer-tools-availability-allowlist/) policies. Current documentation covers direct CDP port/pipe and extension debugger access. These policies were researched, not configured or tested on the user's browser.

The new WebGPU hypothesis failed its compositor test. Frame isolation can be a secondary inspection-resistance benchmark, but no reviewed source justifies promising screenshot prevention from it. Native/managed restrictions remain explicit scope changes. Foreground screenshot prevention under the current npm-only constraints remains unresolved.
