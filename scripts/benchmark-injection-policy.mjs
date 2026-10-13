import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  for (const policy of ['csp', 'csp-trusted-types']) {
    const page = await browser.newPage();
    await page.addInitScript(() => { window.initScriptRan = true; });
    const csp = "default-src 'none'; script-src 'nonce-testnonce'; " + (policy === 'csp-trusted-types' ? "require-trusted-types-for 'script'; trusted-types 'none'" : '');
    await page.route('**/injection-policy-test.html', route => route.fulfill({
      contentType: 'text/html', headers: { 'Content-Security-Policy': csp },
      body: `<html><title>Injection policy positive controls</title><script>window.unapprovedInlineRan=true</script><script nonce="testnonce">window.approvedScriptRan=true;try{eval('window.pageEvalRan=true')}catch(error){window.pageEvalError=error.name}</script></html>`,
    }));
    await page.goto('http://127.0.0.1:5173/injection-policy-test.html');
    let scriptTagError = null;
    try { await page.addScriptTag({ content: 'window.injectedTagRan=true' }); }
    catch (error) { scriptTagError = error.name; }
    await page.evaluate(() => { window.debuggerEvaluationRan = true; });
    const state = await page.evaluate(() => ({
      initScriptRan: window.initScriptRan === true,
      approvedScriptRan: window.approvedScriptRan === true,
      unapprovedInlineRan: window.unapprovedInlineRan === true,
      pageEvalRan: window.pageEvalRan === true,
      pageEvalError: window.pageEvalError,
      injectedTagRan: window.injectedTagRan === true,
      debuggerEvaluationRan: window.debuggerEvaluationRan === true,
    }));
    assert(state.approvedScriptRan);
    assert(!state.unapprovedInlineRan && !state.pageEvalRan && !state.injectedTagRan);
    assert(state.initScriptRan && state.debuggerEvaluationRan);
    results.push({ policy, ...state, scriptTagError });
    await page.close();
  }
  await writeFile('docs/injection-policy-results.json', JSON.stringify({ browser: browser.version(), bypassCSP: false, results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
