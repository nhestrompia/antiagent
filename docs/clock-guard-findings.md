# Action-time clock checks

The opt-in `clock=on` mode measures synchronous work during pointer down. It rejects a median cost of exactly zero with `clock-stalled`. The cost probe captures the native clock function when its module loads. A later replacement of `performance.now` therefore does not change that reference.

This runs at the action boundary. It does not depend on a periodic monitor that a paused browser clock can stop.

## Measured results

The previous virtual-time client was blocked in **3/3 sessions**. Each result records `clock-stalled` and `actionClockMs: 0`. See [the virtual-time results](clock-guard-virtual-results.json).

An adapted client used the ordinary clock. It omitted the initial full-page screenshot and the 100 ms wait before each reconstruction. It captured eight-frame batches, reconstructed repeated columns, and supplied the same trusted motion and dwell sequence. It could retry a batch when OCR failed.

That client completed the full task in **3/3 sessions**. All current opt-in layers were active, including layout freshness, decoy glyphs, the clock check, DRM, and both detectors. The final diagnostics verified playback and allowed detectors. The command records contain no Runtime, Debugger, or DOM commands. See [the lean-client results](clock-guard-lean-results.json).

The stalled-clock check closes the tested virtual-time route. It does not close ordinary screenshot reconstruction and input. The browser still supplies readable pixels and accepts controller-generated trusted input.

Run `npm run benchmark:clock-guard-virtual` and `npm run benchmark:clock-guard-lean` to repeat the paired clients. Add `--require-blocking` to reject any surviving session. A normal benchmark pass is not an agent-proof acceptance result.

## Limits

The check remains opt-in. Coarse clock precision can cause zero measurements for a legitimate browser. Human operation and false-positive rates remain unvalidated. The clock reference is captured inside browser code, not a hardware attestation. Privileged script replacement and debugger manipulation require separate countertests. The ordinary-clock bypass already rejects a prevention guarantee without those capabilities.

The build, script syntax check, and diff check passed. The DRM bundle still produces the existing large-chunk build warning.
