# Foreground viewport capture: renderer event investigation

Researched 2026-10-13, with screenshot/widget code pinned to Chrome 155.0.8059.40. **The traced foreground screenshot path forces compositor work and copies its output; it does not supply a page-side screenshot event or cancellation callback.** Animation/timing changes remain testable side effects, not a confirmed trigger.

## Pinned capture chain

RenderWidgetHostImpl's surface screenshot path stores a callback, requests renderer redraw, and copies the surface. With `kCDPScreenshotNewSurface`, it sends ForceRedraw, requests repaint on a new surface, and calls CopyFromSurface. The older branch waits for the ForceRedraw response before copying. Its comments explicitly distinguish surface snapshot from waiting for actual screen update; view snapshots have a separate platform path. The completion callbacks and snapshot IDs are browser internals, not events delivered to a DOM listener. [Pinned RenderWidgetHostImpl](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/content/browser/renderer_host/render_widget_host_impl.cc)

Pinned WidgetBase::ForceRedraw requests presentation timing for the next compositor frame and calls SetNeedsCommitWithForcedRedraw. The callback runs from presentation feedback. It also invokes ScheduleAnimationForWebTests, but the source explicitly says that hook is a no-op in production. There is no document-event dispatch in this ForceRedraw method. Compositor commit/presentation feedback should not be confused with an exposed JavaScript screenshot lifecycle. [Pinned WidgetBase](https://raw.githubusercontent.com/chromium/chromium/155.0.8059.40/third_party/blink/renderer/platform/widget/widget_base.cc)

This tracing does not prove that no timing difference can ever be measured. It shows why a guaranteed DOM observer is not established: forcing a commit can render unchanged content, and copying happens through compositor output rather than a canvas export method that page JavaScript could wrap. Resize/mutation/intersection observers require their own observable state changes; a redraw is not by itself a DOM mutation or geometry change.

## Video callbacks

requestVideoFrameCallback supplies metadata for video frames submitted for composition, including presentation time and submitted-frame count. Its algorithm skips callbacks when the presented-frame identifier has not changed, and it explicitly offers no strict timing guarantee. A screenshot-induced redraw need not decode or present a new video frame, so a paused video is not a documented screenshot sensor. A playing video supplies continuous ordinary callbacks, requiring repeated capture-versus-idle analysis. Its optional `captureTime` concerns a media frame's capture provenance, not capture of the web page containing the video. [Video-frame callback specification](https://wicg.github.io/video-rvfc/)

## WebGL loss

The WebGL specification's context-lost/restored events represent actual drawing-context loss and restoration. Neither the traced snapshot/redraw method nor this event contract says screenshot copying intentionally loses the WebGL context. Triggering loss ourselves would remove usable graphics and would not discriminate capture. Do not advertise `webglcontextlost` as a screenshot listener. [WebGL context-loss specification](https://registry.khronos.org/webgl/specs/latest/1.0/)

## Narrow remaining experiment

Compare foreground viewport screenshots against equally sized idle windows using rAF intervals/counts, video-frame metadata, performance entries, WebGL events, and a compositor-only CSS animation. Capture actual pixel/action outcomes with guard off/on. Include manual GPU/CPU load and ordinary repaint controls: timing stalls are not unique to screenshots. A useful candidate must recur before content is captured, survive default no-clip viewport capture, and avoid locking humans under normal rendering load. The code tracing establishes no such discriminator yet.

This file supplements the measured full-page geometry signal, whose unchanged-viewport bypass remains the key control. Browser protocol lifecycle/callback notifications are available to the debugger; they do not establish an equivalent event accessible to the page.
