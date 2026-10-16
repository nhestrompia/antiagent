# Combined temporal noise, Runtime cost, and capture cover

Date: 2026-10-14. This tests the conjunction of the remaining opt-in defenses, rather than assuming their individual bypasses imply a combined bypass.

## Composition

`combined-defense.html?defense=combined` activates temporal noise, the pre-render Runtime-cost check, and the capture cover. It retains randomized positions, pointer-arrival rotation, trusted input, complete pointer transactions, Playwright event listeners, API consistency checks, and the locked canvas text method.

The capture cover checks hidden animation frames and the measured scrollbar geometry change. The Runtime check runs before controls appear. Temporal noise paints only the current partial text and changing noise. No unmasked frame cache is created.

The mode remains opt-in. Existing evidence shows that these guards can reject ordinary browser actions, and physical human and accessibility baselines remain unmeasured. The already-falsified 25 ms frame-gap detector is excluded because ordinary UI work trips it. Protected media overlays are excluded because prior tests did not show protection for the underlying canvas.

## Attacker

The raw WebSocket CDP client explicitly activates its target before navigation. It does not enable Runtime or Debugger in the bare configuration. It captures 64 frames for each decision, then takes the median of each color channel in the visible button region. OCR reads that reconstructed image. The agent reproduces motion and hover before clicking the recognized target.

The reconstruction uses the known public fixture geometry, not DOM or application-state inspection. A successful session uses 192 decision screenshots plus initial and final observations. That is this client's chosen budget, not a lower bound. Final OCR recognizes Task complete in the application's original rendering.

The first three fresh bare sessions completed all three decisions without a blocked state. This is a combined-mode bypass, not a result against separate guard configurations.

## Reproduce

With Vite and the offline OCR executable ready:

```sh
npm run benchmark:combined-guards
npm run verify:combined-guards
```

`MODES=bare,runtime-enabled` selects the adaptive client and the default Runtime positive control. The ordinary benchmark asserts the expected blocks and bypasses. The strict command then fails on any completed or unblocked session. Results live in `docs/combined-guards-results.json`; images live in `artifacts/combined-guards/`.

The opaque-frame generator now includes the capture-cover helper and follows the updated Runtime opt-in expression. It still disables only the incompatible reference-frame check in that separate sandbox fixture. The ordinary application retains that check.

The composition does not establish agent-proof access. The npm-only scope and the original prevention requirement remain unchanged.

The final six-case run used `MODES=bare,runtime-enabled` with strict acceptance enabled. Bare CDP completed 3/3 sessions, each with 194 screenshots and no Runtime or Debugger command. Default Runtime blocked 3/3 sessions before any decision. All expected-outcome assertions passed, then strict acceptance exited 1 with `Agent-proof acceptance failed: 3 sessions bypassed the guard`. The build and syntax checks passed.

After regeneration, the sandbox fixture's three-session bare-CDP regression also completed 3/3, with parent DOM access still denied. [Regression record](isolated-frame-regression-results.json). The earlier 12-case sandbox record is preserved separately rather than overwritten by the subset.
