# Browserbase detection review

Reviewed 2026-10-16 against Browserbase's current documentation and public SDK/source. No Browserbase credential was supplied or used. No remote session was created, account opened, or service behavior tested.

## What Browserbase exposes today

The former stealth-mode URL now redirects to Agent Identity. Current documentation distinguishes standard sessions from Verified, a purpose-built Chromium browser with prepared browser fingerprints. Verified is offered on the Scale plan, with trial access through Browserbase. Non-Verified sessions use Linux; Verified defaults to a Windows profile. These are provider descriptions, not an audit of the private browser implementation. [Identity overview](https://docs.browserbase.com/platform/identity/overview).

Older official examples still mention `advancedStealth`. Treat those as version-specific examples. The current public SDK exposes `verified` and `os`; the current Verified guide documents those fields. It does not establish that old advanced mode and today's Verified mode have identical implementation or footprints. [Current SDK session settings](https://github.com/browserbase/sdk-node/blob/main/src/resources/sessions/sessions.ts), [older official migration example](https://github.com/browserbase/skills/blob/main/skills/browser-use-to-stagehand/references/api-mapping.md).

Verified uses complete profiles and does not support custom viewports. Its guide lists approximate desktop dimensions and expressly says they can change. An `os: "mac"` choice changes the user agent and environment signals; this wording is not proof that the remote machine runs macOS. Profile dimensions and OS inconsistencies could be test inputs, but neither is a stable exclusive marker. Ordinary clients can share dimensions and profiles. [Verified customization](https://docs.browserbase.com/platform/identity/verified-customization).

## CDP access is not a promised page marker

Browserbase documents Playwright `connectOverCDP(session.connectUrl)` and Puppeteer WebSocket attachment. It recommends using the default context/page to preserve Verified behavior. This establishes a supported automation transport, not what an arbitrary page can observe about it. A detector that only catches a client's Runtime enable command can miss a different client on the same remote service. [Connection guide](https://docs.browserbase.com/platform/browser/getting-started/using-browser-session).

The reviewed public SDK is a client for session management. It does not disclose the complete purpose-built browser source. No documented mandatory `window` property, DOM event, response header, or attested JavaScript API identifying every Browserbase session emerged here. That is a bounded source finding, not proof that private implementation flaws cannot be measured.

## New positive identity candidate: Web Bot Auth

Browserbase offers optional Web Bot Auth in beta. It signs selected request components using HTTP Message Signatures. `Signature-Agent` locates public keys; `Signature-Input` describes the covered fields and parameters; `Signature` carries the signature. A website can verify it and block that identity. Browserbase says account enablement requires contact and support depends on the destination site's integration. [Official signing documentation](https://docs.browserbase.com/platform/identity/web-bot-auth).

This is stronger evidence than a copied user-agent string when a valid signature is present. It is not a mandatory footprint: unsigned traffic does not prove a human, and the reviewed docs do not require every Browserbase session to sign. A browser-only npm package also cannot read its navigation request headers directly; verification belongs at the receiving server or edge. This candidate so needs a scope change and cannot close the raw-CDP bypass alone.

## Decisive service experiment

Prerequisites are a Browserbase API key, project access where required by the selected SDK/API, and Verified entitlement or an approved trial. Web Bot Auth needs separate beta enablement. Never put those credentials or the session connection URL in public page code. [Official example prerequisites](https://github.com/browserbase/playbook#setup-instructions).

With access, run paired trials against the real app: standard versus Verified, default profiles versus supported OS choices, and an ordinary local Chrome control. Use both stock Playwright and a minimal CDP client that leaves Runtime/Debugger disabled. Measure actual screenshot-driven action completion. Keep the default Browserbase context intact; otherwise the experiment may test broken Verified setup.

Two fresh checks are justified: whether signed requests actually arrive when Web Bot Auth is enabled, and whether the documented fixed-profile family has a repeatable feature combination absent from ordinary controls. The latter is a hypothesis requiring held-out sessions, regions, versions, and physical browsers. Do not ship a viewport blacklist as perfect detection.

One unsigned, marker-disabled Browserbase session that completes the task falsifies a claim of complete Browserbase detection. One ordinary browser matching a proposed fingerprint rejects its exclusivity. At this point, there is no service test or source-backed stable mandatory marker on which to promise perfect detection.

## Follow-up: BFCache and prerender are different candidates

Playwright's launch switches include `--disable-back-forward-cache`. A failed history restoration in that configuration can identify a launch choice. It is not evidence that every attached CDP session disables BFCache. This bounded review found no unconditional attachment check in Chrome 155's `back_forward_cache_impl.cc`. Chromium's DevTools integration handles frame-tree swaps involving BFCache. [Playwright switches](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/chromiumSwitches.ts), [pinned cache implementation](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/back_forward_cache/back_forward_cache_impl.cc), [DevTools frame swap, lines 909 to 924](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/devtools_instrumentation.cc#909).

There is a concrete attachment-only **prerender** restriction. `IsPrerenderAllowed`, lines 1040 to 1047, returns false when the frame agent has a session without tab-target support. The predicate checks `session_mode()==kDoesNotSupportTabTarget`, at lines 1210 to 1216. The prerender registry then rejects the attempt as `PrerenderingDisabledByDevTools`, at lines 687 to 692. This condition does not require Runtime. It is narrower than “CDP attached”: a client supporting tab targets can avoid that branch. A separate Page-handler setting is also consulted. [Eligibility check](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/devtools_instrumentation.cc#1040), [session-mode predicate](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/render_frame_devtools_agent_host.cc#1210), [registry rejection](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/preloading/prerender/prerender_host_registry.cc#687).

For a history trial, record `pageshow.persisted` and the navigation entry's public `notRestoredReasons` if exposed. Public reasons explain restoration failure, but values and supported detail can change; a missing cache restore has many ordinary causes. Keep these distinct from CDP's richer `Page.backForwardCacheNotUsed` event, which belongs to the debugger client. [Public API and limits](https://developer.chrome.com/docs/web-platform/bfcache-notrestoredreasons/).

A prerender trial needs an eligible same-origin page, a successful detached control, and an activation that records `document.prerendering` or activation timing. Compare legacy page-target attachment with tab-target-aware attachment. A successful prerender under the latter rejects universal attachment detection. Failure in both attached and ordinary controls rejects this page as a valid probe. Neither BFCache nor prerender is guaranteed for ordinary users, so failure alone cannot establish automation.
