# Display-capture Permissions Policy test

Six fresh installed Chrome trials compared an unchanged page with a response carrying Permissions-Policy: display-capture=(). The adapter added the header to the existing Vite response through network interception. No extra server process or default app protection was added.

| Case | Page's own sharing API | CDP compositor screenshot | Coordinate action |
| --- | --- | --- | --- |
| Unrestricted control, 3 trials | Allowed in all three | Reference pixels unchanged in all three | Accepted in all three |
| Header present, 3 trials | Policy-specific NotAllowedError in all three | Reference pixels unchanged in all three | Accepted in all three |

The adapter verified the actual response header and the browser's allowsFeature result. Allowed controls shared only the uniquely named experiment tab and returned displaySurface=browser. All tracks stopped before screenshot testing, and each isolated browser closed afterward.

Each final screenshot matched its browser's baseline reference pixel: RGB 46, 98, 86. An initial run assumed RGB 17, 100, 86 and failed its color assertion in every case. The corrected runner calibrates against a visibly teal baseline in the same browser instance. Initial failures are in [pilot results](capture-policy-color-pilot-results.json); they are not protection evidence. Final cases are in [results](capture-policy-results.json).

This proves that the browser applied the header while the tested compositor capture and input paths remained available. It does not test native capture or every browser. A page's denied API is distinct from preventing another client from capturing the page.

Run npm run dev, then node scripts/benchmark-capture-policy.mjs. The page is /capture-policy.html. Images are under artifacts/capture-policy/.

Primary sources and the latest policy search are in [policy update](website-capture-policy-update.md). No reviewed source supplies a new ordinary-website target veto.
