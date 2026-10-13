# PiP ownership guard and preload bypass

This milestone adds an ownership observer to the DRM/PiP experiment. If the video leaves its PiP document, the observer pauses it, removes its source, and resets media loading. The experiment still uses a static video interface and has no business actions.

Twelve fresh Chrome trials compared the guard with observer suppression before page load. Each mode had three clear controls and three encrypted cases. Playback verified inside PiP in every trial. See [guard results](drm-pip-on-results.json) and [bypass results](drm-pip-suppressed-results.json).

| Encrypted cases | Guard triggered | Playback restored | Reference-color pixels captured |
| --- | --- | --- | --- |
| Guard enabled | 3/3 | 0/3 | 0 in each capture |
| Observer registration suppressed before load | 0/3 | 3/3 | 64,521 in each capture |

The clear controls showed the same guard outcome. With suppression, each clear restored capture contained 63,914 reference-color pixels. Encrypted frame copying remained black in both modes. The bypass therefore used reparenting and compositor capture, not protected-frame readback.

Visual inspection confirmed a dark media region in the first guarded encrypted capture. The first bypass capture exposed the account, recipient, action label, and capture token. Images are under artifacts/drm-pip-on/ and artifacts/drm-pip-suppressed/.

Pixel counts use the reference interface's teal range across the screenshot. They establish recovery of a recognizable region, not automatic OCR or task completion. An earlier crop calculation assumed screenshot height matched the requested viewport and failed on this raw Chrome adapter. The final measurement does not use that assumption.

Run npm run dev, then DRM_PIP_GUARD=on node scripts/benchmark-drm-pip.mjs. Repeat with DRM_PIP_GUARD=suppressed for the preload bypass. The default mode retains the unguarded experiment. Failed or skipped cases produce a failed runner after saving diagnostics.

The guard stops an ordinary reparenting attempt. Early observer suppression defeats it without changing the encrypted asset. Native human visibility and native capture remain unvalidated. This is partial resistance, not the requested boundary against an agent with debugger control.
