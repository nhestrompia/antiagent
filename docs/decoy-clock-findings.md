# Decoy glyphs and controlled browser clocks

The opt-in `mask=decoy` renderer fills hidden columns with random text. It uses the same font, green background, and white foreground as the real choices. This removes the grayscale-versus-color distinction that the earlier screenshot client used.

The four-frame color-column client failed to recover its first target in all three trials. These were OCR failures with the app still unblocked. They do not establish prevention. See [the color results](decoy-color-results.json).

An adapted client groups identical columns across frames and chooses the most frequent version. It preserves stable background columns as well as text columns. It accepts extra OCR letters when the expected label remains recognizable. Numeric choices must retain the exact expected digit group. The previous edit-distance allowance could confuse `250 EUR` with `125 EUR`.

With eight frames and the ordinary clock, the adapted client was blocked after some input. See [the adapted results](decoy-stable-adapted-results.json). An earlier reader incorrectly favored decoy strokes over stable blank columns. Its separate results remain in `decoy-stable-results.json`.

## Virtual-time bypass

Chrome's `Emulation.setVirtualTimePolicy` replaces real time with a synthetic source. A budget limits advancement and emits an event when it expires. This protocol is available to the controller, without enabling Runtime or Debugger. [The protocol definition](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Emulation.pdl) documents those controls.

The client pauses virtual time after application readiness. It advances 17 ms between captured frames and supplies controlled time for the motion and dwell checks. OCR and screenshot processing can take wall-clock time without consuming the layout deadline.

The final client completed all three original decisions in **3/3 sessions**. It used 16-frame cropped screenshots and repeated-column reconstruction. It issued no Runtime, Debugger, or DOM commands. DRM playback was verified, both browser detectors allowed the client, and the application remained unblocked. See [the final results](decoy-virtual-final-results.json).

The earlier adapted virtual-time run completed two sessions and had one capture timeout. Other pilots contain OCR failures or a capture timeout. These remain separate evidence files. The diagnostic pilot records one completed decision and an unblocked application in two incomplete sessions. No protocol timeout counts as protection.

Run `npm run benchmark:decoy-color` and `npm run benchmark:decoy-virtual` to repeat the final clients. The normal command can pass while recording a successful agent. Add `--require-blocking` to reject a bypass.

## Limits and next checks

This is a renderer experiment, not the package default. Human readability and accessibility remain unvalidated. The decoy text can make reading harder. Stable real pixels still permit reconstruction. Browser-controlled deadlines do not prove human input.

The next local check is action-time detection of a stalled clock. It must be tested against ordinary input and adapted controllers. Coarse timer precision can create false positives. Separate [source research](chrome-capture-next-candidates.md) identifies Document Picture-in-Picture as a target-separation experiment. No reviewed source promises protected screenshots for it.
