import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
await mkdir('artifacts/shadow-validation', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
try {
  for (const mode of ['open', 'closed']) for (const agent of ['role-locator', 'preload', 'cdp-pierce', 'coordinate', 'keyboard']) {
    const page = await browser.newPage();
    if (agent === 'preload') await page.addInitScript(() => {
      const original = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) { return original.call(this, { ...options, mode: 'open' }); };
    });
    await page.goto(`http://127.0.0.1:5173/shadow-lab.html?mode=${mode}`);
    const client = await page.context().newCDPSession(page);
    const accessibility = await client.send('Accessibility.getFullAXTree');
    const axLabelExposed = accessibility.nodes.some(node => node.name?.value === 'Confirm transfer');
    await page.screenshot({ path: `artifacts/shadow-validation/${mode}-${agent}.png` });
    let error = null;
    try {
      if (agent === 'role-locator' || agent === 'preload') await page.getByRole('button', { name: 'Confirm transfer' }).click({ timeout: 600 });
      else if (agent === 'keyboard') { await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); }
      else if (agent === 'coordinate') await page.mouse.click(150, 145);
      else {
        const tree = await client.send('DOM.getDocument', { depth: -1, pierce: true });
        function find(node) {
          if (node.nodeName === 'BUTTON') return node;
          for (const child of [...node.children || [], ...node.shadowRoots || []]) { const result = find(child); if (result) return result; }
        }
        const node = find(tree.root);
        assert(node, 'CDP must find actual button');
        const { model } = await client.send('DOM.getBoxModel', { nodeId: node.nodeId });
        const q = model.border;
        await page.mouse.click((q[0] + q[4]) / 2, (q[1] + q[5]) / 2);
      }
    } catch (failure) { error = failure.name; }
    const accepted = await page.locator('#status').textContent() === '1 accepted';
    results.push({ mode, agent, accepted, axLabelExposed, error });
    assert.equal(accepted, !(mode === 'closed' && agent === 'role-locator'));
    await page.close();
  }
  await writeFile('docs/shadow-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
