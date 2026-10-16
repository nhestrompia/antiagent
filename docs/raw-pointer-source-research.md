# Raw pointer source review

Research date: 2026-10-14. Input, mouse, and pointer sources use Chromium 155.0.8059.40. The pointer-lock source uses current main.

## Movement conversion

MouseEventManager derives ordinary movement deltas from current and previous screen positions. A missing movement argument in CDP does not imply zero DOM movement. [Pinned mouse conversion](https://github.com/chromium/chromium/blob/155.0.8059.40/third_party/blink/renderer/core/input/mouse_event_manager.cc).

InputHandler builds events from supplied positions, timestamps, buttons, and pointer properties. It converts widget positions to screen positions before delivery. Downstream mouse conversion can supply movement values. [Pinned input handler](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/devtools/protocol/input_handler.cc).

## Raw and derived events

PointerEventManager converts coalesced and predicted mouse-event vectors into pointer-event vectors. Its chorded-button branch can also dispatch raw updates when a listener exists. That branch does not reject debugger input in the reviewed source. [Pinned pointer conversion](https://github.com/chromium/chromium/blob/155.0.8059.40/third_party/blink/renderer/core/input/pointer_event_manager.cc).

The event-queue and prediction sources were not fully retrieved. The live tests nevertheless show that direct CDP can produce trusted raw updates, multiple coalesced samples, and predicted events. A protocol command need not accept those arrays directly for the browser to generate them later. [Live findings](raw-pointer-findings.md).

## Pointer lock

The current pointer-lock controller forwards supplied mouse events and their coalesced and predicted vectors through targeted event handling. It supplies fixed lock coordinates. The reviewed dispatch function does not reject debugger input. The exact pinned controller source was unavailable. [Current controller](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/page/pointer_lock_controller.cc).

Headless Chrome acquired the lock in all three live trials. CDP then generated trusted nonzero movement while public coordinates stayed fixed. Visible-Chrome acquisition failed; it supplies no positive protection evidence.

These tests reject categorical claims that raw updates, movement, coalescing, prediction, or pointer lock require physical input. They do not establish identical distributions for every human device. No physical human baseline exists.
