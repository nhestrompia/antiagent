# GPU, idle, and video signal review

Reviewed 2026-10-16 for foreground Chrome 155 on macOS. These are candidate measurements, not established CDP markers. No permission prompt or live trial was run for this review.

## GPU queue and timestamp measurements

`GPUQueue.onSubmittedWorkDone()` measures completion of work submitted to that queue. Chrome forwards it to Dawn and flushes commands so its promise can settle. Its wall-clock duration also includes delivery of the callback to script. This is not a fence for all compositor screenshot work. [WebGPU queue contract](https://gpuweb.github.io/gpuweb/#dom-gpuqueue-onsubmittedworkdone), [Chrome 155 queue implementation, lines 146 to 161](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/modules/webgpu/gpu_queue.cc#146).

Compare GPU timestamp duration with wall-clock queue completion. A wall-clock-only spike suggests delivery/CPU delay; an increase within the GPU interval suggests GPU work or contention. Either can occur during normal rendering. Snapshot copies need not sit inside the page's timestamp interval. Record whether `timestamp-query` is supported before requesting it. Chrome documents timestamp quantization to 100 microseconds; measure actual granularity in the tested browser instead of assume nanosecond precision from the result unit. [Chrome timestamp-query documentation](https://developer.chrome.com/blog/new-in-webgpu-120).

`GPU_DISJOINT_EXT` belongs to WebGL timer-query extensions, not WebGPU's timestamp-query feature. It concerns validity of GPU timing results. The extension requires asynchronous result polling after returning to the event loop; one rAF or zero-delay timer need not suffice. A disjoint result invalidates the timing sample; it is not specified as a screenshot notification. [Khronos extension](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query/).

Falsifier: readable sparse screenshots with no corresponding queue/timestamp change defeat a required-signal claim. Similar changes under ordinary GPU/CPU work defeat a CDP-specific interpretation.

## Idle callback deadlines

`requestIdleCallback` reports the browser's estimate of idle time. Short animation gaps, long quiet gaps, and absent callbacks under heavy load are all expected. Deadlines are capped around 50ms; a timeout callback can run without idle time. This API does not expose the V8 inspector's internal idle flag. [Scheduling specification](https://w3c.github.io/requestidlecallback/).

Candidate measurements: callback interval, initial `timeRemaining()`, and `didTimeout`, with static and animated page modes kept separate. Bare attachment need not change pending work enough to alter these estimates. If normal animation/CPU load produces the same distribution, or readable capture leaves it unchanged, reject a capture-specific gate.

## Video presentation measurements

`requestVideoFrameCallback` reports frames submitted for composition. `presentationTime`, `expectedDisplayTime`, callback lateness, and gaps in `presentedFrames` can expose presentation pressure. The specification explicitly allows missed callbacks under main-thread load and does not repeat callbacks for an unchanged presented-frame identifier. So a paused video need not emit a new callback when its existing pixels are copied. Its optional `captureTime` describes media acquisition, not a CDP screenshot. [Video callback specification](https://wicg.github.io/video-rvfc/).

`getVideoPlaybackQuality()` exposes total, dropped, and corrupted video-frame counts. These describe playback quality; no capture counter is defined. [Playback quality specification](https://w3c.github.io/media-playback-quality/).

Compare playing and paused video. Record frame count deltas and callback timing alongside screenshot readability. Readable capture with unchanged counters rejects mandatory notification. Equivalent frame loss from normal load rejects provenance.

## IdleDetector: OS activity, with an explicit CDP override

IdleDetector requires permission and has a minimum idle threshold of 60 seconds. It describes device-wide activity, so a human using another app can keep it active. [Idle Detection specification](https://wicg.github.io/idle-detection/).

Chrome's Mac implementation reads `CGEventSourceSecondsSinceLastEventType` for the combined session's input events. This is a real OS signal, separate from DOM event trust. Baseline CDP input may therefore leave an otherwise idle OS idle. This is a testable expectation, not a guarantee about every input route. [Pinned Mac source, lines 104 to 108](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/ui/base/idle/idle_mac.mm#104).

An adaptive CDP client can call `Emulation.setIdleOverride`. Chrome's IdleManager then sends the supplied state to monitors. So even an already-permitted IdleDetector is not an trusted human-presence gate against CDP. [Protocol override](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setIdleOverride), [pinned browser override](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/idle/idle_manager_impl.cc#43). No permission trial is needed to establish this source-level limitation.

## Compute Pressure: coarse CPU telemetry with a CDP replacement

PressureObserver is a shipped API; Chrome's documentation lists launch in Chrome 125, although that page also retains old origin-trial instructions. The interface requires a secure context and the `compute-pressure` Permissions Policy, whose default allowlist is self. These are not an IdleDetector-style permission prompt. Observation may still fail if the underlying source is unsupported. [Chrome documentation](https://developer.chrome.com/docs/web-platform/compute-pressure), [specification](https://w3c.github.io/compute-pressure/).

Chrome 155 has a Mac backend. `CpuProbe::Create`, lines 31 to 32, chooses `CpuProbeMac`; that backend reads per-core times to calculate utilization. This supports a CPU-pressure experiment on macOS, not a guarantee that every installed configuration returns records. [Factory](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/components/system_cpu/cpu_probe.cc#26), [Mac backend](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/components/system_cpu/cpu_probe_mac.cc#63).

The production sampling default is one second. Observer `sampleInterval` limits delivery; requesting zero does not make physical sampling continuous. The specification also permits rate changes and requires privacy measures for rapid state changes. Chrome's browser service checks implicit focus. Short screenshots may fit between samples or leave the coarse pressure state unchanged. [Sampling default, lines 38 to 44](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/services/device/compute_pressure/pressure_manager_impl.h#38), [focus checks](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/compute_pressure/pressure_service_base.cc#65), [observer interval check](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/third_party/blink/renderer/modules/compute_pressure/pressure_observer.cc#269).

CDP can replace this telemetry. `SetPressureSourceOverrideEnabled`, lines 501 to 529, creates a virtual pressure source for the WebContents. `SetPressureStateOverride`, lines 535 to 565, updates that source with the supplied state. The device service selects the virtual probe manager when the client supplies its token, instead of the physical manager. So nominal/fair/serious/critical readings are not trusted physical telemetry against this client. These commands do not require Runtime or Debugger. [Pinned CDP handlers](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/content/browser/devtools/protocol/emulation_handler.cc#501), [physical/virtual selection, lines 43 to 62](https://chromium.googlesource.com/chromium/src/+/cfaadc5a132d78e1828635aa8405a499f3e14864/services/device/compute_pressure/pressure_manager_impl.cc#43).

Test expectations: capture might increase CPU pressure during sustained work, but normal CPU load can do the same. Readable sparse capture with unchanged pressure rejects a mandatory signal. A page receiving an attacker-selected state while physical workload stays fixed confirms the override boundary. No prompt is needed for this test; an unavailable or policy-blocked API is an unsupported signal, not evidence of CDP.
