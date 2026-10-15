# Mac native capture and CDP surface copies

Reviewed 2026-10-16 against Chromium `155.0.8059.40`. This trace explains how native capture can redact DRM video while CDP still reads its pixels. It establishes separate enforcement paths. It does not establish a new capture block.

## The two paths

| Path | Relevant rule |
| --- | --- |
| Native Mac video layer | Non-clear video protection sets `AVSampleBufferDisplayLayer.preventsCapture`. Software protection qualifies. |
| Viz compositor copy | The reviewed aggregator blackens a texture quad in a copy-request pass when `secure_output_only` is true. |
| Common video quad producer | It passes `false` for secure output, while carrying software or hardware protection in a separate argument. |

The [producer trace](secure-quad-producer-trace.md) links the exact assignments and their source lines. The flags serve different rules. Native capture protection does not imply compositor-copy protection.

## Surface screenshot call chain

`RenderWidgetHostImpl::GetSnapshotFromBrowser` routes `from_surface=true` through `CopyFromSurface`. With `kCDPScreenshotNewSurface`, it requests a repaint and copies directly. Without that feature, `GotResponseToForceRedraw` copies the surface after redraw. The separate browser-window branch calls `ui::GrabViewSnapshot` through `WindowSnapshotReachedScreen`. [Pinned snapshot implementation](https://chromium.googlesource.com/chromium/src/+/155.0.8059.40/content/browser/renderer_host/render_widget_host_impl.cc#2130).

On Mac, `CopyFromSurface` calls `CopyMainAndPopupFromSurface`. For an ordinary page without a popup or unbounded window, that helper calls `DelegatedFrameHost::CopyFromCompositingSurface`. Its internal method creates a Viz `CopyOutputRequest` and sends it through `RequestCopyOfOutput`. This path requests compositor pixels rather than a native screen grab. [Mac view](https://chromium.googlesource.com/chromium/src/+/155.0.8059.40/content/browser/renderer_host/render_widget_host_view_mac.mm#1179), [shared helper](https://chromium.googlesource.com/chromium/src/+/155.0.8059.40/content/browser/renderer_host/render_widget_host_view_base.cc#195), [copy request](https://chromium.googlesource.com/chromium/src/+/155.0.8059.40/content/browser/renderer_host/delegated_frame_host.cc#195).

This explains the existing measured split without assuming that DRM failed to set native protection. It also explains why another low-opacity protected-video overlay does not establish protection for the underlying app canvas.

## Reproduce and limits

Run `npm run audit:capture-boundary`. The script fetches pinned public sources, checks expected anchors, and records source hashes and line excerpts in `capture-boundary-source-audit.json`. A missing anchor or retrieval error causes a nonzero exit. The audit checks source facts; it is not a screenshot-prevention test.

No per-frame decoder metadata was collected from the tested browser. This trace does not cover every video producer or capture route. It identifies no reviewed web API that lets an npm package set `secure_output_only` on arbitrary HTML or canvas content. The surviving screenshot/input route remains unblocked. A stronger claim needs a supported web control and a real visible-browser test with readable playback and redacted CDP output.
