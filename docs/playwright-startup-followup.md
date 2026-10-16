# Playwright startup and native attachment follow-up

Reviewed 2026-10-16. Playwright source pins version `1.64.0`. Chromium pins Chrome `155.0.8059.40`, commit `cfaadc5a132d78e1828635aa8405a499f3e14864`. This review excludes the separate tracing, clock, snapshot-global, and screenshot-style investigation.

## New native attachment branch: autofill listeners

`AutofillAgent::OnDevToolsSessionConnectionChanged`, lines 1897–1947, has effects without Runtime enablement. It resets/re-extracts form data after DOMContentLoaded. It also installs native capturing listeners for beforeinput, input, composition, drop, paste, and key events until a warning has been emitted. Detachment removes these listeners; the first handled event also removes them. DOMContentLoaded invokes the same path when an inspector is already connected, at lines 585–588. [Pinned autofill agent](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/components/autofill/content/renderer/autofill_agent.cc#1897).

This is a real attachment-only effect, but it does not yet yield a page-readable bit. Registration uses the native `WebDocument` API. Replacing JavaScript `addEventListener` is not evidence that this C++ call will hit the replacement. The handler does not cancel the event or change its fields in the reviewed body.

Its warning callback calls `EmitAutofillOrManualTextIssue`, then `EmitToDevTools`. The latter checks that an inspector is connected and calls `WebLocalFrame::AddGenericIssue`. The manual-text warning also requires its feature flag and a disabled policy feature. This path is not shown emitting a page `ReportingObserver` report, DOM mutation, or `securitypolicyviolation` event. [Warning implementation, lines 287–294 and 330–348](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/components/autofill/content/renderer/form_autofill_issues.cc#287).

A bounded probe could observe reports/mutations while dispatching one controlled text event before and after bare attachment, with the policy and feature support recorded. The source gives no expectation of a positive public report; treat this as a check for an overlooked bridge, not a proposed production detector. Do not mistake the debugger's own issue event for page visibility. Form extraction alone does not establish that page JavaScript getters run.

## Startup configuration candidates

Playwright's main-frame initialization sends `Emulation.setFocusEmulationEnabled(true)` unless its no-default-overrides route applies. It also conditionally sets media, locale, viewport, touch, and headless font overrides. These can create configuration differences, but a minimal CDP client need not send them. [Versioned initializer, lines 503–531](https://github.com/microsoft/playwright/blob/v1.64.0/packages/playwright-core/src/server/chromium/crPage.ts#L503).

Focus emulation suggests a specific optional probe: compare focus behavior when another native application receives focus, against ordinary Chrome and raw CDP with focus emulation absent. A difference can identify forced focus, not every Playwright client or attachment. Cross-platform window-manager behavior and user actions need controls. Headless generic-font metrics are another configuration check; no exclusive browser provenance follows from matching a font profile.

The same initializer creates a named isolated utility world. Its name belongs to protocol execution-context metadata; the reviewed code does not make that name an ordinary page global. Shared DOM changes made by code running there may be observed, but simply having the world does not establish a public enumeration API. [Versioned world setup, lines 468–496](https://github.com/microsoft/playwright/blob/v1.64.0/packages/playwright-core/src/server/chromium/crPage.ts#L468).

## Decision

The native autofill branch is the new concrete source lead. No mandatory page-visible mutation or report was established. Optional focus/font overrides can help classify a particular setup but do not close bare CDP screenshot/input access. A repeatable public report caused solely by attaching, absent in ordinary controls, would justify tracing its delivery. A clean raw CDP client completing the task without these effects would reject completeness.
