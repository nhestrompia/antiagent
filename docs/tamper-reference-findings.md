# Reference insertion patch

The gate now checks Node.prototype.appendChild as well as drawing and serializer APIs. The previous cross-realm bypass replaced that method to alter the reference iframe immediately after insertion. The patch detected the extra function property in that wrapper, withheld the UI and rejected the action. No labels reached the drawing observer.

A stronger preload used a Proxy around the original insertion method and supplied native-looking serialization for each Proxy in every reference realm. It passed the revised checks, recovered the label and completed the action. This establishes the limit of this patch against that named client, not an absence of all possible Proxy checks.

All six fresh-page cases ran in Chrome 155.0.8059.40. Clean browser APIs remained usable. Plain and locally disguised drawing wrappers still failed. Replacing the gate module still bypassed the gate. The test checks canvas pixels and actual accepted actions separately from diagnostic state.

Run `npm run benchmark:tamper`. Current evidence is [tamper-reference-results.json](tamper-reference-results.json), with local images under `artifacts/tamper-reference-validation/`. The [first milestone](tamper-findings.md) records the older implementation and five-case evidence. The current runner targets this revised gate.
