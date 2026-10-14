# Protected output capability and capture experiment

This benchmark tries the protected-texture direction through supported EME requests. Website JavaScript cannot assign Chromium's internal `secure_output_only` texture flag. It can request a supported key system and robustness, then test the resulting decoded media. The existing runtime refuses unsupported robustness instead of falling back to software.

The matrix uses three fresh installed-Chrome sessions for a clear readable control and each of five encrypted configurations: SW_SECURE_CRYPTO, SW_SECURE_DECODE, HW_SECURE_CRYPTO, HW_SECURE_DECODE, and HW_SECURE_ALL. It records the direct navigator key-system capability response, the runtime's requested/selected robustness and playback state, both fullscreen screenshot paths, pixel counts, and OCR. Existing assets and the development license endpoint remain unchanged.

Unsupported output is recorded as `unsupported-not-protection`. It does not count as a blocked agent while humans can use the interface. Actual initialization or capture errors fail the runner. Supported playback with readable task labels is `capture-readable`. Unreadable captures after verified playback would be `candidate-needs-native-validation`, because human visibility and application action prevention must still be established separately.

Run `npm run benchmark:protected-output` with the local development server available. Results are saved in `protected-output-results.json`; captures remain local under `artifacts/protected-output/`. `verify:protected-output` cannot pass on readable captures, unsupported configurations, or unvalidated native visibility.

The source review in `protected-copy-output-review.md` identifies conditional browser redaction for secure-output textures. The experiment does not fabricate that flag, replace the compositor, change license restrictions, or infer secure composition from an encrypted-playback boolean. A platform that rejects stronger configurations is a deployment limit, not evidence that a browser-only renderer has become agent-proof.

The final 18-session run finished without failed cases. Clear controls were readable through both capture paths in 3/3. SW_SECURE_CRYPTO and SW_SECURE_DECODE both verified encrypted playback and remained readable through compositor capture in 3/3 each; view-based capture did not recover the interface. All three hardware-secure configurations were unsupported in 3/3 each. This Mac produced no supported configuration that made both tested capture paths unreadable.

The pilot results are retained in `protected-output-pilot-results.json`. Several pilot trials failed during redundant exitFullscreen cleanup after their captures. The final runner closes each isolated browser in finally instead and retains the capture measurements. Those pilot failures are not protection results.
