import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
await mkdir('artifacts/tamper-reference-validation', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
function install(mode) {
  window.observedLabels = [];
  const target = CanvasRenderingContext2D.prototype;
  const original = target.fillText;
  if (mode === 'plain') {
    target.fillText = function (...args) { window.observedLabels.push(args); return original.apply(this, args); };
    return;
  }
  const nativeString = 'function fillText() { [native code] }';
  const nativeStrings = new WeakMap();
  const proxy = new Proxy(original, { apply(fn, receiver, args) { window.observedLabels.push(args); return Reflect.apply(fn, receiver, args); } });
  target.fillText = proxy;
  nativeStrings.set(proxy, nativeString);
  function disguise(realm) {
    const stringify = realm.Function.prototype.toString;
    const replacement = new Proxy(stringify, {
      apply(fn, receiver, args) { return nativeStrings.has(receiver) ? nativeStrings.get(receiver) : Reflect.apply(fn, receiver, args); },
    });
    nativeStrings.set(replacement, 'function toString() { [native code] }');
    realm.Function.prototype.toString = replacement;
  }
  disguise(window);
  if (mode === 'cross-realm' || mode === 'deep-disguise') {
    const append = Node.prototype.appendChild;
    const insert = (receiver, node) => {
      const result = append.call(receiver, node);
      if (node instanceof HTMLIFrameElement && node.contentWindow) disguise(node.contentWindow);
      return result;
    };
    const replacement = mode === 'deep-disguise'
      ? new Proxy(append, { apply(fn, receiver, args) { return insert(receiver, args[0]); } })
      : function (node) { return insert(this, node); };
    nativeStrings.set(replacement, 'function appendChild() { [native code] }');
    Node.prototype.appendChild = replacement;
  }
}
try {
  for (const mode of ['clean', 'plain', 'local-disguise', 'cross-realm', 'deep-disguise', 'response-replace']) {
    const page = await browser.newPage();
    if (['plain', 'local-disguise', 'cross-realm', 'deep-disguise'].includes(mode)) await page.addInitScript(install, mode);
    if (mode === 'response-replace') await page.route('**/src/tamper-gate.js*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: 'export function inspectAPIs(){return {allowed:true,reasons:[]}}' });
    });
    await page.goto('http://127.0.0.1:5173/tamper-lab.html');
    const before = JSON.parse(await page.locator('#status').textContent());
    const canvasImage = PNG.sync.read(await page.locator('canvas').screenshot({ path: `artifacts/tamper-reference-validation/${mode}.png` }));
    const p = (235 * canvasImage.width + 130) * 4;
    const uiVisible = canvasImage.data[p + 1] > 50;
    assert.equal(uiVisible, before.gate.allowed);
    const rect = await page.locator('canvas').boundingBox();
    await page.mouse.click(rect.x + 130, rect.y + 235);
    const after = JSON.parse(await page.locator('#status').textContent());
    const labels = await page.evaluate(() => window.observedLabels || []);
    const expected = ['clean', 'deep-disguise', 'response-replace'].includes(mode);
    assert.equal(after.accepted, expected ? 1 : 0);
    results.push({ mode, uiVisible, labels, ...after });
    await page.close();
  }
  await writeFile('docs/tamper-reference-results.json', JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
