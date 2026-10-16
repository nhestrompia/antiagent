# Proposed capture hint test

I tested this on 2026-10-14 through the T3 collaborative browser on macOS. Its user agent reports Chromium 152.0.7977.130 and Electron 44.4.2.

The [TPAC 2024 presentation](https://www.w3.org/2024/Talks/TPAC/breakouts/capture-prevention.pdf) proposes a capturable=false hint. It describes user protection with user control, not enforced content protection against the user.

The local /capture-hint.html page displays two references. One has capturable="false"; the other has no capture attribute. The screenshot showed both references, including their numbers. The attribute remained "false" in the DOM, and the element had no reflected capturable property. This is one observed browser snapshot, not a Chrome-wide compatibility benchmark or native capture test. The image is under artifacts/capture-hint.png.

The first local navigation failed because Vite was not running. After starting Vite, navigation and capture succeeded. The connection failure is not protection evidence.

I also reviewed the [Screenshot-PrivacyProtectionWeb hook source](https://raw.githubusercontent.com/dxvzz/Screenshot-PrivacyProtectionWeb/main/hooks/use-robust-protection.ts). It monitors custom block events and periodically reads clipboard image types. This does not establish detection of a CDP screenshot returned to the automation client without clipboard use. Its advertised live demo returned 404. I could not test that demo.

These findings add no runtime protection. The foreground screenshot and coordinate-input gap remains open.
