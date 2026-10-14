# Moving text and screenshot registration

The opt-in `jitter=on` renderer moves choice text vertically by a random offset from -4 to 4 pixels each frame. It applies the same offset to the real text and decoy glyphs. Button positions remain fixed. This targets the exact repeated pixel columns used by the earlier screenshot client.

## Paired clients

The unaligned eight-frame client completed no sessions in three trials. It failed to recognize a target in each case. Those are incomplete reading attempts, not three explicit blocks. See [the unaligned results](jitter-unaligned-results.json).

The adapted client estimates the bottom of the text band in each cropped screenshot. It counts white pixels inside the buttons, excluding the white gaps. It then translates each captured frame to align the text band before reconstructing repeated columns. It uses only the captured pixels. It does not read the renderer's random offsets.

The aligned client completed the full flow in **3/3 sessions**. All experimental layers were active, including jitter, decoy glyphs, freshness deadlines, the action-time clock check, DRM, and both detectors. It used the ordinary clock. It issued no Runtime, Debugger, or DOM commands. See [the aligned results](jitter-aligned-results.json).

Each reconstruction batch records its estimated shifts and processing time. The final diagnostics verify DRM playback and allowed detectors. Successful completion requires the original private task checks and trusted pointer transactions.

Moving the text defeated the fixed-pixel reader. Image registration restored useful screenshots. This experiment therefore does not prevent CDP screenshots from helping an adaptive agent.

## Reproduce and limits

Run `npm run benchmark:jitter-unaligned` and `npm run benchmark:jitter-aligned` for the paired clients. `npm run verify:current-stack` now includes jitter and the aligned reader. Its strict check rejects any successful session.

The renderer remains opt-in. Human readability and accessibility are unvalidated. Text motion can make reading harder. No measured failure of a particular OCR client proves capture exclusion. The successful aligned client already rejects a prevention guarantee.

The build, script syntax check, and diff check passed. The existing large-chunk warning remains for the DRM bundle.
