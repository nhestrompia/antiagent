import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { launchChromeWithoutOverrides } from './chrome-no-overrides.mjs';
await mkdir('artifacts/capture-policy', { recursive: true });
const results = []; let version;
for (const blocked of [false, true]) for (let repetition = 0; repetition < 3; repetition++) {
  const title = `Anti-Agent capture policy ${process.pid}-${repetition}`;
  const { browser, close } = await launchChromeWithoutOverrides({ tabCaptureTitle: title });
  try {
    version = browser.version(); const context = browser.contexts()[0], page = await context.newPage();
    if (blocked) await page.route('**/capture-policy.html', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'permissions-policy': 'display-capture=()' } });
    });
    const response = await page.goto('http://127.0.0.1:5173/capture-policy.html');
    const appliedHeader = response.headers()['permissions-policy'] || null;
    const policy = await page.evaluate(title => {
      document.title = title;
      return (document.permissionsPolicy || document.featurePolicy).allowsFeature('display-capture');
    }, title);
    assert.equal(policy, !blocked);
    const rect = await page.locator('canvas').boundingBox();
    const scale = await page.evaluate(() => devicePixelRatio);
    const client = await context.newCDPSession(page);
    const sample = bytes => {
      const image = PNG.sync.read(bytes);
      const p = (Math.round((rect.y + 220) * scale) * image.width + Math.round((rect.x + 60) * scale)) * 4;
      return [...image.data.slice(p, p + 3)];
    };
    const baseline = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    const baselinePixel = sample(Buffer.from(baseline.data, 'base64'));
    assert(baselinePixel[1] > baselinePixel[0] + 30 && baselinePixel[1] > baselinePixel[2], 'Baseline reference must be visibly teal');
    const request = await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
        const settings = stream.getVideoTracks()[0].getSettings(); stream.getTracks().forEach(track => track.stop());
        return { allowed: true, settings };
      } catch (error) { return { allowed: false, error: `${error.name}: ${error.message}` }; }
    });
    assert.equal(request.allowed, !blocked);
    if (!blocked) assert.equal(request.settings.displaySurface, 'browser');
    else assert.match(request.error, /NotAllowedError/);
    const screenshot = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    const bytes = Buffer.from(screenshot.data, 'base64');
    await writeFile(`artifacts/capture-policy/${blocked}-${repetition}.png`, bytes);
    const pixel = sample(bytes); assert.deepEqual(pixel, baselinePixel);
    await page.mouse.click(rect.x + 130, rect.y + 235);
    const accepted = JSON.parse(await page.locator('#status').textContent()).accepted; assert.equal(accepted, 1);
    results.push({ blocked, repetition, appliedHeader, policy, request, baselinePixel, pixel, accepted });
  } catch (error) { results.push({ blocked, repetition, failed: error.message }); }
  finally { await close(); }
}
await writeFile('docs/capture-policy-results.json', JSON.stringify({ browser: version, results }, null, 2));
console.log(JSON.stringify(results));
if (results.some(result => result.failed)) throw new Error('A policy/capture case did not complete');
