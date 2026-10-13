# Randomized canvas benchmark

Tested 2026-10-13. This experiment uses no additional server, verification step, or installed extension. It tests session-randomized canvas controls, not DRM. Each session contains three decisions: recipient, amount, and confirmation. Each decision places three equally styled choices in shuffled slots. Layouts stay stable while the visitor makes that decision.

## Results

| Client | Fixed layout | Randomized layout |
| --- | --- | --- |
| Fixed-coordinate replay, three clicks | 30/30 completed | 0/30 completed |
| Browser client inspecting canvas drawing calls | 30/30 completed | 30/30 completed |
| Screenshot-only assistant through collaborative preview | Not tested | 1/1 completed, three clicks, zero mistakes |

The fixed client repeats the known baseline coordinates. The privileged client installs a drawing-call observer before the application loads, locates the current choice text, and clicks its current position. It does not read a private layout export. Both clients use ordinary pointer input. Accessibility snapshots do not expose the choice labels as native controls.

The screenshot-only run reads the rendered instructions and choices from the preview images. It chooses Harbor Research in the middle, 125 EUR in the middle, then Confirm transfer on the right. The final visible status reports completion with three clicks and zero mistakes. One successful run is a counterexample to a blocking guarantee, not an estimate of a general agent completion rate.

The fixed client's 0/30 randomized result is a sample outcome, not guaranteed rejection. A blind client that always selects one slot has a 1/27 chance of choosing all three correct slots under independent uniform shuffles. A client can also retry, inspect pixels, or inspect rendering. The lab permits mistakes and retries; it does not establish secure transaction authorization.

## Conclusion

Randomization breaks fixed coordinates in these trials. Canvas removes native choice selectors. Neither prevents a screenshot observer or a browser client with rendering access from completing this task. This experiment therefore does not meet the requested prevention guarantee.

`npm run benchmark:randomized` reproduces 120 sessions across the two automated strategies and layouts. [Committed results](randomized-canvas-results.json) include every task outcome. Screenshots remain local under `artifacts/randomized-canvas-validation/` and in the collaborative preview session. `npm run build` passed. Human usability, assistive technology support, other browsers, and combined DRM behavior were not measured in this milestone.
