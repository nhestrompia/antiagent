# Protected video quad producer

Reviewed 2026-10-16. All source links below pin Chrome `155.0.8059.40`, commit `cfaadc5a132d78e1828635aa8405a499f3e14864`. The Gitiles directory index lists `media/renderers/video_resource_updater.cc`, blob `f8d44c021ef76c3a932182da0b9535fcbcff1445`. Source retrieval used Gitiles `?format=TEXT`; a web cache miss did not mean that the file was absent.

The missing producer link is now clear: this updater passes **false** for `secure_output_only`. It carries the frame's protection class in a separate field. This applies to its shared RGB/RGBA quad path, without a macOS-specific branch.

- `ProtectedVideoTypeFromMetadata`, lines 66–79: `dcomp_surface` maps to hardware protection. Otherwise, `protected_video=false` maps to clear. A protected frame maps to hardware or software protection according to `hw_protected`.
- `AppendQuad`, lines 607–616: the updater computes that class, then passes `nearest_neighbor, false, protected_video_type` to `TextureDrawQuad::SetNew`. The literal false is the secure-output argument.
- Lines 617–621 add a Windows-only required-overlay hint for DComp surfaces. They do not change the secure-output argument.

[Pinned updater](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/media/renderers/video_resource_updater.cc#66).

The header declares `secure_output` immediately before `video_type`, at lines 50–52. The implementation assigns these arguments separately to `secure_output_only` and `protected_video_type`, at lines 54–55. Thus neither software nor hardware protection automatically sets `secure_output_only` in this producer. [Header](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/components/viz/common/quads/texture_draw_quad.h#42), [setter](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/components/viz/common/quads/texture_draw_quad.cc#54).

Platform frame producers differ:

| Producer | Assignment | Result through this updater |
| --- | --- | --- |
| CDM adapter, line 673 | `protected_video = is_video_encrypted_` | Software-protected when `hw_protected` remains false |
| Android MediaCodec decoder, lines 1276–1280 | A crypto context sets protected; a required secure codec also sets hardware protection | Software or hardware class according to the secure-codec branch |
| Windows Media Foundation client, lines 410–412 | A CDM context sets both flags true | Hardware class |

[CDM adapter](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/media/cdm/cdm_adapter.cc#673), [Android decoder](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/media/gpu/android/media_codec_video_decoder.cc#1276), [Windows client](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/media/mojo/clients/win/media_foundation_renderer_client.cc#410).

On macOS, the native layer has a different rule. Non-clear protection forces the video layer at line 865. Lines 1186–1187 set `AVSampleBufferDisplayLayer.preventsCapture` for any non-clear class, including software protection. This native-layer rule does not require `secure_output_only=true`. It does not establish that CDP compositor copies use native OS capture. [Pinned Mac layer](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/ui/accelerated_widget_mac/ca_renderer_layer_tree.mm#865).

The reviewed CDM adapter path supports a software-protected quad with `secure_output_only=false`. It does not prove which decoder produced each local Widevine frame. No per-frame metadata trace was taken from the tested browser. It also does not prove that all Mac captures omit the native layer. The local CDP capture result remains evidence for that tested route. A browser package cannot set these C++ flags on an arbitrary DOM or canvas surface through the reviewed APIs.
