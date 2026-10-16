# Integrated DRM and browser guards

The opt-in `combined-defense.html?defense=layered` experiment combines the existing canvas renderer, changing visual noise, randomized choices, pointer transactions, trusted events, framework event checks, Runtime cost probe, API consistency checks, renderer method locks, and capture-cover checks with BotD and bot-signal's async browser checks.

After both detectors allow the client, it starts the existing encrypted development asset in a low-opacity overlay across the canvas. Initialization requires verified encrypted playback; business interaction remains pending until initialization finishes. Action-time ownership checks verify that the canvas and video remain in their original surface and that protected playback remains observed. These checks run independently of mutation observers.

This overlay tests the proposal that encrypted composition plus separate automation guards might protect ordinary controls. It does not encrypt the canvas or its task data. A faint overlay was chosen to leave the controls visible; human readability and accessibility are not validated. A dark/opaque overlay would hide the underlying app from people as well. This is a research mode, not a production package contract. The development license endpoint and external-license dependency are inherited from the repository's existing DRM fixtures.

The adaptive raw client uses visible Chrome with the automation marker disabled. It does not enable Runtime or Debugger, inspect DOM task mappings, disconnect guards, or change app state. It reconstructs each visible choice from 64 screenshots and uses the existing trusted pointer transaction. Final results are saved in `layered-guards-results.json`, including errors rather than classifying incomplete captures as blocks. One timeout retry is permitted per screenshot.

Run `npm run benchmark:layered-guards`. `npm run verify:layered-guards` additionally requires that no session completes; it must fail on a successful client. A passing expected-outcome benchmark alone does not establish agent prevention. The successful encrypted/fullscreen OCR benchmark remains a separate counterexample to assuming encrypted playback protects every capture path.

The package remains a feasibility project. This experiment makes the combination concrete and reviewable; it does not grant page code a browser-owned screenshot veto or human-input attestation. Acceptance depends on the actual measured outcome and a human usability baseline.

The final fresh-session run completed all three decisions in 3/3 trials with every layer enabled. Initial OCR diagnostics recorded verified DRM playback, allowed detectors, and completed initialization. Each session used 194 screenshots. No Runtime or Debugger commands were issued. The earlier capture timeout was an incomplete trial; it is not counted as prevention. The final run had no recorded errors.
