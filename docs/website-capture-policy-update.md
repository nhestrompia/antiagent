# Website capture-policy update

Checked 2026-10-14 against primary specifications, release notes, and Chromium source. This pass found no shipped website-owned API or header that vetoes foreground CDP screenshots. Search coverage does not prove absence of every undocumented mechanism.

## Caller policy

The Screen Capture draft defines display-capture as a Permissions Policy feature. It controls the document's own getDisplayMedia calls. It does not give that document a veto over another capture client. [Screen Capture policy integration](https://www.w3.org/TR/screen-capture/#permissions-policy-integration).

Chromium 155's screenshot handler uses browser surface/view capture rather than document getDisplayMedia. [Pinned handler](https://github.com/chromium/chromium/blob/155.0.8059.40/content/browser/devtools/protocol/page_handler.cc).

The [live comparison](capture-policy-findings.md) verified the header and API denial. Compositor screenshots stayed readable and coordinate input worked. The successful restriction therefore concerns the caller API, not the requested target protection.

## Newer browser policy

Chrome 155 release notes describe restrictions on chrome.debugger extension attachment through enterprise screenshot policy or DLP rules. These are browser administrator controls, not document response headers. The extension-attachment change does not establish enforcement against every external CDP client. [Chrome 155 release notes](https://chromestatus.com/release-notes/155).

The new searches found no Chrome feature entry establishing a shipped capturable attribute. The proposal and manifest venue decision in [earlier research](foreground-agent-boundary-research.md) still do not establish support.

## Isolated Web Apps

Chrome describes IWAs as signed bundles installed into a distinct isolated-app origin and application window. Their CSP and isolation constrain code loading and cross-origin access. The documented developer-proxy mode supports DevTools. The introduction does not promise that signing blocks debugger evaluation or screenshots. [Chrome IWA introduction](https://developer.chrome.com/docs/iwa/introduction).

An installed IWA is a separate deployment from an ordinary HTTPS page. No reviewed source establishes a signature-only website restriction on CDP without installation or browser management. These mechanisms do not meet the current integration scope.
