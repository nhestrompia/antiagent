# Combined defense and adversarial task test

Test date: 2026-10-14. Chrome 155.0.8059.40; Playwright 1.64.0.

## Outcome

The combined defense blocks several default automation paths. It does not meet the requested goal of a defense this assistant cannot break. I completed the task using screenshots and coordinate clicks. A repeatable screenshot/OCR/CDP client also completed three randomized sessions.

## Implementation

The experiment combines canvas-only controls, random choice positions, Playwright target-event listeners, trusted-input checks, webdriver detection, API integrity checks, and a locked canvas text method. It keeps task state and layouts in module scope. A wrong choice locks the session. This restriction can also penalize human mistakes.

It listens for the injected-runtime events too, but does not repeatedly remove the document root. That earlier experimental probe lacks application compatibility evidence. DRM overlays are absent because prior tests showed that they do not obscure this canvas in compositor captures.

## Tests

| Strategy | Trials | Blocked | Task completed |
|---|---:|---:|---:|
| Default Playwright | 3 | 3 | 0 |
| Locator clicks with webdriver flag suppressed | 3 | 3 | 0 |
| Script-created clicks with flag suppressed | 3 | 3 | 0 |
| Canvas text wrapper installed before load | 3 | 3 | 0 |
| Screenshot OCR and raw CDP mouse input | 3 | 0 | 3 |
| This assistant, screenshot and coordinate tools | 1 | 0 | 1 |

The screenshot client launches Chrome with `--disable-blink-features=AutomationControlled`. It captures the viewport through `Page.captureScreenshot`. Local macOS Vision OCR reads the choice labels. It then sends `Input.dispatchMouseEvent` at the recognized coordinates. It reads the diagnostic outcome only after its three actions. It does not inspect application state, intercept drawing calls, or suppress event listeners.

An initial OCR run read “Confirm” as “Contirm” and failed exact text matching. The final client tolerates up to two text edits. That changes the attacker, not the defense. All final sessions completed in three clicks without a blocked state.

The assistant used three visual observations and three coordinate clicks. The final page reported step 3, clicks 3, completed true, and blocked false. This run used the collaborative Chromium browser; the automated runs used installed Chrome.

## Limits

Passing the test assertions means the recorded blocks and bypasses match expectations. It does not mean the protection succeeded. No physical human baseline, accessibility review, or React integration test was performed. This remains a research fixture, not a release-ready SDK.

## Reproduce

Run the Vite development server. On macOS, compile the offline OCR test tool and run the benchmark:

```sh
swiftc -module-cache-path /private/tmp/anti-agent-swift-cache scripts/ocr-capture.swift -o /private/tmp/anti-agent-ocr
node scripts/benchmark-combined-defense.mjs
```

OCR is test infrastructure only. The website requires no additional server or OCR dependency.

[Results](combined-defense-results.json), [defense implementation](../src/combined-defense.js), [attack runner](../scripts/benchmark-combined-defense.mjs).
