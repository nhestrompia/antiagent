# Safari provider-demo observation

On 2026-10-14, I opened the [EZDRM published demo](https://www.ezdrm.com/demonstration-of-shaka-player-security-ezdrm) in a separate Safari window through native computer use. This did not alter browser security settings or add a license server.

The accessibility state reported Running in Safari, FairPlay supported, Calling FairPlay License URL, and License Acquired. The media controls showed a two-minute duration. After starting playback, a later observation showed elapsed time of 33 seconds. The displayed stream identifier was na-fps.ezdrm.com/demo/ezdrm/master.m3u8.

These are provider-page diagnostics and playback-counter observations. I did not inspect the native media key session or validate encrypted frames independently. They establish a usable public demonstration candidate, not credentials for packaging our own UI or a capture-protection result.

The attempted screenshot workflow failed. A control became unavailable, and after refreshing the accessibility state the native tool reported noWindowsAvailable. No valid video screenshot was obtained. This is a tool/window availability failure, not a DRM blackout. The reason the window became unavailable is unknown.

Safari WebDriver capture remains untested. The native observation also does not establish that a human could see frames while a capture omitted them. No human screenshots, unrelated Safari tabs, or private browser data were saved into this repo.

The provider demo is stronger evidence of a public testing candidate than Apple's development test credentials alone. It does not solve Chrome compositor capture or protect arbitrary canvas content. See [FairPlay/WebKit source research](fairplay-webkit-capture-research.md) for those boundaries.
