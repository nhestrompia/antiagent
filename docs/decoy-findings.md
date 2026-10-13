# Invisible DOM decoy experiment

Run `npm run benchmark:decoys` with Vite on localhost:5173. The page is `/decoy-lab.html`.

An opacity-zero button with the same label as a real canvas control locked the local interface when a Playwright text selector clicked it. With no decoy, the selector already failed because canvas exposes no text element. A display-none decoy caused a timeout without a lock. The trap adds a detection signal, not new protection against that selector.

Known-coordinate clicks, CSS inspection followed by coordinate clicks, removal followed by coordinate clicks, and keyboard Enter each completed the real action in all three modes. These are scripted bypasses, not an estimate of autonomous agent completion rates. Each operation used a fresh page in installed headed Chrome with AutomationControlled disabled. The benchmark checks actual action outcomes.

No blur, focus, resize, print, or visibility events appeared during any of the 15 viewport screenshots. This tests those observers only. It does not prove absence of every possible side channel.

The decoy sits away from the real control, outside tab order and outside the accessibility tree. Manual usability and assistive technology remain unvalidated. Do not enable a production lock from these results. The app stores no sensitive data and performs no real transfer.

Results: [decoy-results.json](decoy-results.json). Images remain local under `artifacts/decoy-validation/`.

Primary sources and other candidates: [dom-decoys-capture-signals.md](dom-decoys-capture-signals.md).
