# DRM inside Document Picture-in-Picture

This experiment combines the existing encrypted reference-interface video with a Document Picture-in-Picture surface. The video contains a static interface, not working business controls. Native human visibility and native capture were not tested.

Six trials used fresh installed Chrome instances: three clear controls and three encrypted cases. All verified playback before the move, inside PiP, and after moving back. See [results](drm-pip-results.json) for the browser version and playback diagnostics.

Encrypted frame copying returned zero nonblack pixels in all three cases. Each clear control returned 345,596 nonblack pixels. This closes the ordinary canvas-copy bypass observed with the earlier unencrypted PiP canvas.

The reparenting bypass succeeded. Code from the opener moved the video back into the source document. Playback continued, and the compositor captured the interface. Visual inspection of the first encrypted restored capture confirmed the account, recipient, capture token, and action label were readable. All paired images are under artifacts/drm-pip/.

The PiP screenshot in the inspected encrypted trial was dark. That alone does not prove protection against agents while a human can see the interface. Human visibility still needs independent validation. Playback verification does not establish capture protection.

Run npm run dev, then node scripts/benchmark-drm-pip.mjs. The runner uses the existing /protected-ui.html experiment and adds a temporary PiP button. It does not change the app's default runtime.

Next hypothesis: stop playback when the video leaves PiP, then test whether early observer suppression bypasses the guard. No broad agent-prevention result follows from this unguarded combination.
