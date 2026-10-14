# HDCP policy queries during capture

The experiment queried MediaKeys.getStatusForPolicy for HDCP 1.0, 1.4, 2.2, and 2.3. It used successful Widevine playback in fresh installed Chrome instances. It did not change license policy, assets, or the license service.

Three trials each took ten CDP compositor screenshots. All four policy queries stayed usable at baseline, throughout the sampled screenshot series, and afterward. The series contained 57, 50, and 52 policy samples respectively. The first saved capture from each trial is under artifacts/hdcp-capture/. Visual inspection of the first trial confirmed readable account, recipient, action label, and capture token. See [CDP results](hdcp-capture-results.json).

A positive control shared only a uniquely named experiment tab through getDisplayMedia. The isolated Chrome instance used a tab-title selection flag; it did not capture the user's screen or other tabs. Each returned stream reported displaySurface=browser. The test stopped each stream and closed its browser.

In the three-second positive controls, all three trials changed from usable to output-restricted during tab sharing. Each trial took 250 policy samples while sharing. The status remained restricted during the 500-millisecond sample window after stopping. This is a delayed status signal, not a precise capture-start or capture-end event. See [tab-sharing results](hdcp-tab-control-results.json).

An earlier 500-millisecond control observed the transition in two of three trials. The longer repeat addressed that timing concern. The short-run records remain in [short control results](hdcp-tab-control-short-results.json).

The API checks a hypothetical HDCP restriction. It does not impose that restriction on the existing license or stop playback. No app-cover guard was installed in this experiment. The positive control establishes a signal for the tested MediaStream path; it does not establish a signal for native screenshots or direct CDP capture. Short transients outside the sampled queries remain possible.

Run npm run dev, then node scripts/benchmark-hdcp-capture.mjs. Use HDCP_CAPTURE_MODE=tab for the three-second positive control. Research and primary sources are in [output-policy research](drm-output-policy-research.md).

This is a new browser-owned screen-sharing signal, but it does not close the foreground compositor screenshot gap.
