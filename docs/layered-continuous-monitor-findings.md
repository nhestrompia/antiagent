# Continuous blocking while automation is active

The user clarified that human operation does not need to remain available while an agent controls the session. Blanking the app and rejecting actions is an acceptable response to detected automation. This does not waive the need to detect the surviving controller rather than blanket-block every browser.

The layered experiment now repeats the existing Runtime cost probe once per second after initialization. A suspected attachment latches the blocked state, paints the canvas black, and rejects further task actions. Monitoring stops after block, task completion, or page hide. It does not automatically resume on detach: the page has no established authenticated disconnect event.

The new client starts without Runtime, lets both detectors and DRM initialize, enables Runtime afterward, waits 2.2 seconds, and observes the app. This tests a controller arriving after the one-time startup checks. The paired bare client continues to use only browser screenshots and input. Results are saved in `layered-monitor-results.json`.

This remains a timing detector. Slow human hardware can trigger it, and privileged clients can suppress the measured Runtime overhead or avoid Runtime entirely. The earlier `runtime-cost-findings.md` documents the stack-size-zero and disabled-Runtime routes. Continuous repetition closes a startup-only gap; it does not convert the signal into an authenticated presence detector.

No renderer claims are changed. The DRM overlay protects a video stream, not the underlying canvas, and the screenshot/input-only agent must still be tested against the whole composition. Human readability, accessibility, and false-positive rates remain unvalidated. A blank surface on a known signal is a useful measured behavior; an incomplete screenshot command is not counted as successful prevention.

The final six-session matrix blocked late Runtime attachment in 3/3 and allowed the screenshot/input-only client to complete in 3/3. All cases finished without recorded errors. The continuously monitored composition is still not agent-proof.
