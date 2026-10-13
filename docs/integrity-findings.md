# Browser-enforced module integrity

Run `npm run benchmark:integrity`. The generator copies the gate and renderer into static public assets, computes SHA-384 for their actual bytes and writes an import-map integrity entry plus an entry-script integrity attribute. Open `/integrity/index.html` on the existing Vite origin.

Five fresh-page cases ran in Chrome 155.0.8059.40. The clean control drew the UI and completed the action. A plain preload hook triggered the API gate and received a black canvas, zero labels and zero actions. Replacing either the gate dependency or the entry runtime produced a browser integrity error. In those cases the runtime never started, the black canvas remained, and the action did not run. Tests check actual pixels and action state as well as browser error messages.

The next bypass modified the HTML response to remove the gate's import-map integrity entry, then replaced the gate dependency. The entry runtime remained byte-for-byte valid. The app drew normally, the preload recovered the labels, and the action completed. Integrity therefore blocks resource substitution when the HTML trust anchor remains intact. It cannot prevent a browser controller from changing the HTML itself.

The T3 preview also loaded the intact page without code modification. I read the button from its screenshot and clicked it by coordinates. The action completed. This independently confirms that a client need not tamper with any checked API to operate the intact page.

No new server or confirmation step was introduced. Build passed. Generator output is deterministic for source bytes. Regenerate hashes after changing the gate or runtime. These static assets are a lab, not an npm release or production integration.

Results: [integrity-results.json](integrity-results.json). Images remain local under `artifacts/integrity-validation/`. Primary browser support and specification sources: [module-integrity-research.md](module-integrity-research.md).

## What this establishes

The project now has two measured blocking mechanisms: a pre-render tamper gate for named hooks and browser-enforced resource integrity for named scripts. The stronger clients still bypass them through reference-realm instrumentation, HTML replacement, or an intact browser's screenshot/input path. No claim of universal Playwright prevention is supported by this evidence.
