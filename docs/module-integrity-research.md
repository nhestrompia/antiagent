# Module integrity as a bounded tamper check

Researched 2026-10-13. **Yes: an intact HTML document can use import-map integrity metadata to pin a same-origin imported gate module and reject changed response bytes.** It requires no external service. It does not protect against an attacker who also rewrites the trust-bearing HTML or runs privileged preload/debugger code.

MDN's compatibility data records import-map `integrity` support from Chrome 127, so Chrome 155 is within its supported range. This is compatibility evidence; the local experiment should still assert actual mismatch rejection rather than infer protection from `HTMLScriptElement.supports('importmap')`, which only tests import maps generally. [MDN compatibility data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/script.json)

The HTML standard defines the integrity map as URL-to-integrity-metadata entries. Integrity can apply to imported modules even when they do not have an entry in the map's `imports` section. Keys are normalized against the document base URL. Therefore `/src/tamper-gate.js` can be the integrity key for that exact same-origin module URL. A query-string variant or different resolved URL must be pinned separately. [HTML import-map processing](https://html.spec.whatwg.org/multipage/webappapis.html#import-map-processing-model)

MDN documents integrity for both static and dynamic module imports and fallback integrity for top-level/preloaded modules without their own integrity metadata. Register the import map before loading its dependent module; authorize the inline map and bootstrap using the actual CSP nonce/hash policy. Compute a real SHA-384 digest from the served production bytes, not TypeScript source or a development file before bundler transformation. Every independently fetched security-relevant dependency needs its own integrity entry: pinning the bootstrap does not implicitly pin the entire graph. [MDN import-map integrity](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)

## What this experiment proves

With the HTML/map unchanged, replacing only the pinned module response through routing should make its integrity check fail and prevent that module from executing. If the application awaits or statically depends on the gate before rendering sensitive content, it can fail closed on the rejected graph. Verify that failure does not trigger a weaker fallback that renders anyway. The check establishes byte identity for that fetched resource, not that the browser is human or uninstrumented. [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity)

## Remaining bypasses

- Rewrite the main document, change/remove the map, or update both code and digest. The HTML is the trust anchor; SRI cannot authenticate a trust anchor that the client itself replaces.
- Leave the pinned module unchanged and manipulate its environment/actions through addInitScript or debugger evaluation. Those privileged execution paths remained available in our CSP/Trusted Types experiment.
- Replace an unpinned dependency or select a different module URL. Build tooling must pin the actual output URLs and complete relevant dependency graph.
- Keep the gate intact but directly operate the visible UI through screenshot coordinates. Resource integrity does not create capture exclusion.

The first and third are architectural consequences of where the expected digest lives and which URLs are covered. The privileged-execution limitation is supported by local evidence. [Injection-policy results](injection-policy-results.json)

## Minimal decisive tests

1. Unmodified document/module: gate runs and human flow works.
2. Module-only replacement with identical MIME type: digest mismatch blocks execution and sensitive rendering.
3. Main-document replacement updating/removing the integrity entry: document the recovered access.
4. Unmodified module plus early preload/environment alteration: measure whether existing tamper diagnostics still detect it.
5. Dependency-only replacement: prove graph coverage, avoiding claims based only on the gate's own hash.

This is worthwhile as a reproducible integrity layer and to stop the specific response-replacement bypass under an intact document. It is not an anti-Playwright injection boundary or a full hostile-browser guarantee.
