# Screenshot preparation guard

Tested on macOS with headed installed Chrome. See [results](screenshot-preparation-results.json) for the version and all 15 cases.

Playwright's [screenshot preparation source](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/screenshotter.ts) changes caret styles by default. It can also cancel infinite animations when the caller disables animations. These page changes can trigger observers before capture.

The lab observes a hidden input's caret style and listens for cancellation of its harmless animation. Detection clears the canvas to black and latches the action gate.

| Operation | Black captures | Accepted clicks |
| --- | --- | --- |
| Default Playwright screenshot | 3/3 | 0/3 |
| Playwright with caret: initial | 0/3 | 3/3 |
| Playwright with caret: initial and animations: disabled | 3/3 | 0/3 |
| Direct CDP viewport screenshot | 0/3 | 3/3 |
| Ordinary caret style change | 3/3 | 0/3 |

Run npm run dev, then node scripts/benchmark-screenshot-preparation.mjs. The page is /screenshot-preparation.html. Images are under artifacts/screenshot-preparation/.

This catches default library behavior, including foreground screenshots. It does not detect the compositor request itself. A screenshot option bypasses it without changing the page. Direct CDP also bypasses it. Ordinary app changes can produce false blocks, so this remains an isolated lab rather than a default protection setting.
