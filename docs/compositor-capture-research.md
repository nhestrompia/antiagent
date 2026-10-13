# Compositor capture and Widevine robustness

Researched 2026-10-13. Main conclusion: **software-secure decode can enable native protected-video handling, but it is not a documented switch for blocking CDP screenshots. Hardware robustness also does not automatically set the independent compositor secure-output flag.**

## The flags are independent

Current Chromium's TextureDrawQuad contains independent `secure_output_only`, `is_video_frame`, and `protected_video_type` fields. `SetNew` accepts secure output and protection type as separate arguments. Trace serialization exposes all three fields, providing a way to inspect an instrumented build rather than infer them from playback. [Current TextureDrawQuad implementation](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/common/quads/texture_draw_quad.cc)

The current surface aggregator replaces a texture quad with black when `secure_output_only` is true and either output is insecure or the pass participates in a copy request. The condition does **not** test `protected_video_type`. The black quad retains shared state, including opacity. Thus native AV-layer capture prevention and this compositor copy-output substitution are distinct paths. [Current surface aggregator](https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/surface_aggregator.cc)

The recently pinned Chrome 147.0.7727.54 video resource updater derives software/hardware protection from `protected_video` and `hw_protected` metadata; Windows DComp surfaces have a separate hardware classification. Its ordinary video texture `SetNew` call passes **false** for secure output while separately passing the derived protected video type and setting `is_video_frame=true`. This directly explains why setting software protection is insufficient to trigger the aggregator's secure-output-only black substitution. It also rules out the assumption that hardware classification necessarily sets that flag. The updater path no longer resolved on main during this research, so this statement is explicitly pinned to 147; inspect the installed version before treating it as universal. [Chrome 147 resource updater](https://chromium.googlesource.com/chromium/src/+/refs/tags/147.0.7727.54/media/renderers/video_resource_updater.cc)

Current macOS layer code selects a protected AVSampleBufferDisplayLayer for non-clear protected IOSurface content when AV layers are enabled and sets `preventsCapture`. That condition includes software protection. It is a native-layer property, independent of the aggregator condition above. [Current macOS layer tree](https://raw.githubusercontent.com/chromium/chromium/main/ui/accelerated_widget_mac/ca_renderer_layer_tree.mm)

## What a web application can request

Chromium's current Widevine key-system configuration interprets robustness strings. On macOS's platform branch, HW_SECURE_CRYPTO and stronger require hardware-secure codecs; SW_SECURE_DECODE does not. Unsupported levels or codecs reject configuration. These checks select acceptable DRM/decoder capabilities; there is no screenshot-blocking field or setter for compositor secure output in this API. Robustness should be tested with the real content codec and actual playback, without silently falling back to weaker requested configurations. [Current Widevine key-system rules](https://raw.githubusercontent.com/chromium/chromium/main/components/cdm/renderer/widevine_key_system_info.cc)

EME's `getStatusForPolicy` queries whether an HDCP restriction could be fulfilled. Its policy dictionary contains `minHdcpVersion`. It reports a hypothetical key's usability under that policy; it does not attach a new policy to a license, set a capture flag, or protect arbitrary page content. Actual license policy is CDM/provider-specific. Do not claim that setting an HDCP query or receiving `usable` blocks screenshots. [W3C EME policy API](https://www.w3.org/TR/encrypted-media/#dom-mediakeys-getstatusforpolicy)

## Answer and limits

- **SW_SECURE_DECODE:** supported native capture suppression is plausible through non-clear AV video metadata; CDP suppression is not established and the inspected texture path does not set the required secure-output-only flag.
- **HW DRM:** may keep pixels inaccessible or mandate overlays on some platform paths, but it is not a universal CDP-blocking prerequisite or guarantee. The inspected updater independently leaves secure output false. This Mac's supported hardware capabilities must be measured, not fabricated with test-only overrides.
- **License policy:** a provider can constrain protected playback. No reviewed primary source documents a license policy that makes desktop Chrome/macOS mark arbitrary HTML/canvas or an ordinary software video texture secure-output-only.
- **Alternative web APIs:** no reviewed standard exposes page-wide capture exclusion. Browser capture APIs are controlled by the capturing page and user; native AV-layer protection is controlled by the browser. Canvas obfuscation remains measurable agent resistance, not protected compositor output.

## Decisive verification

The installed Chrome 154 test now exercises all five robustness strings against the same 720×480 encrypted interface, codec, and public development license. Both SW_SECURE_CRYPTO and SW_SECURE_DECODE played with usable keys and advancing frames. Their compositor screenshots retained the reference text. HW_SECURE_CRYPTO, HW_SECURE_DECODE, and HW_SECURE_ALL were unsupported; the runtime stopped without fallback and skipped encrypted capture. Unsupported playback is not a successful blackout. [Security matrix](compositor-security-results.json).

Local capture images and full reports are under `artifacts/compositor-security/` and the ignored `docs/evidence/compositor-security/` directory. The committed summary records the measured results without requiring those local images to ship with the repository.

The matching clear control remained readable. The view captures continue to exclude software-protected interface pixels. The page now exposes security selection, and `ROBUSTNESS=SW_SECURE_CRYPTO npm run capture:ui` reproduces the alternate software test. `npm run build` passed. This investigation did not establish a working website-side compositor blocker.

An instrumented trace could next inspect native layer selection and compositor fields in the exact installed build. The reviewed source does not prove this build's flag values. The actual capture matrix proves that neither supported robustness request blocked its compositor screenshots. The user waived capture-time human usability and the [protected-media prototype](protected-ui-findings.md) now carries the interface inside video, so further transparent-overlay sweeps are not the current approach.

If product requirements include CDP resistance, protected video playback alone is insufficient evidence. A browser change setting or enforcing the missing compositor flag would be a custom-browser dependency, currently outside the PRD. No website-side workaround for that flag was established here.
