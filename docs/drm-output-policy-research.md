# DRM output policy versus CDP screenshots

Research date: 2026-10-14. Scope: legitimate Widevine playback in Chrome on macOS. This research changes no license or key and uses no new license service.

## Policy and API boundaries

Widevine's official help lists HDCP and other output controls. That page concerns Classic VOD Packager. It does not document a modern Chrome screenshot policy or arbitrary canvas protection. [Official output-controls help](https://support.google.com/widevine/answer/6072641).

EME getStatusForPolicy queries a hypothetical HDCP requirement. It does not change the license, enable protection, or identify a screenshot. Stricter licensed output requirements need a content owner and license service that can issue them. The shared development license remains unchanged. [EME policy algorithm](https://www.w3.org/TR/encrypted-media/#dom-mediakeys-getstatusforpolicy).

## Chromium capture reporting

Current-main OutputProtectionProxy queries physical outputs on ChromeOS. Elsewhere it starts with successful status and zero output/protection masks. It adds a network link when MediaCaptureDevicesDispatcher reports insecure capture. EnableProtection is unimplemented outside ChromeOS in this proxy. I could not retrieve the pinned Chrome 155 proxy, so these facts concern current main. [Proxy source](https://github.com/chromium/chromium/blob/main/chrome/browser/media/output_protection_proxy.cc).

The dispatcher asks media access handlers. Its reviewed function does not use a generic WebContents capturer count. [Dispatcher source](https://github.com/chromium/chromium/blob/main/chrome/browser/media/webrtc/media_capture_devices_dispatcher.cc).

The handler tracks MediaStream sessions and target matching. Screen capture matches all frames. Tab capture matches its WebContents. Window matching outside Aura has an unimplemented path, including a macOS TODO. [Session matching source](https://github.com/chromium/chromium/blob/main/chrome/browser/media/capture_access_handler_base.cc).

These sources distinguish MediaStream reporting from compositor copying. They do not establish that Page.captureScreenshot creates an insecure MediaStream session. That is an inference from the reviewed functions, not proof about every implementation path.

## Local findings and limits

The [live experiment](hdcp-capture-findings.md) observed a delayed policy-status transition during tab sharing in three trials. Thirty CDP screenshots produced no observed transition in three other trials. The unchanged license and readable compositor capture remain separate outcomes from the hypothetical policy query.

Chromium issue [514487499](https://issues.chromium.org/issues/514487499) required sign-in. Its diagnosis and fix remain unverified here. Do not use it as evidence for CDP detection.
