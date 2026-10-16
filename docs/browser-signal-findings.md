# GPU, idle, and video measurements under CDP

These tests compare visible Chrome screenshot bursts with ordinary CPU and GPU work. The page submits its own WebGPU compute commands, measures queue completion and GPU timestamps, records idle deadlines, and observes a canvas-stream video. A separate pair pauses the video before measurement.

Each fresh browser uses a 1000 by 800 viewport. Capture modes repeatedly request full viewport or cropped compositor screenshots. Idle modes take their evidence image after measurement. Vision OCR must recover SIGNAL TOKEN 4826 from the first and last images, and a CDP mouse click must complete the button action. Runtime and Debugger commands are absent. These are signal tests, not tests of a new production guard.

The repeat passed all 21 trials: every first and last image was readable, and all 21 button actions completed. WebGPU timestamp queries, idle callbacks, and video callbacks were available on the Apple Metal adapter.

| Mode, three trials each | Median queue time, ms | Median idle deadline, ms | Video callbacks |
| --- | --- | --- | --- |
| Idle | 1.4 to 1.5 | 7.8 | 96 |
| Full screenshot burst | 0.8 to 0.9 | 8.1 to 8.2 | 96 |
| Cropped screenshot burst | 1.4 | 7.7 | 96 |
| CPU work | 1.1 to 1.2 | 7.9 to 8.1 | 84 to 90 |
| GPU work | 2.4 to 2.6 | 7.8 to 7.9 | 96 |
| Paused video, screenshots | 0.8 to 0.9 | 8.1 to 8.2 | 0 |
| Paused video, idle | 1.5 | 7.9 | 0 |

Every trial had a median GPU pass duration of 0.131072 ms and median idle-callback and animation-frame intervals of about 8.3 ms. These medians are not evidence that every individual sample was identical. Queue timing changed with capture size and ordinary workload; cropped capture stayed within the idle range.

One route-specific result deserves further study: cropped bursts increased the reported dropped-video-frame count by 92 to 94, while full viewport bursts increased it by zero. All these trials still produced readable images and accepted input. A dropped-frame gate therefore misses the demonstrated full viewport route. The crop excluded the video region; this test does not establish why its playback counter changed.

No tested signal supplies a required capture notification. There is no new production detector from this milestone.

The first 21-case pilot had six invalid foreground controls. The harness preserved their samples and failed the run. The repeat adds Page.bringToFront and waits for real page focus and visibility before starting. It does not use a focus-state override. Visibility and focus are checked again at the end; they are not sampled continuously.

The page reports its samples to a temporary loopback endpoint owned by the test harness. That endpoint collects evidence without injecting Runtime evaluation. It is not a package backend or a proposed requirement for developers.

GPU timestamps cover only the measured compute pass. The GPU load control adds eight passes before that pass, so queue completion can increase while the measured pass duration stays fixed. Timestamp quantization further limits this measurement. Neither metric observes all compositor work.

The paused-video comparison tests whether screenshots cause fresh video callbacks. A readable screenshot with no callback defeats a rule that requires a callback for every capture. It does not prove that all media pipelines behave the same way.

Raw repeat results are in browser-signal-results.json. The failed pilot is in browser-signal-pilot-results.json. Run npm run benchmark:browser-signals with Vite on port 5173 and the local Vision OCR helper installed. Source contracts and limits are in browser-signal-review-2026-10-16.md. The pinned Chromium source is 155.0.8059.40; the measured browser is 155.0.8059.80.
