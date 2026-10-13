# Closed Shadow DOM experiment

Run `npm run benchmark:shadow` with Vite on localhost:5173. The page is `/shadow-lab.html`.

Closed roots stopped the standard Playwright role locator. The same locator completed the native button action in an open root. T3 preview also reported no interactive elements for the closed page.

Pre-navigation interception changed attachShadow to open mode and restored locator completion. CDP DOM.getDocument with pierce enabled found the closed button; its box coordinates allowed real pointer input. Known coordinates and keyboard Tab then Enter also completed the action. CDP accessibility still exposed the button label in both modes. All ten cases checked actual completion in Chrome 155.0.8059.40 with AutomationControlled disabled.

Closed roots offer a cheap deterrent against standard locators while preserving a native control. They do not block privileged DOM inspection, accessibility inspection, or screenshot input. No protected business operation or production integration was added.

Results: [shadow-results.json](shadow-results.json). Images are local under `artifacts/shadow-validation/`. Primary sources are in [dom-decoys-capture-signals.md](dom-decoys-capture-signals.md).
