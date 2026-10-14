# Pointer arrival iteration

Date: 2026-10-14. Chrome 155.0.8059.40, Playwright 1.64.0.

The first trusted pointer movement rotates the three choices once per decision. The previous target position becomes incorrect. Pointer continuity checks remain active.

The previous movement-and-hover attacker failed in 3/3 trials. Its screenshot preceded pointer arrival, so its click selected the wrong choice. The original direct-click attacker also failed in 3/3 trials.

A reactive client moved into the canvas first, captured the updated choices, then moved to the correct choice and waited before clicking. It completed 3/3 sessions in three clicks each. It needed no page-state inspection during the task and no changes to the guard.

The four earlier default detection strategies remained blocked in 3/3 trials each. All 21 test cases matched their expected outcomes. The test runner now targets this iteration; the pointer-continuity JSON preserves its earlier results.

The layout change adds a usability cost. It can invalidate a human's first intended target too. No physical human baseline or accessibility test exists. Do not treat this experiment as a production improvement without measuring that cost.

[Results](pointer-arrival-results.json), [attacker](../scripts/benchmark-combined-defense.mjs). Run the attacker with the existing local OCR tool and Vite server.
