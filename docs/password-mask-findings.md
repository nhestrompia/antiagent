# Password masking and HTML capture hints

This local fixture uses generated synthetic values, not real passwords or user credentials. A readonly password field receives its value through its JavaScript property, so the attack does not rely on a value attribute embedded in markup. The response handler requires the original correct value, a trusted input event, and a trusted confirm click. It does not fabricate success or event trust.

Three clients resolve the field and call its normal value getter through browser execution. Three other clients change its type to text, capture the newly visible value, recover it with OCR, then insert the value and click Confirm through browser input. Neither client enables Runtime; the property reader uses Runtime.callFunctionOn, while the type-reveal client uses only DOM, capture, and input commands.

In all six final sessions the initial screenshot did not expose the password text. Both recovery strategies completed the task in 3/3 each. The password field masks ordinary presentation, including human presentation; this fixture does not claim an independently readable human interface. It demonstrates that masked pixels do not protect application-accessible values from the browser controller.

The fixture also includes a visibly marked region with `capturable="false"` and `sensitive`, following the 2024 proposal's example. The marker remained readable in all six initial screenshots. Accepting those attributes in HTML does not implement capture redaction in the tested installed Chrome. The version and measurements are recorded in `password-mask-results.json`; the status of the proposal is reviewed in `html-capture-prevention-review.md`.

The pilot type-reveal client read a truncated string because the fixture input was too narrow. Its three failures are preserved in `password-mask-pilot-results.json`; they are not prevention evidence. Widening the input made the entire synthetic value visible and one later UUID trial also failed due to OCR transcription, retained in `password-mask-ocr-pilot-results.json`. The final fixture uses a random decimal token to separate ordinary OCR errors from the masking mechanism. Captures remain local under `artifacts/password-mask/`.

Run `npm run benchmark:password-mask` with the development server available. This is an HTML experiment, not a production password workflow or an agent-proof renderer. No shipped capture-specific HTML control was established by the source review and live test.
