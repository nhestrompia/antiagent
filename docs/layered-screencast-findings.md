# Layered renderer through CDP screencast

The client captures a PNG screencast stream from the current layered renderer. It acknowledges each frame, crops the choice region locally, aligns the text band, and reconstructs repeated columns. It clears buffered frames before each batch. It reads no app state through Runtime, Debugger, or DOM commands.

## Results

The first exact-color reader failed to recognize its first target in three sessions. The app remained unblocked. See [the exact-color pilot](layered-screencast-exact-pilot-results.json).

An adapted reader thresholds the columns into text and background before grouping them. Its eight-frame version completed the first decision in all three sessions. It then failed to recognize the amount choice. The diagnostics record one accepted click and an unblocked app in each session. See [the binary pilot](layered-screencast-binary-pilot-results.json).

The final reader waits 100 ms after motion and collects 16 frames per batch. Two sessions completed the first decision but then failed to read the amount. The third session was explicitly blocked with `expired-layout`. No session completed the full flow. See [the final results](layered-screencast-results.json).

These reading failures are incomplete attempts, not explicit prevention. The stream supplied useful information for an accepted action. No full-flow screencast bypass was established by this client. The separate [aligned screenshot client](jitter-aligned-results.json) still completed the full flow in three sessions.

## Reproduce and limits

Run `npm run benchmark:layered-screencast`. This command exits nonzero if any reading attempt remains incomplete. It records screenshots and diagnostics before reporting failure. It cannot convert an OCR failure into a protection success.

All current presentation and input experiments were enabled. The client used the ordinary clock. Frame acquisition differs from repeated screenshot requests, so a reader that succeeds on one path can fail on another.

The [capture-burst measurement](capture-burst-findings.md) also found no distinguishing animation-frame gap during screencast. No blocking timing rule was added. These results do not establish that the stream is intrinsically unreadable or protected. They establish the measured limits of these readers.

Script syntax and diff checks passed. The application build passed for the timing diagnostic milestone. This milestone changes the benchmark client and package commands, not application behavior.
