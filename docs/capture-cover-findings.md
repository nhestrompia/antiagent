# Combined visual capture cover

Run `npm run benchmark:cover` with Vite on localhost:5173. Open `/capture-cover.html`.

The reusable experimental module is `src/capture-cover.js`. Install it on an explicit region after that region exists. It combines the measured disappearing-scrollbar geometry signal and hidden animation-frame signal. On a signal it hides the region, adds an opaque black cover and makes the region inert. An optional onCover callback lets the application clear drawing buffers. The lab uses that callback to erase its canvas and reject the local action.

The geometry check is narrower than the earlier resize guard: the window width must remain unchanged while the document width expands to eliminate its initial scrollbar gap. Ordinary window resizing no longer matches the tested condition. This remains a heuristic, not a screenshot event.

Twenty-one fresh-browser cases ran in Chrome 155.0.8059.40, three repetitions of seven operations. All full-page and genuinely hidden viewport captures showed black pixels in the protected control. Canvas getImageData also returned black after the cover. Actual coordinate action attempts were rejected, including after the hidden page returned to the foreground.

Removing the opaque layer and restoring region visibility and pointer eligibility after a full-page capture did not recover the erased canvas pixels. The next viewport screenshot stayed black and the action stayed blocked in all three repetitions. This checks straightforward layer removal, not resistance to replacing the application, intercepting scripts or reconstructing state through a debugger.

Foreground viewport capture and focus-emulated background viewport capture bypassed the trigger in all three repetitions each. Their screenshots retained the control and real pointer actions completed. Ordinary resizing remained usable in all three repetitions. An ordinary layout change that removed the scrollbar incorrectly covered the region in all three repetitions, establishing a remaining false positive.

The cover latches after a signal. It does not know when capture ends and does not automatically restore the interface. Dispose disconnects observers and removes the cover, but does not reconstruct cleared canvas pixels. A host application must manage its own rendering lifecycle. The lab requires a reload for a fresh trial. This is not a shipped human recovery flow or a production-ready package.

The module changes visual output and interaction eligibility. It does not secure DOM labels, application memory, network responses or arbitrary browser control. The canvas clearing is supplied by the lab callback, not automatic conversion of an application. Human accessibility and false-positive rates remain unvalidated. No new application backend, npm flow or publication was added.

Results: [capture-cover-results.json](capture-cover-results.json). Screenshots remain local under `artifacts/capture-cover/`. Build passed. The unresolved foreground trigger is documented in [foreground-capture-event-research.md](foreground-capture-event-research.md).
