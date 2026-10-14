# Agent-proof completion audit

Date: 2026-10-14. The objective remains a browser-only npm package that prevents adaptive agents from using developer applications, with no application server, managed browser, native component, or extra user verification step. No weaker success criterion replaces it.

## Current authoritative evidence

| Requirement | Evidence | Verdict |
| --- | --- | --- |
| Adaptive screenshot/input agents cannot complete the task | Ordinary Playwright completes 3/3 sessions in [API results](playwright-api-bypass-results.json). Bare CDP completes 3/3 sessions against the opt-in composition in [combined results](combined-guards-results.json). | Contradicted |
| Protection runs entirely in website code | Current guard modules use browser APIs. Vite and OCR are test infrastructure. No managed policy or native component was introduced. | Scope preserved |
| Developer npm artifact provides the claimed guarantee | `package.json` remains private, version 0.0.0, with no public package entry or protection contract. The core prevention mechanism is not established. | Incomplete |
| Human use needs no extra verification step | No challenge, installation, or additional identity step was added. Pointer constraints, flicker, false positives, and accessibility remain unvalidated. | Unproven usability |
| Each measured milestone is committed | The branch records separate commits for pointer transactions, Playwright API bypass, Runtime cost, opaque-origin isolation, and low-latency canvas. The composition milestone commits its own implementation and evidence. | Recorded in source control |
| Acceptance proves agent prevention | `verify:agent-proof` and `verify:combined-guards` fail on known successful agents. Passing expected-outcome benchmarks alone is not a prevention result. A finite attack matrix is a necessary check, not proof against every future agent. | Failed |

## Remaining boundary

The successful bare client uses browser-level viewport capture and input. It does not require optional Playwright injection, Runtime, Debugger, DOM access, or application-source modification. It reconstructs the visible labels and passes the original action handlers.

The reviewed [CDP source paths](cdp-enforcement-boundary-followup.md) contain no page-owned screenshot veto or public unforgeable human-input attestation. Runtime overhead is mutable by the debugger, as [source and live tests](runtime-cost-findings.md) establish. [Opaque-origin isolation](isolated-frame-findings.md) protects one document from another document, while screenshots remain readable to the browser controller. [Low-latency canvas](desynchronized-canvas-findings.md) did not protect the tested macOS browser. [Temporal reconstruction](temporal-noise-findings.md) and the new composed test recover labels from changing frames.

The current blocker is the lack of a supported enforcement boundary available to this npm runtime that excludes the surviving browser controller. Adding checks for caller-selected timings or optional commands does not close the demonstrated channel. Blanking the app for ordinary users, reporting a fabricated failure, or renaming deterrence as agent-proof would not satisfy the objective.

This audit does not prove that every future browser feature is incapable of helping. It records that the current application fails the requirement and that reviewed supported mechanisms do not establish the required boundary. A new browser-owned capture/input restriction usable by page code would be an external-state change relevant to the existing scope. Browser administration, native enforcement, and server verification remain outside the user's authorized solution.

The goal must not be marked complete on the basis of the current tests, builds, documentation, or commits.
