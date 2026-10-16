# Capture-prevention leads checked on 2026-10-15

This pass checks newer browser privacy rendering, a recent commercial rollout, and a published visual distortion method. None currently establishes the required browser-only CDP boundary.

## HTML-in-Canvas

The new read-back-allowed rendering mode excludes browser-owned private information when creating readable canvas images. It does not describe an author flag for hiding arbitrary app content from the browser debugger. The reviewed CDP handler uses a different snapshot path. See the [source review](html-readback-cdp-review.md) and [primary explainer](https://wicg.github.io/html-in-canvas/).

The installed visible Chrome reports version `155.0.8059.40`. The probe found no `captureElementImage`, `drawElementImage`, or `requestPaint` method. The canvas also lacked a `layoutSubtree` property. The probe supplied no canvas feature flag or origin-trial token. See [the capability record](html-readback-capabilities.json).

Run `npm run probe:html-readback` to repeat the probe. This is an API-availability check, not a screenshot-protection test. Runtime evaluation reads only the blank test document's capabilities. The separate [headless probe](html-readback-headless-capabilities.json) is retained as a pilot.

## SnapShield commercial rollout

Captura's October 7 pilot documentation reports blackout protection during supported capture activity. It also describes blur, right-click handling, and reporting. Its scope excludes some shopping screens. The same document explicitly limits the guarantee across capture methods. These are vendor claims, not results from this project. [Captura documentation](https://support.captura.io/en/articles/14278785).

The public SnapShield FAQ likewise says detection can be bypassed and does not promise complete prevention. Its public demo illustrates partial-image blur and a visibility toggle. The reviewed public material does not establish a CDP-specific browser capability or provide a tested production deployment here. [SnapShield homepage and FAQ](https://getsnapshield.com/).

I created no account and tested no deployed customer gallery. The public marketing demo is not proof that the production SDK succeeds or fails against CDP. This remains an external lead that needs a representative SDK or deployment for an empirical comparison. This project contains no copied vendor code.

## Persistence-of-vision research

The CVPR 2015 paper models human recovery from distorted frames through additive blending. Its equation 3 makes the sum of distorted frames equal the original image multiplied by the frame count. It does not claim complete elimination of capture risk. [Original paper](https://www.cv-foundation.org/openaccess/content_cvpr_2015/papers/Chia_Protecting_Against_Screenshots_2015_CVPR_paper.pdf).

Inference: a multi-frame attacker must be tested against that recovery rule. The arithmetic model itself is not a human-only secret. This pass did not reproduce the paper's algorithm or human study. The project's temporal renderers are separate experiments, not a replication of that paper.

## Decision

No new blocking rule follows from these sources. The concrete local result is that the privacy-rendering API is unavailable under the tested conditions. The commercial claim remains unverified against the target threat. The visual distortion paper motivates another reconstruction countertest, not a capture-exclusion guarantee.
