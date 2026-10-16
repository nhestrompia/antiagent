# Blocking CDP from first principles

Scope: an npm package that runs inside an ordinary desktop Chrome page on macOS. No managed browser, native service, OS policy, or independent server controls the decision. The user permits human use to stop while an agent is active.

## Define the result

A defense succeeds when the application refuses the protected action before the agent completes it. A hidden DOM, failed OCR attempt, delayed screenshot, or unsupported playback is insufficient. A defense also needs a working human control. Refusing everyone proves denial of access, not selective agent prevention.

Separate two attackers. A constrained client only reads browser screenshots and sends browser input. A privileged client also inspects JavaScript, changes code, or replaces network responses. The constrained client already supplies a counterexample to the current stack. We do not need stronger privileges to explain that failure.

## The action path and possible cuts

| Stage | Owner | What would stop the route | Present package control |
| --- | --- | --- | --- |
| Attach to the browser target | Browser | Browser refuses the debugging session | No reviewed mandatory page veto |
| Read the displayed decision | Browser compositor | Browser redacts protected app pixels | Page changes its own rendering; no reviewed arbitrary-canvas secure-output API |
| Send a choice | Browser input pipeline | Browser rejects debugger input or exposes an unforgeable origin | App rejects events, but CDP can supply trusted input |
| Accept the protected action | Application | A verifier demands evidence the controller cannot supply | Current acceptance logic runs in the controlled browser |

The [source boundary](cdp-control-boundary.md) traces capture and trusted input. The [Mac capture trace](mac-native-vs-cdp-boundary.md) explains native DRM protection separately. The [agent audit](agent-use-audit.md) records earlier tests.

A package cannot stop attachment by hiding DOM nodes. It cannot stop compositor copies by disabling canvas export. It cannot establish human identity from `isTrusted`. These are different enforcement points, so combining them does not create the missing authority.

## What the constrained experiment establishes

The test client enforces a command allowlist before it sends protocol messages. The allowed setup commands create, attach, activate, navigate, size, and inspect the target title. Only `Page.captureScreenshot` reads app pixels. Only `Input.dispatchMouseEvent` supplies task input. No Runtime, Debugger, DOM, accessibility, network interception, virtual time, or screencast command is permitted.

This is a screenshot/input route with explicit setup privileges. It is not literally a two-command session. Viewport sizing and the readiness title remain declared conveniences. A future claim about either must test its removal.

Run `npm run verify:perception-input` with the local app on port 5173. The strict command fails if any session completes. It also fails when an error leaves prevention unproven. A nonzero exit alone therefore does not establish a bypass or a block. Read the recorded outcomes and guard diagnostics.

## Fresh result

On 2026-10-16, visible Chrome `155.0.8059.80` completed all three trials. Each recorded DRM verification and detector acceptance. The sessions used 33, 25, and 33 screenshots. Every transmitted method belonged to the enforced allowlist. See [raw results](first-principles-route-results.json).

The strict command exited with an acceptance failure because all three sessions completed. A separate live check rejected `Runtime.enable` before transmission, then allowed `Browser.getVersion`. The recorded command list contained only the allowed version request.

The source review pins `.40`; the fresh installed browser reports `.80`. This test measures the newer browser but does not establish an exact source trace for that patch revision.

## The remaining design question

Rendering noise and input deadlines can raise the work required. They need a measured budget and human tests. They do not prove that a controller lacks the information or authority required for the task.

If the human and controller receive the same useful pixels, and the browser accepts the controller's input, a page needs another distinguishing fact. This is a conditional boundary argument, not a claim that current agents solve every visual task.

Before adding another defense, name the stage it cuts and the fact the agent cannot reproduce. Then test the strongest surviving route with that fact absent. A shipped capture veto, an unforgeable input origin, or an independently enforced action requirement would change the design. No such package-controlled fact is established in the reviewed paths.
