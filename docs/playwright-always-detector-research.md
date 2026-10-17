# Research on “always detects Playwright”

Reviewed 2026-10-16. **The reviewed primary sources do not establish an always-working detector for this app's threat model.** They establish useful detection of defaults, particular framework features, or evaluated behavioral populations. This does not rule out undisclosed signals; it means no universal claim is supported here.

## Commercial authors state narrower conditions

Castle's March 2025 Playwright article tests Chrome headless headers, webdriver, console serialization, and injected globals. It also describes bypasses and limits the browser scope to Chrome. Its exposed-function detector requires that optional API to install a recognizable binding. These are practical checks, but old global names must be checked against the actual installed version. [Castle's original article](https://blog.castle.io/how-to-detect-headless-chrome-bots-instrumented-with-playwright/).

DataDome's original CDP article explicitly conditions the serialization signal on `Runtime.enable`. It also describes low-level CDP frameworks that avoid that command and recommends multiple signal layers. Its June 2026 follow-up says browser changes closed the classic Error-preview getter channel. The Playwright MCP webdriver discussion there must not be generalized to all Playwright clients. [Original research](https://datadome.co/threat-research/how-new-headless-chrome-the-cdp-signal-are-impacting-bot-detection/), [2026 follow-up](https://datadome.co/threat-research/how-browser-vendors-are-quietly-making-automation-harder-to-detect/).

Castle's Browserbase experiment used the developer plan, not advanced stealth. It found automation signals without an exclusive Browserbase attribution. That experiment is evidence about its tested tier and client, not today's Verified mode or every remote CDP client. [Original Browserbase experiment](https://blog.castle.io/from-detection-to-trust-the-evolving-challenge-of-ai-bot-authentication/).

## Academic perfect scores are bounded results

The July 2026 paper *What Does It Take to Detect an AI Agent?* reports perfect observed agent recall in its benchmark. Its event-rate/click features distinguish the evaluated Playwright agent sessions. However, its evasion scope excludes CDP-level event injection configured to match hardware-style event streams. Its limitations call generalization to raw CDP and other frameworks a prediction requiring measurement, not a demonstrated result. Its data also covers a specific task/LLM setup. [Paper v1, especially evasion scope and limitations](https://arxiv.org/html/2607.26935v1).

The local raw-pointer experiment emitted raw updates through serial Playwright input and coalesced/predicted events through direct CDP. This disproves treating absence of those event classes as an invariant here. It does **not** establish that the entire trained classifier has been defeated: its exact feature extraction and model were not reproduced. [Local measurements](raw-pointer-findings.md).

Playwright's supported mouse API also permits configurable move steps and click delay, separate down/up calls, and wheel dispatch. Absent wheel events or identical button-hold durations therefore cannot be assumed for every client. This API evidence alone does not prove a successful classifier bypass. [Official mouse API](https://playwright.dev/docs/api/class-mouse).

The June 2026 multi-layer fingerprinting study reports distinguishing its evaluated agents using network, HTTP, and browser information. It also reports agents bypassing all evaluated defenses. Section 8 limits generalization from its Linux/two-machine environment and discusses changing detection/evasion. Its server-visible layers exceed a browser-only npm package's observations. [Original study and limitations](https://arxiv.org/html/2606.30119#S8).

## New GitHub project does not promise an invariant

MickeyJS offers 31 probes and a weighted score. Its own limitations say patched clients can defeat checks, isolated worlds hide main-world hooks, environment signals occur on genuine machines, and browser changes can remove signals. Its reported end-to-end check is Chrome 151 with a Puppeteer stack trace, not every Playwright 1.64 configuration. Its tests primarily validate structural correctness and scoring. A “definitive” marker in its score means strong evidence when present; it does not prove that every automated client must emit that marker. [Original project, limitations and testing sections](https://github.com/MickeyAlton33/MickeyJS#honest-limitations).

This is a new candidate suite to evaluate, not a reason to run its full script in production unreviewed. The reviewed repository pin is `458cfbb671b97fd2fd14f68b62f9d199e347d459`. Any new probe needs its operation traced before its label is trusted.

## Decision for this application

Keep searching for concrete signals, but assess each against the successful local marker-disabled client. An “always” claim needs an invariant that survives allowed configuration changes and still rejects real task completion. High benchmark recall, a default-client screenshot, a maintainer's intent to remain detectable, and a proprietary risk score do not supply that proof.

The next decisive evidence would be a specific new probe that catches the existing successful client in repeated fresh-browser trials, with ordinary-browser controls, followed by an adaptive bypass attempt. No such new validated probe was established by this review. No app code, service account, or detector deployment changed.
