# Pointer continuity iteration

Date: 2026-10-14. Chrome 155.0.8059.40, Playwright 1.64.0.

The canvas now requires four trusted pointer movements, 32 canvas pixels of travel, 120 ms of motion, and 150 ms in the selected slot. A pointer press arms the subsequent click. Each decision resets the movement record.

The previous screenshot/OCR/CDP attack failed in 3/3 trials with reason `pointer-continuity`. An adapted client sent eight mouse movements 30 ms apart, waited 180 ms, and clicked. It completed all three decisions in 3/3 trials. Default Playwright, locator, synthetic click, and renderer-hook strategies remained blocked in 3/3 trials each.

This adds interaction requirements that direct CDP can reproduce. It does not identify human input. No physical human baseline exists. Fast clicks, keyboard input, touch input, and assistive technology need separate design. These restrictions remain experimental and must not become package defaults from this evidence.

Run `node scripts/benchmark-combined-defense.mjs` after compiling the existing offline OCR tool and starting Vite. The runner now checks this iteration. The prior combined-defense JSON remains the baseline record.

[Results](pointer-continuity-results.json), [implementation](../src/combined-defense.js), [attacker](../scripts/benchmark-combined-defense.mjs).
