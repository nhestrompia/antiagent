# Temporal noise iteration

Date: 2026-10-14. Chrome 155.0.8059.40; Playwright 1.64.0.

## Defense

The new `?temporal=noise` research mode reveals half the text columns per frame. It replaces the other columns with random black or white pixels. The previous brightest-pixel reconstruction saturates the buttons with white and loses their labels.

This mode remains opt-in. Human readability, flicker, accessibility, and performance are untested. We must not count a display that also prevents human use as successful protection.

## Results

Each row contains three fresh sessions. The attacker reads only captured pixels to choose its actions. It retains the earlier movement and hover sequence.

| Capture strategy | Browser mode | Completed | Outcome |
|---|---|---:|---|
| Maximum of 16 frames per decision | Headless | 0/3 | No first target recognized |
| Maximum of 16 frames per decision | Visible | 0/3 | No first target recognized |
| Median of 64 frames per decision | Headless | 3/3 | Three clicks each |
| Median of 64 frames per decision | Visible | 1/3 | Other sessions stopped at steps 0 and 2 |
| Mean of 64 frames per decision | Visible | 1/3 | Other sessions stopped at steps 0 and 2 |

The median reconstructs the persistent text signal despite changing noise. The mean attack averages each channel, then restores contrast using the known noise distribution. Both try raw and contrast-corrected OCR images.

A completed 64-frame session uses 192 screenshots. This is the tested client's budget, not a lower bound. Failed sessions stopped because OCR did not find a target. The application did not identify or reject those clients.

These outcomes show resistance to the earlier reconstruction algorithm. They also show that an adapted screenshot client can still use the app.

## Reproduce

With Vite and the local OCR test tool ready:

```sh
NOISE=1 node scripts/benchmark-temporal-defense.mjs
HEADED=1 NOISE=1 node scripts/benchmark-temporal-defense.mjs
HEADED=1 NOISE=1 STRATEGY=frame-mean node scripts/benchmark-temporal-defense.mjs
```

[Headless results](temporal-noise-headless-results.json), [visible median results](temporal-noise-headed-results.json), [visible mean results](temporal-noise-frame-mean-headed-results.json).
