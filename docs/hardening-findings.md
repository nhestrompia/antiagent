# Page API hardening module

Run `npm run benchmark:hardening` with Vite on localhost:5173. Open `/hardening-lab.html`.

The experimental module `src/intrinsic-guard.js` locks named method properties as non-writable and non-configurable. The page locks fillText and attachShadow. It reports property-lock outcomes, not authenticity or protection success. It intentionally avoids freezing entire browser prototypes. Test on a disposable page because property locks cannot be reversed in the same realm.

Six fresh-page cases ran in installed Chrome 155.0.8059.40. A late Playwright replacement of fillText succeeded without the module and failed with it. The failed hook observed zero labels after a redraw. This patches that specific later instrumentation path.

A Playwright addInitScript hook ran before the application and observed the label despite the module. The module locked the function that already existed, including the attacker's wrapper. This is the ordering limit, not a bug that property flags fix.

CDP compositor screenshots still worked. The guarded capture visibly contained Confirm transfer. All six cases completed the canvas action with browser-generated pointer input, including the case with failed late instrumentation. Pixel access provides an independent path to operate the control.

No claim is made that native-function string checks identify a pristine function. A privileged client can alter the checking environment, intercept resources, or directly use browser-debugging commands. This module is realm-local hardening and does not revoke the debugger.

Primary references: [Playwright pre-document scripts](https://playwright.dev/docs/api/class-page#page-add-init-script), [Playwright network interception](https://playwright.dev/docs/api/class-page#page-route), [Chrome screenshot command](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot).

Results: [hardening-results.json](hardening-results.json). Screenshots remain local under `artifacts/hardening-validation/`. Build passed. The reusable module remains experimental, separate from the DRM runtime, with no npm or publishing changes.
