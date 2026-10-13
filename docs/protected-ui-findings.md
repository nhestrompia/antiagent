# Protected interface media experiment

Tested 2026-10-13 on installed Chrome 154.0.8037.98, macOS, Apple M5. The user changed the target to Netflix/HBO-style capture blocking and waived human usability during capture. This experiment follows that revised target.

## Change

The sensitive reference interface now occupies the encrypted video's own pixels. A 720×480, two-second, silent, 1 FPS H.264 asset contains the reference text and button image. Widevine CENC encryption starts at the first frame. The encrypted file is 32,466 bytes. The matching clear video checks ordinary playback and capture.

The page contains no original reference canvas or semantic business controls. It retains experiment settings and playback diagnostics outside the protected media region, like controls and subtitles outside a streaming video's protected layer. This is a static media experiment. It does not implement interactive controls, React conversion, or updates to changing application state. It abandons the shared tiny overlay as the carrier of sensitive information.

## Results

| Capture/access path | Matching clear media | Encrypted media |
| --- | --- | --- |
| Native computer-use capture in ordinary Chrome | Reference text readable | Interface omitted; black backdrop visible |
| CDP view screenshot, `fromSurface: false` | Reference text readable | Interface omitted; black backdrop visible |
| CDP compositor screenshot, `fromSurface: true` | Reference text readable | Reference text readable |
| Video copied to ordinary canvas | Reference text readable | Black output |
| Accessibility snapshot | No reference action/value labels | No reference action/value labels |

The paired runner waits for usable encrypted keys and advancing frames before encrypted capture. Keys remained usable afterward. [Playback report](evidence/protected-ui/report.json), [clear view](evidence/protected-ui/clear-view.png), [encrypted view](evidence/protected-ui/encrypted-view.png), [encrypted compositor capture](evidence/protected-ui/encrypted-surface.png), [encrypted canvas copy](evidence/protected-ui/encrypted-copy.png).

Native computer use independently opened the page in ordinary Chrome, started encrypted playback, observed usable keys and 720×480 decoded dimensions, and captured the omitted interface. Restarting with the matching clear source made the reference text readable in native capture. The native images remain in the session transcript. The final encrypted native capture shows the black backdrop with active protected playback.

## What this proves

This prototype reproduces media-region exclusion in native computer use and Chrome's view screenshot. The reference values disappear because they are media pixels. It does not establish full parity with Netflix/HBO across every capture method. Their CDP compositor behavior was not measured.

Privileged compositor capture still recovers the interface in this configuration. OS screenshot shortcuts and whole-display recording of this new prototype remain unvalidated. Browser-tab sharing was not rerun for this page. Earlier colored-media tab captures preserved pixels, so screen-sharing resistance must not be inferred from the native result.

The matching clear asset is intentionally available over the network. This development fixture is not secure against agents inspecting network data. Production licensing, interactive rendering, performance, and packaging remain outside this milestone. No npm publication is authorized by this result.

## Verification

`npm run capture:ui` completed the paired capture and semantic checks. `npm test` passed all 11 browser regression tests. `npm run build` produced both experiment pages. The existing Shaka bundle-size warning remains.
