# Debugger input marker and DOM exposure

Research date: 2026-10-14. Sources use Chromium 155.0.8059.40 where available. Current-main sources appear separately below.

## Internal marker

Pinned InputHandler seeds kFromDebugger before adding requested keyboard and button modifiers. CDP can specify pointer type, pressure, tilt, twist, and timestamps. Dispatch converts widget coordinates to screen coordinates. Equal screen and client coordinates are therefore not an inherent debugger identifier. [Pinned InputHandler](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/devtools/protocol/input_handler.cc).

## DOM conversion

Pinned MouseEventManager converts modifiers through SetFromWebInputEventModifiers. It computes sourceCapabilities from the touch flag, independently of debugger provenance. The reviewed path has no public debugger property. [Pinned mouse conversion](https://github.com/chromium/chromium/blob/155.0.8059.40/third_party/blink/renderer/core/input/mouse_event_manager.cc).

I could not retrieve the pinned UIEventWithKeyState implementation. Current main copies a fixed list of conventional modifier bits. Its getModifierState identifier table has no Debugger or FromDebugger entry. Unknown names return false. This source does not establish every detail of the pinned conversion chain. [Current conversion and lookup](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/events/ui_event_with_key_state.cc).

Current-main pointer events use the same modifier conversion. The factory marks generated events trusted. Coalesced events therefore do not expose the native modifier mask through this reviewed path. [Current pointer factory](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/events/pointer_event_factory.cc).

Current-main keyboard construction retains native modifiers internally. That does not make them accessible to JavaScript. The reviewed constructor and modifier lookup have no public debugger getter. [Current keyboard constructor](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/events/keyboard_event.cc).

## Live result and limits

The parent agent ran 12 cases. DOM.click failed the trusted-event guard in all three trials. Playwright click, CDP mouse, and CDP pen each passed in all three trials. Both debugger modifier probes returned false. CDP input supplied trusted events and active user activation. See [results](input-marker-results.json) and [findings](input-marker-findings.md).

No public debugger attestation emerged from these paths. The test does not compare physical human input or exhaust all event fields. Future candidates need physical input, parameterized CDP input, keyboard and touch alternatives, and action-completion checks. A field difference alone does not establish prevention.
