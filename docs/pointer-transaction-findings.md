# Pointer transaction hardening

Date: 2026-10-14.

The previous combined defense accepted a press on one choice followed by a drag and release on another choice. The screenshot/OCR/CDP client completed the decisions this way. The new regression assertion failed against that implementation because the session did not block.

The guard now binds a press to its pointer ID and choice. It requires a trusted primary left-button press, a matching release, and a matching click. Moving to another choice during the press blocks the session. Pointer cancellation, leaving the canvas, and window blur clear the authorization. The click consumes it.

The attacker reads labels from viewport screenshots with local Vision OCR. It does not inspect layouts or application state during the task. It reads the diagnostic outcome after input ends. The release-swap case deliberately dwells on another choice before dragging to the recognized target.

Run the local Vite server and the existing compiled OCR tool, then run:

```sh
node scripts/benchmark-combined-defense.mjs
```

For the new regression alone:

```sh
STRATEGIES=release-swap node scripts/benchmark-combined-defense.mjs
```

Fresh results and screenshots live in `artifacts/combined-defense/`. Historical pointer-arrival results stay unchanged. `STRATEGIES` selects a comma-separated subset of cases.

The adaptive screenshot agent still completed three fresh sessions after this change. The guard checks input consistency. It does not establish human identity or prevent a controller from reproducing the valid sequence. Physical human and accessibility baselines remain untested. The requested agent-proof result remains unachieved.

The final matrix ran 24 fresh-page cases in Chrome 155.0.8059.40 with Playwright 1.64.0. The release-swap attack blocked in 3/3 cases with `pointer-transaction`, before any decision counted. All six earlier blocked strategies remained blocked in 3/3 cases each. The reactive screenshot agent completed in 3/3 cases. All outcome assertions passed. The build and diff whitespace checks passed.

An initial post-change run failed the reactive expectation. A separate retry also hit `pointer-continuity`. The final runner increases its hover delay from 180 to 300 ms, and all three reactive sessions complete. These earlier failures show that the input timing checks can reject a controller intermittently. They do not establish agent prevention.
