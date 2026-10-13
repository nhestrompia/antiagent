# Worker canvas experiment

Run `npm run benchmark:worker` with Vite on localhost:5173. The page is `/worker-lab.html`.

Moving drawing into OffscreenCanvas in a worker defeated the main-page CanvasRenderingContext2D.fillText observer. Both tested sessions exposed zero labels through that observer. No native business controls exist in the page.

The stronger Playwright test intercepted the worker script before execution, added an OffscreenCanvasRenderingContext2D.fillText observer, and read its output through Playwright's worker API. It recovered all three labels and positions and completed the correct action with real pointer input. This bypass uses network interception and worker evaluation. It does not rely on webdriver detection or exported private application state.

The two sessions establish a specific observation reduction and a concrete bypass, not general agent completion rates. The uninstrumented session made no action attempt. The layout rotates three choices per page load and the task has no real business effect. Screenshots remain available. Keyboard Enter selects the first displayed choice, which is not always the correct choice. Full keyboard navigation and accessibility are research work, not implemented support.

Results: [worker-results.json](worker-results.json). Images remain local under `artifacts/worker-validation/`. Build passed. T3 preview navigation succeeded, but two snapshot requests failed. No interactive preview verification is claimed.

## Result across this research pass

Invisible decoys detect one naive text-selector path. Closed roots prevent standard role locators while retaining a native button. Worker rendering prevents a main-page drawing observer. Each has a demonstrated stronger bypass. These are optional deterrents, not an established way to prevent every Playwright agent.

Browser-only defenses can remove convenient observation paths. The remaining task is to find a capture or action boundary that privileged browser control cannot bypass. This pass did not establish one. See [primary-source research](dom-decoys-capture-signals.md) and the separate DRM findings before making product claims.
