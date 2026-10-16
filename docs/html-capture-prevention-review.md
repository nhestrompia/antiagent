# HTML masking and capture-prevention review

Researched 2026-10-14 using primary HTML, Chromium, and W3C material. The desired boundary is readable human output with capture-only redaction, not simply obscured pixels for everyone.

## Existing masking

`input type=password` represents a plain-text editable value whose presentation the browser obscures. The specification still applies the `value` IDL attribute. Consequently a page can read `input.value`, and privileged execution can inspect the same value. Ordinary visual masking also masks what the human sees; it is not a separate screenshot-rendering policy. Color/file controls define specialized input and picker behavior, not a general arbitrary-content capture-exclusion attribute. [HTML input specification](https://html.spec.whatwg.org/multipage/input.html#password-state-(type=password))

Chromium implements `-webkit-text-security` as an inherited style keyword (`none`, `disc`, `circle`, `square`) affecting layout/paint. Its declaration provides no capture-only mode or protected-surface property. Inference: substituting glyphs changes ordinary rendered presentation; it does not remove underlying text from DOM/heap inspection or grant distinct capture output. [Chromium property declaration](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/css/css_properties.json5)

Native popups can occupy a presentation path outside ordinary page-surface capture. That is a real candidate boundary, but it does not persistently protect arbitrary DOM data, and native OS capture/input remains separate. The native-select experiment and mutation/type-ahead paths are recorded in [the source review](native-select-boundary-source-review.md). Password masking and native pickers must not be generalized into a shipped HTML screenshot-denial capability.

## The actual capture-only proposal

The September 2024 TPAC presentation explicitly discusses preventing accidental sharing of sensitive banking, medical, and corporate information. It suggests a new global HTML hint such as `capturable` or `sensitive`, illustrates `capturable=false`, and discusses hiding a sensitive element versus preventing capture of a whole window. It also requires user control over whether to capture, distinguishing privacy protection from site-imposed content protection. The presentation is design discussion, not normative API syntax or an implementation announcement. Its examples of existing Edge black-screen policy are administrator controls. [Original slides](https://www.w3.org/2024/Talks/TPAC/breakouts/capture-prevention.pdf)

The official meeting's stated goal is collecting community interest, ideas, and feedback; its linked GitHub item is a breakout-session proposal. These sources establish the proposal's existence, not current Chrome/macOS/CDP support. [Meeting record](https://www.w3.org/events/meetings/b059a6cc-ac2a-482b-a9e2-32f72c6beb60/), [Session proposal](https://github.com/w3c/tpac2024-breakouts/issues/91)

Targeted searches for a 2026 capture-prevention HTML API, `capture-policy`, and `capturable` implementation did not establish a newer normative API or shipped implementation. This search result is limited evidence, not proof no newer discussion exists. The concrete 2026 Chromium lead found is internal protected-media capture classification, reviewed in [protected-copy-output-review.md](protected-copy-output-review.md); it does not expose the suggested HTML attribute. Arbitrary unknown HTML attributes being accepted by the DOM would not establish implementation.

## Package decision

The relevant future capability would be browser-enforced capture-only redaction with explicit scope covering CDP and protection against privileged DOM/heap inspection. The reviewed proposal establishes neither. Existing password/CSS masking can obscure captured pixels but also ordinary presentation and leaves clear state accessible. No reviewed shipped HTML/CSS feature meets the requested readable-human, hidden-agent boundary on current macOS Chrome. A new browser benchmark can test a specific candidate; the 2024 slide alone is not enough to implement or promise it.
