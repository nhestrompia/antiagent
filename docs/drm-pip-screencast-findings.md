# DRM PiP and CDP screencast

This experiment adds `Page.startScreencast` to the existing paired clear/encrypted PiP benchmark. It registers the frame listener before starting, acknowledges emitted frames, observes for three seconds, stops capture, and saves up to three returned PNG frames. No emitted frames is a failed experiment, not a protected result.

Six fresh installed-Chrome sessions completed: three clear and three encrypted. Each emitted one saved screencast frame. No frame contained reference-interface teal pixels, and the paired PiP screenshots also contained zero reference pixels. Encrypted canvas frame copying remained black; clear copying recovered 345,600 nonblack pixels. These are region measurements, not human-readability or business-action tests.

The adaptive reparenting path still recovered the interface through compositor capture in all three encrypted trials (64,563 reference pixels each). Clear trials recovered 64,024 each. This confirms that this PiP capture exclusion is not a durable protected-renderer boundary under the tested controller.

Results are in `drm-pip-screencast-results.json`. Images remain local under `artifacts/drm-pip-screencast/`. Run `npm run benchmark:drm-pip-screencast` with the development server available. The existing development media license service is unchanged. An initial run with the server unavailable failed; it supplied no protection evidence. The final six-session run finished without skipped or failed cases.

The protected-copy-output source review identifies a real browser redaction rule for secure-output textures. It does not establish that arbitrary canvas or this software-decoded media can acquire that status. PiP itself also blanked clear-media captures, so the PiP result alone cannot attribute exclusion to DRM. Native human visibility, native screen capture, live interaction, and stronger reparenting enforcement remain unvalidated.
