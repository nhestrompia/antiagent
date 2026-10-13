# Hidden-frame capture signal

Run `npm run benchmark:hidden-capture` with the existing Vite origin. This starts a fresh isolated Chrome process for each case and connects with the documented noDefaults option. No real Chrome profile is reused. The page is `/capture-signals.html?guard=hidden-frame`.

Twenty-four fresh-browser cases ran in Chrome 155.0.8059.40. The final run established every required baseline, with no skipped cases. Both unguarded and guarded hidden-idle controls received zero animation callbacks during a 250ms interval and did not lock. Hidden viewport capture resumed animation callbacks while document.hidden remained true.

The guarded hidden-capture arm blacked the captured control in all three repetitions. It was not locked before capture. The guard reacts when an animation callback runs in a hidden document. Matching unguarded hidden captures retained the colored control. This is a conditional page-visible signal derived from Chromium's hidden-but-painting behavior, not a public screenshot event.

Enabling focus emulation made an otherwise background tab report visible. That arm bypassed the guard and retained the colored control in all three repetitions. Foreground viewport captures also bypassed it in all three repetitions. No script injection or resource replacement was needed for either bypass.

The first reused-browser attempts had unavailable hidden baselines. Those attempts were not counted as successes. The final runner uses a fresh Chrome process per case to avoid cross-case emulation state. It explicitly records a skipped case if a future run cannot establish its baseline. The result JSON is written before assertions so unexpected measurements remain reviewable.

The helper starts a temporary profile and a local debugging endpoint solely for the test, then closes that browser. It does not add an application backend. Browser override details and primary sources are in [focus-emulation-research.md](focus-emulation-research.md). A separate protocol client cannot be assumed to disable a setting retained by another inspector session.

Other reasons for a hidden document to receive frames, including tab sharing, media and browser painting behavior, need false-positive tests. No human usability, accessibility or native screenshot claim follows from this experiment. The guard remains separate from the DRM runtime and production application flows.

Results: [hidden-capture-results.json](hidden-capture-results.json). Images remain local under `artifacts/hidden-capture/`. Build passed. The result records pixels separately from lock state; callback counts alone are not treated as successful capture protection.
