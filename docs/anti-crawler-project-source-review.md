# Anti-crawler project source review

Researched 2026-10-14. These projects target distinct problems. Their claims are not interchangeable with preventing an adaptive agent from completing a visible application. This source review did not install services. The separate local benchmark uses an experimental browser dependency.

| Project | Actual mechanism | Deployment | Fit for browser-only npm scope |
| --- | --- | --- | --- |
| Anubis | Policy and computational challenges before upstream access | HTTP firewall/proxy | Server boundary excluded |
| Nepenthes | Endless linked generated pages, delayed responses | HTTP tarpit behind web server | Server boundary excluded |
| AI Labyrinth | Suspect-crawler links into generated decoy content; detection feedback | Cloudflare zone/edge | External service excluded |
| BotD | Browser environment and automation signatures | Browser npm | Fits scope, limited detector |
| bot-signal | Weighted browser signatures and behavior; separate server signals | Browser npm and optional Node layer | Browser subset fits; heuristic |

## Anubis

Anubis protects upstream resources through challenges. Its proof-of-work design hashes a challenge plus nonce and requires leading zeroes; the server verifies the answer. The maintainers describe this as a provisional cost barrier while improving browser fingerprinting. The implementation recomputes SHA-256 from server challenge data and supplied nonce, checks the response, then checks difficulty. It proves performed computation under that challenge, not human identity. Inference: an adaptive full browser can perform the same work; the benefit is increased bulk scraping cost, not a guaranteed block of a single agent session. Moving validation into attacker-controlled page JavaScript loses the upstream enforcement boundary. [Project](https://github.com/TecharoHQ/anubis), [Design](https://raw.githubusercontent.com/TecharoHQ/anubis/main/docs/docs/design/why-proof-of-work.mdx), [Verifier implementation](https://raw.githubusercontent.com/TecharoHQ/anubis/main/lib/challenge/proofofwork/proofofwork.go)

## Nepenthes and AI Labyrinth

Nepenthes generates a deterministic-looking endless graph of pages with many links, delays/drip-feeds responses, and generates Markov content. Its deployment guidance puts it behind nginx/Apache. Its stated target is crawlers that keep traversing and ingesting content. Inference: an agent following the visible application task can avoid unrelated links; the trap does not establish screenshot or input denial. [Author documentation](https://zadzmo.org/code/nepenthes/)

Cloudflare's AI Labyrinth injects invisible links for suspected crawlers into pre-generated content stored in R2. Traversal provides detection feedback to its bot-management system. It is an edge service requiring a Cloudflare zone setting. Inference: invisible-link traversal is useful crawler evidence, but a screenshot-driven task agent need not follow those links. The reviewed announcement does not claim compositor capture prevention or human provenance. [Cloudflare implementation description](https://blog.cloudflare.com/ai-labyrinth/)

## Browser libraries

BotD's README scopes the open-source npm library to basic bots, lists browser automation coverage as partial, and reserves AI agent/assistant detection for its separate commercial API. The inspected source reads `navigator.webdriver` and scans window/document properties for recognizable framework markers. Those checks detect exposed artifacts; they are not browser-owned access control. A negative result does not establish a human. [README](https://raw.githubusercontent.com/fingerprintjs/BotD/master/README.md), [WebDriver source](https://raw.githubusercontent.com/fingerprintjs/BotD/master/src/sources/webdriver.ts), [Artifact source](https://raw.githubusercontent.com/fingerprintjs/BotD/master/src/sources/distinctive_properties.ts)

bot-signal separates browser artifacts/behavior from server IP/TLS signals. Its README explicitly calls attribution probabilistic and says page JavaScript cannot reliably identify the controlling package after artifacts are removed. Browser-only deployment cannot use trusted edge TLS or request reputation signals. Weighting evidence and combining observations can improve detection coverage but cannot create an absent privileged boundary. [README](https://raw.githubusercontent.com/okasi/bot-signal/main/README.md)

Its async CDP check installs an Error `stack` getter, logs the error, then checks whether serialization accessed the getter. Worker detection repeats that mechanism. This observes serialization behavior, not every CDP command or session. Inference: capture/input or heap acquisition without that serialization path need not trigger it; local installed-browser tests determine current behavior. This is separate from the error-creation-cost experiment. [Async implementation](https://raw.githubusercontent.com/okasi/bot-signal/main/src/asyncChecks.ts)

Rebrowser's own detector project documents Runtime-enable, source URL, main-world function access, webdriver, default viewport, and Playwright init/binding artifacts. It also describes changing automation configuration or patching library behavior to avoid several of them. Treat its broader marketing claims as claims, not measured results for this repository. The useful contribution is a repeatable artifact test inventory. [Project documentation](https://raw.githubusercontent.com/rebrowser/rebrowser-bot-detector/main/README.md)

## Decision for this package

The transferable work is a test matrix: default frameworks, attached ordinary browser with minimal CDP, artifact removal, Runtime-disabled capture/input, and the demonstrated heap route. Add library signals only where they detect a reproduced attack and genuine-user controls pass. None of these reviewed projects supplies a page-owned screenshot/heap/input veto. Their mechanisms can reduce scraping or detect known automation configurations; source review provides no npm-only agent-proof guarantee.
