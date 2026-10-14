# Layout freshness against screenshot/input agents

The opt-in `?defense=layered&fresh=on` experiment rotates choices every three seconds. It binds pointer transactions to the layout generation at the start of motion. It rejects a press from an expired generation.

The first implementation postponed rotation throughout an armed press. The current implementation limits that exception to 500 ms. A timer blocks a held press, and pointer release also checks elapsed time. Cancellation, pointer leave, and window blur invalidate the armed layout. These checks do not detect screenshots or prove human input.

## Original client and held-capture bypass

The original 64-frame median client could not read an exact choice label in three trials. The app remained unblocked. These are incomplete attempts, not explicit prevention successes. [The results](freshness-slow-results.json) retain the OCR failures.

An adapted client pressed a choice, captured the stable layout, cancelled outside the canvas, then selected the observed answer. Before the press limit, it completed one of three sessions. Another session was blocked, and one had an OCR failure. [The results](freshness-hold-results.json) establish a bypass of that earlier implementation.

After the limit, the slow held-capture client hit `expired-layout` twice and had one OCR failure. [The slow results](freshness-bounded-hold-slow-results.json) do not directly prove the press timer works.

A cropped 32-frame held-capture client was blocked in three sessions. One hit `press-expired`, and two hit `expired-layout`. [The bounded-hold results](freshness-bounded-hold-results.json) verify an actual timer rejection in one session.

## Adaptive cropped screenshots

Visible columns retain the colored button background. Hidden columns contain grayscale noise. The adaptive reader chooses the frame with the most colored pixels for each column. It reconstructs the choices without a 64-frame median.

The final client captures only the choices, uses four frames, and accepts an OCR edit distance of two. It uses four motion samples and a 170 ms dwell. These values satisfy the original input checks. It starts after readiness and issues no Runtime, Debugger, or DOM commands.

[The four-frame results](freshness-fast-results.json) contain one complete session and two `incorrect-decision` blocks. The successful session completed all three original actions with DRM verified and both detectors allowing the browser. Its three reconstruction batches, including OCR, took 304, 308, and 285 ms. This is a full-stack screenshot/input bypass of the current implementation.

[The eight-frame results](freshness-crop-8-short-results.json) completed two decisions in each session, then hit `expired-layout` on the third. Earlier full-page and waiting clients were blocked. Their results remain separate. The 32-frame cropped pilot had OCR errors and lacked full-page block diagnostics. The eight-frame median pilot overlapped a source change and is not clean evidence.

The initial server-unavailable run remains in `freshness-server-pilot-results.json`. No infrastructure failure counts as a block.

Run `npm run benchmark:layout-fast` and `npm run benchmark:layout-bounded-hold` to repeat the final clients. A normal benchmark pass means it recorded the expected outcomes. It does not mean the application is agent-proof. `--require-blocking` rejects any successful or unblocked session.

## Limits

This remains an opt-in experiment. Human usability and accessibility are unvalidated. Long presses can cause blocks. Motion from an older generation can remain stale until a new task starts. An idle human can therefore hit the same checks. Shorter deadlines do not establish human input provenance, and the renderer still supplies useful screenshot pixels.
