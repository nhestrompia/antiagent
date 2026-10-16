# DRM/PiP view and compositor capture matrix

Six fresh installed Chrome trials compared two capture paths inside PiP and after reparenting. All clear and encrypted trials verified playback in both locations. See [results](drm-pip-off-views-results.json).

| Video location and source | Compositor reference pixels | View reference pixels |
| --- | --- | --- |
| PiP, clear | 0 in all three trials | 0 in all three trials |
| PiP, encrypted | 0 in all three trials | 0 in all three trials |
| Main document after move, clear | 63,914 in each trial | 64,977 in each trial |
| Main document after move, encrypted | 64,563 in each trial | 0 in all three trials |

Reference pixels use the teal range of the encoded interface. The counts distinguish recovery of its reference region from a blank capture. They do not measure OCR, human visibility, or business-action completion.

The new view-based PiP capture does not restore the interface. The reparenting compositor bypass still does. Clear PiP captures are also blank, so PiP exclusion cannot be attributed solely to DRM from this result.

Run npm run dev, then DRM_PIP_CAPTURE_VIEWS=1 node scripts/benchmark-drm-pip.mjs. Images are under artifacts/drm-pip-off-views/. This option saves a separate results file and preserves the earlier experiment records.

Next hypothesis: fullscreen video might change the protected rendering surface. No general capture resistance or native human visibility follows from this matrix.
