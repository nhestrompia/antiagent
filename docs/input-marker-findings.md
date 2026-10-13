# Debugger input marker experiment

The browser internally distinguishes debugger input. This lab tests whether a website can use that distinction to reject actions.

The guard accepts a click only when isTrusted is true and getModifierState reports neither FromDebugger nor Debugger. It also records ordinary modifiers, sourceCapabilities, pointer fields, coalesced events, predicted events, and user activation.

| Input path | Trials | Actions accepted |
| --- | --- | --- |
| DOM element.click() | 3 | 0 |
| Playwright locator.click() | 3 | 3 |
| Direct CDP mouse input | 3 | 3 |
| Direct CDP pen input | 3 | 3 |

All events reported both proposed debugger modifier names as false. Playwright and direct CDP clicks had isTrusted=true and active user activation. Their sourceCapabilities reported firesTouchEvents=false. The direct pen path changed pointer type and pointer-down pressure through CDP parameters. These fields do not supply a debugger attestation in the tested paths.

The DOM-click control also had active user activation in this automated context. That field alone cannot establish a human action. Its click event was untrusted, so the guard rejected it.

This is not a native human-input comparison or proof that no event difference exists. It tests the proposed modifier guard and records the other fields for analysis. See [results](input-marker-results.json) for the Chrome version and all 12 cases, and [source research](debugger-input-marker-research.md) for the internal flag conversion.

Run npm run dev, then node scripts/benchmark-input-marker.mjs. The page is /input-marker.html. No runtime protection was promoted from this failed guard.
