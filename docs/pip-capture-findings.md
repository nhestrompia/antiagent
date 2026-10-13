# Document Picture-in-Picture capture experiment

Tested on macOS with headed installed Chrome. The [results](pip-capture-results.json) contain all three trials and the browser version.

The lab moves its canvas into a Document Picture-in-Picture window after a click. This changes the app window and requires a user gesture. It is not a transparent wrapper for an existing page.

Each trial exposed a second page target titled Anti-Agent PiP surface. After bringing it forward and waiting two animation frames, its CDP compositor screenshot remained white. All three captures had zero reference-color pixels. This is a measured capture gap, not evidence that a human could see the UI: native visual output and native screenshots were not validated in this experiment.

The automation bypass succeeded in all three trials. The opener accessed the PiP canvas through documentPictureInPicture.window.document. It read the expected reference pixel, copied the canvas into the source tab, and captured that copy through CDP. Each copied screenshot contained 44,443 reference-color pixels. Visual inspection confirmed a readable Confirm transfer label. Coordinate input to the original PiP canvas completed the action in all three trials.

An initial assertion checked only whether a pixel's green channel exceeded 50. White also passed that check. The final runner counts exact reference-color pixels across the image and separately checks action completion. The final results replace the initial run.

Run npm run dev, then node scripts/benchmark-pip-capture.mjs. Open /pip-capture.html for the lab. Images are under artifacts/pip-capture/.

The [Chrome documentation](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) explicitly allows opener access to PiP elements. Moving the UI into this surface does not remove privileged page access or input. No universal capture protection follows from the blank target screenshots.
