# Opaque-origin sandbox and screenshot agent

Date: 2026-10-14. Chrome 155.0.8059.40. This tests an application inside `sandbox="allow-scripts"` with no `allow-same-origin` token. It uses the existing development server and inlined generated application code, with no external deployment origin or application server.

## Candidate boundary

The sandbox forces a separate origin and restricts parent DOM access. That is a browser-enforced boundary between documents. It does not itself define a debugger screenshot veto. [HTML sandbox specification](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox).

The fixture generator combines the current canvas app and its guard helpers into the child document. The parent attempts to access the child's canvas and reports the exception name in its title. Every fresh case asserts `Isolated frame SecurityError` before input. This confirms the DOM restriction actually applies.

## Compatibility failure and adjustment

The initial fixture retained the app's nested reference-frame API check. That check failed with `api-integrity:inspection:SecurityError`, leaving a black UI before any agent action. This is an application compatibility failure, not successful protection.

The final generator disables that one incompatible reference check in the experimental child. It preserves randomized choices, pointer-arrival rotation, trusted input, the complete pointer transaction, Playwright event listeners, and the locked renderer. It also forces the optional Runtime-cost guard on. The ordinary application keeps its reference check unchanged.

This adjustment limits the finding: the test evaluates the sandbox-compatible fixture, not an intact sandboxed version of every existing guard. The generator asserts that the expected entry and guard expressions still exist rather than silently changing an unknown future implementation.

## Attack and results

The raw screenshot/OCR client uses no child-frame DOM access to choose actions. It captures the top-level viewport, reads the visible label, reproduces pointer motion and hover, then dispatches input at that location. Final screenshots show Task complete and the original application diagnostic reports three accepted decisions.

| Top-level CDP configuration | Fresh sessions | Parent DOM denied | Task completed |
| --- | ---: | ---: | ---: |
| No Runtime or Debugger commands | 3 | 3 | 3 |
| Runtime enabled | 3 | 3 | 3 |
| Runtime enabled, capture size zero | 3 | 3 | 3 |
| Runtime enabled then disabled | 3 | 3 | 3 |

All 12 final expected-outcome assertions passed. In the first adjusted run, the expectation that top-level Runtime would block the child failed. The final client actually attempts the task in that configuration too; it completed 3/3 sessions. This establishes that enabling Runtime on the top-level session did not trip this child-frame guard. It does not establish the behavior of a Runtime session attached directly to the child.

The [full result record](isolated-frame-results.json) includes selected coordinates, final screenshot OCR, and command inventories. Every bare session asserts that it used no Runtime or Debugger commands. Screenshots remain under `artifacts/isolated-frame/`.

## Decision

Opaque-origin isolation blocks parent JavaScript access but leaves screenshot/input task completion available. Do not present it as agent prevention. The npm-only, no-server scope remains unchanged.

## Reproduce

With Vite and the existing OCR tool ready:

```sh
npm run benchmark:isolated-frame
```

This regenerates `public/isolated-frame.html` from current source before testing. The generated file is a research fixture, not a package entry or production integration.
