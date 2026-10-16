# Prevention review from first principles

The requirement is to allow a person to use a developer's application while preventing an adaptive agent from completing the same actions. Deployment remains a browser-only npm package with no application server, controlled browser, native component, or added identity step.

## Three necessary boundaries

1. Observation: keep task-relevant information away from the agent while showing it to the person.
2. Input: establish that an accepted interaction comes from a person.
3. Enforcement: keep the decision outside the controller's authority to replace, skip, or inspect it.

DOM concealment addresses one observation channel. It does not close browser capture. Pointer choreography and classifier checks address some input patterns. The measured browser controller can emit trusted events and use ordinary keyboard operation. Private frozen objects resist some lookups; browser heap access recovered and disconnected a hidden observer. Combining those mechanisms does not automatically create the missing authority boundary.

## What DRM actually adds

The current DRM runtime obtains MediaKeys for a Widevine-encrypted media asset through the configured development license service. It verifies playback, encryption, usable keys, and time advancement. Its `captureProtectionVerified` field remains unknown. That separation is intentional: successful DRM playback is not screenshot-denial proof.

The current reference UI is pre-encoded video. It is not a live protected DOM renderer and has no protected business-action handlers. Labels already present in ordinary HTML, app state, clear controls, or package code remain separate observation channels. Placing an encrypted overlay over ordinary UI does not protect those underlying channels.

Fullscreen measurements in `drm-fullscreen-results.json` recover recognizable encrypted-video pixels through compositor capture. View-based capture loses the same encrypted region. PiP measurements demonstrate a stronger partial boundary, but reparenting restores compositor access and page-owned observers can be suppressed. Native human readability of the PiP path remains unvalidated.

A live DRM application would need dynamic protected media carrying all task-relevant state, a valid key/license path and output policy, human-readable output that every supported agent capture path cannot recover, and action verification that does not expose the protected decision to the same controller. The existing media fixture establishes none of those as a complete browser-only solution. The separate `drm-live-ui-boundary-review.md` checks supported APIs rather than assuming that DOM or canvas can be promoted to a protected media surface.

## Decision

Retain DRM as a measured capture experiment. Do not infer app-level agent prevention from black pixels in one capture path or from encrypted playback. No new production guard is justified by that inference. The finite benchmark must continue to require actual action prevention and a human usability baseline. A successful counterexample invalidates an agent-proof claim even when other modes are blocked.

A supported page-owned restriction on privileged observation/input would change this assessment. Until such a boundary is demonstrated, browser-only detectors and presentation tricks remain partial controls. This review does not mark the goal achieved.
