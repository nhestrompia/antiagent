# Temporal rendering iteration

Date: 2026-10-14. Chrome 155.0.8059.40, Playwright 1.64.0.

## Implementation

The opt-in `?temporal=on` mode splits button text across four vertical pixel phases. Each animation frame reveals one randomly selected phase. Task positions remain stable after the pointer-arrival rotation. The full frame stays in a module-scoped offscreen canvas.

This experiment asks whether one captured frame contains less useful text than the live sequence. It does not establish that humans can read that sequence comfortably. The mode remains off by default.

## Attack

The client first triggers the pointer-arrival rotation. It then captures either one frame or 16 frames per decision. For multiple frames, it takes the maximum of each color channel at each pixel. This reconstructs the light text on the dark button background.

Local OCR reads both the raw reconstruction and a contrast-corrected version. The client tolerates text recognition errors, chooses the matching label, reproduces pointer movement and hover, and sends raw CDP mouse input. It reads the task outcome only after its actions finish.

The client uses 48 screenshots for a completed three-decision session. This is its chosen capture budget, not a proven minimum. It never inspects task state or rendering calls to select a button.

## Results

See the result files for every final session. Headless Chrome single-frame OCR stopped without finding the first target in 3/3 trials. Headless multi-frame reconstruction completed 3/3 trials. Visible-Chrome multi-frame reconstruction also completed 3/3 trials. Its outcomes are recorded separately.

Early visible-Chrome trials recovered readable text but sometimes failed OCR matching. A contrast-only client completed 2/3 sessions. The final client tries raw and corrected images. Those OCR changes modify the attacker, not the defense. An earlier visible-Chrome run also ended without a complete record during page creation; it contributes no success claim.

These results refute capture resistance against the tested multi-frame client. A failed OCR lookup does not prove that this assistant or another visual model cannot understand a single frame.

## Limits

Human readability, flicker, accessibility, CPU cost, and mobile behavior remain unmeasured. The prototype uses desktop pointer requirements and shifts controls on pointer arrival. These changes can impair ordinary use. They are research modes, not release defaults.

## Reproduce

Start Vite and compile the existing macOS OCR tool, then run:

```sh
node scripts/benchmark-temporal-defense.mjs
HEADED=1 node scripts/benchmark-temporal-defense.mjs
```

[Headless results](temporal-defense-results.json), [visible-Chrome results](temporal-defense-headed-results.json), [attack runner](../scripts/benchmark-temporal-defense.mjs).
