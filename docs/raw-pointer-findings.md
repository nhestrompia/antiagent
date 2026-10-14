# Raw input and pointer-lock tests

Date: 2026-10-14. Chrome 155.0.8059.40; Playwright 1.64.0.

## Raw pointer data

The fixture listens before input for pointerrawupdate, pointermove, mousemove, pointerdown, mousedown, and click. It records trust, coordinates, movement, coalesced samples, predictions, and source capabilities. Each strategy uses three fresh pages.

| Strategy | Raw updates per trial | Maximum coalesced samples | Maximum predictions |
|---|---|---|---|
| Serial Playwright mouse | 9, 9, 9 | 1, 1, 1 | 0, 0, 0 |
| Serial direct CDP mouse | 9, 9, 9 | 1, 1, 1 | 0, 0, 0 |
| Burst of 64 direct CDP moves | 3, 5, 3 | 56, 50, 48 | 10, 10, 10 |
| Direct CDP touch | 7, 7, 7 | 1, 1, 1 | 0, 0, 0 |

All strategies produced trusted raw updates and nonzero pointer movement. Serial mouse moves used 20/10 deltas. The burst client received browser-generated coalescing and predictions. It did not replace getters or construct event objects in page JavaScript.

A guard that requires raw updates, multiple coalesced samples, or predictions would therefore accept an adapted CDP client. These fields are not sufficient evidence of physical human input.

## Pointer lock

Visible Chrome failed acquisition in 3/3 trials with WrongDocumentError. This is an acquisition failure, not a test of locked input or a protection success. Native computer use returned no Chrome window during a separate inspection attempt, so no physical-input control exists.

Headless Chrome acquired pointer lock in 3/3 trials. While locked, public coordinates remained fixed and direct CDP supplied trusted movement deltas of 20/10. Each trial confirmed the actual pointerLockElement and observed nonzero movement while the lock remained active.

Chrome's documentation records that the planned pointer-lock permission rollout was withdrawn. Do not infer current behavior from the article's older title. These tests rely on actual acquisition state. [Chrome update](https://developer.chrome.com/blog/keyboard-lock-pointer-lock-permission?hl=en).

## Decision

No new detector enters the application from this experiment. The tested CDP client already supplies the proposed signals. This is not a comparison of every physical and synthetic input distribution.

[Source review](raw-pointer-source-research.md), [raw results](raw-pointer-results.json), [visible lock results](pointer-lock-results.json), [headless lock results](pointer-lock-headless-results.json).

Run `node scripts/benchmark-raw-pointer.mjs`, `node scripts/benchmark-pointer-lock.mjs`, or `HEADLESS=1 node scripts/benchmark-pointer-lock.mjs` with Vite running.
