# Compositor capture versus page observations

Research date: 2026-10-14. Chromium host sources use 155.0.8059.40. The Viz declaration below uses current main because its pinned version was unavailable.

## Browser callbacks

RenderWidgetHostImpl stores snapshot callbacks in browser machinery. Its surface path requests redraw and calls CopyFromSurface. The view path calls GrabViewSnapshot through WindowSnapshotReachedScreen. The reviewed path creates no DOM event or PerformanceEntry. This source review does not exhaust all lower platform implementations. [Pinned widget snapshot source](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/renderer_host/render_widget_host_impl.cc).

Current-main Viz CopyOutputRequest defines result formats, selection, scaling, and a callback. Its reviewed declaration exposes no document subscription or veto. [Current copy request](https://github.com/chromium/chromium/blob/main/components/viz/common/frame_sinks/copy_output_request.h).

## Performance API scope

Performance Timeline delivers entries queued for a relevant global object. It does not subscribe to arbitrary browser trace events. A screenshot trace label therefore does not establish a page-visible entry. [Performance Timeline model](https://w3c.github.io/performance-timeline/).

Chrome's Long Animation Frames API covers slow rendering updates. Duration excludes presentation time. Script attribution covers page-main-thread and same-origin iframe scripts, excluding workers and extension isolated worlds. The documentation supplies no GPU-copy or screenshot marker. [Chrome LoAF documentation](https://developer.chrome.com/docs/web-platform/long-animation-frames).

A screenshot could coincide with slow rendering without identifying its cause. Ordinary UI load can produce the same entry. An after-frame callback also does not guarantee a pre-capture veto.

## Memory scope

The Measure Memory draft estimates application memory and attributes page, iframe, and worker contexts. It does not guarantee visibility of browser encoding buffers or GPU readback allocations. Availability and isolation requirements need separate checks. [Memory model](https://wicg.github.io/performance-measure-memory/).

## Live comparison

The [observer experiment](compositor-observer-findings.md) registered all supported entry types and lifecycle listeners. Thirty compositor screenshots produced no entries or events in three trials. Normal page timer work produced long-task and long-animation-frame entries in three controls. Captures remained readable and actions succeeded.

This rejects the tested entry-based detector. It does not prove absence of every side channel or every workload-dependent effect. No reviewed source supplies a guaranteed screenshot entry or page-owned control that cancels every viewport readback.
