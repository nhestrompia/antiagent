# CPU pressure and CDP screenshots

Visible Chrome 155.0.8059.80 on macOS completed 12 trials. Runtime and Debugger commands were absent. The fixture covers its secret panel with black pixels and rejects its button action when PressureObserver reports serious or critical CPU pressure.

| Condition | Trials | Readable first and last images | Accepted actions |
| --- | ---: | ---: | ---: |
| Physical CPU source, idle then capture | 3 | 3 | 3 |
| Physical CPU source, capture burst | 3 | 3 | 3 |
| CDP virtual critical pressure | 3 | 0 | 0 |
| CDP virtual nominal pressure | 3 | 3 | 3 |

The critical controls prove that the cover and input rejection worked. All three nominal controls received the requested nominal record, then allowed readable captures and accepted input. The client set the virtual source before navigation. It did not change the fixture's JavaScript.

All physical capture-burst trials returned nominal or fair records. One physical idle trial had no record within the acquisition window despite API availability and no reported error. That trial proves readable pixels and accepted input, but gives no physical pressure measurement. It must not count as a nominal sample.

CPU pressure therefore does not provide a required screenshot signal in these trials. More broadly, CDP can replace the source with a nominal reading. A fail-closed rule on missing records would not stop the demonstrated virtual-source route.

Run `npm run benchmark:pressure-signal` with the Vite server on port 5173 and the local Vision OCR helper installed. The harness checks virtual-state delivery, critical black pixels, nominal OCR, and trusted input. Raw results are in `pressure-signal-results.json`; images remain under `artifacts/pressure-signal/`.

See `browser-signal-review-2026-10-16.md` for primary sources and API limits. The pinned Chromium source is 155.0.8059.40; the measured browser is .80. This experiment does not install a production detector or establish agent resistance.
