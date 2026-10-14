import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const execute=promisify(execFile);
import { PNG } from 'pngjs';
import { launchChromeWithoutOverrides } from './chrome-no-overrides.mjs';

function referencePixels(bytes) {
  const image = PNG.sync.read(bytes); let count = 0;
  for (let p = 0; p < image.data.length; p += 4) if (image.data[p] < 50 && image.data[p + 1] > 70 && image.data[p + 1] < 140 && image.data[p + 2] > 50 && image.data[p + 2] < 120) count++;
  return { count, width: image.width, height: image.height };
}
await mkdir('artifacts/protected-output', { recursive: true });
const results = []; let version;
for (const [source,robustness] of [['clear','SW_SECURE_DECODE'],...['SW_SECURE_CRYPTO','SW_SECURE_DECODE','HW_SECURE_CRYPTO','HW_SECURE_DECODE','HW_SECURE_ALL'].map(level=>['encrypted',level])]) for (let repetition = 0; repetition < 3; repetition++) {
  const { browser, close } = await launchChromeWithoutOverrides();
  try {
    version = browser.version();
    const page = await browser.contexts()[0].newPage();
    await page.goto('http://127.0.0.1:5173/protected-ui.html');
    await page.selectOption('#source', source);
    await page.selectOption('#robustness', robustness);
    const capabilities=await page.evaluate(async robustness=>{try {const access=await navigator.requestMediaKeySystemAccess('com.widevine.alpha',[{initDataTypes:['cenc'],sessionTypes:['temporary'],videoCapabilities:[{contentType:'video/mp4; codecs="avc1.42c00a"',encryptionScheme:'cenc',robustness}]}]);return {supported:true,configuration:access.getConfiguration()};} catch(error) {return {supported:false,error:error.name};}},robustness);
    await page.evaluate(() => window.protectedUIExperiment.start());
    await page.waitForFunction(() => {
      const { activeSource, drm } = window.protectedUIExperiment.snapshot();
      return drm.error || (activeSource === 'encrypted' ? drm.protectedPlayback : drm.playbackVerified);
    }, null, { timeout: 20000 });
    const before = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    if (before.drm.phase==='unsupported'&&before.drm.requestedSecuritySupported===false) {results.push({source,robustness,repetition,capabilities,before,outcome:'unsupported-not-protection',nativeHumanVisibility:'Not tested'});continue;}
    if (before.drm.error) throw new Error(before.drm.error);
    await page.evaluate(() => {
      const button = document.createElement('button'); button.id = 'fullscreen-test'; button.textContent = 'Fullscreen test';
      button.addEventListener('click', () => document.querySelector('video').requestFullscreen().catch(error => { window.fullscreenTestError = error.message; }));
      document.body.prepend(button);
    });
    await page.locator('#fullscreen-test').click();
    await page.waitForFunction(() => document.fullscreenElement || window.fullscreenTestError);
    const error = await page.evaluate(() => window.fullscreenTestError);
    if (error) throw new Error(error);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const fullscreen = await page.evaluate(() => ({ active: document.fullscreenElement === document.querySelector('video'), width: innerWidth, height: innerHeight, drm: window.protectedUIExperiment.snapshot().drm }));
    const client = await page.context().newCDPSession(page), captures = [];
    for (const fromSurface of [true, false]) {
      const result = await client.send('Page.captureScreenshot', { fromSurface, captureBeyondViewport: false });
      const bytes = Buffer.from(result.data, 'base64');
      const path=`artifacts/protected-output/${source}-${robustness}-${repetition}-${fromSurface ? 'surface' : 'view'}.png`;
      await writeFile(path, bytes);
      const {stdout}=await execute('/private/tmp/anti-agent-ocr',[path]);
      const text=JSON.parse(stdout).map(item=>item.text);
      const readable=text.some(line=>line.includes('Harbor Research'))&&text.some(line=>line.includes('ALPHA-729'));
      if(source==='clear') assert.equal(readable,true,'Clear positive control not readable');
      captures.push({ fromSurface, ...referencePixels(bytes), text, readable });
    }
    results.push({ source, robustness, repetition, capabilities, before, fullscreen, captures, outcome:captures.some(capture=>capture.readable)?'capture-readable':'candidate-needs-native-validation', interactive: false, nativeHumanVisibility: 'Not tested' });
  } catch (error) { results.push({ source, robustness, repetition, failed: error.message }); }
  finally { await close(); }
}
await writeFile('docs/protected-output-results.json', JSON.stringify({ browser: version, results }, null, 2));
console.log(JSON.stringify(results.map(({ source, robustness, repetition, failed, outcome, fullscreen, captures }) => ({ source, robustness, repetition, failed, outcome, playbackVerified: fullscreen?.drm.playbackVerified, readable:captures?.map(capture=>({fromSurface:capture.fromSurface,readable:capture.readable})) }))));
if (results.some(result => result.failed)) throw new Error('One or more fullscreen cases did not complete');

if(process.argv.includes('--require-blocking')) {
  const encrypted=results.filter(result=>result.source==='encrypted');
  assert.ok(encrypted.every(result=>result.outcome==='candidate-needs-native-validation'),'Protected output acceptance failed: readable or unsupported configuration');
  throw new Error('Native visibility and application action prevention remain unvalidated');
}
