# Fullscreen protected-video capture

This experiment tests whether fullscreen video changes the compositor capture boundary. It uses the existing static reference-interface media. It has no business controls and does not validate native human visibility.

Six fresh installed Chrome trials verified playback and document.fullscreenElement before capture. Three used clear media; three used encrypted media. Both capture paths ran in each trial. See [results](drm-fullscreen-results.json) for the version, fullscreen state, playback state, image dimensions, and pixel counts.

| Source | Compositor capture | View-based capture |
| --- | --- | --- |
| Clear, three trials | Reference pixels visible in all three | Reference pixels visible in all three |
| Encrypted, three trials | Reference pixels visible in all three | Zero reference pixels in all three |

Encrypted compositor captures contained between 222,468 and 222,474 pixels in the reference interface's teal range. Visual inspection of the first encrypted compositor image confirmed the account, recipient, action label, and capture token remained readable. The counts establish recognizable region recovery, not automated OCR or task completion.

All captures had dimensions 3024 by 1898. The runner waits for fullscreen activation and two animation frames. It does not benchmark every stage of the native fullscreen transition. The positive compositor capture is sufficient to reject protection at that tested moment; it does not establish every later capture outcome.

The [fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) changes how an element displays and requires user activation. Its documented interface does not promise capture protection. This test rejects the specific hypothesis that entering fullscreen immediately hides the encrypted interface from the tested compositor path.

Run npm run dev, then node scripts/benchmark-drm-fullscreen.mjs. Images are under artifacts/drm-fullscreen/. The runner closes each isolated browser and fails if a case cannot complete. Fullscreen changes the app presentation, so this remains a research adapter rather than an integration feature.
