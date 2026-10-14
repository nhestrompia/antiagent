import { mkdir, writeFile } from 'node:fs/promises';
import { launchChromeWithoutOverrides } from './chrome-no-overrides.mjs';

await mkdir('artifacts/hdcp-capture', { recursive: true });
const results = []; let version;
const mode = process.env.HDCP_CAPTURE_MODE || 'cdp';
if (!['cdp', 'tab'].includes(mode)) throw new Error('HDCP_CAPTURE_MODE must be cdp or tab');
for (let repetition = 0; repetition < 3; repetition++) {
  const title = `Anti-Agent HDCP control ${process.pid}-${repetition}`;
  const { browser, close } = await launchChromeWithoutOverrides(mode === 'tab' ? { tabCaptureTitle: title } : {});
  try {
    version = browser.version();
    const page = await browser.contexts()[0].newPage();
    await page.goto('http://127.0.0.1:5173/protected-ui.html');
    await page.evaluate(() => window.protectedUIExperiment.start());
    await page.waitForFunction(() => {
      const drm = window.protectedUIExperiment.snapshot().drm;
      return drm.error || drm.protectedPlayback;
    }, null, { timeout: 20000 });
    const before = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    if (before.drm.error) throw new Error(before.drm.error);
    await page.evaluate(() => {
      const keys = document.querySelector('video').mediaKeys;
      window.policyProbe = { available: typeof keys?.getStatusForPolicy === 'function', phase: 'idle', running: true, samples: [] };
      window.policyProbeTask = (async () => {
        if (!window.policyProbe.available) return;
        while (window.policyProbe.running && window.policyProbe.samples.length < 600) {
          const started = performance.now(), phase = window.policyProbe.phase;
          const policies = await Promise.all(['1.0', '1.4', '2.2', '2.3'].map(async minHdcpVersion => {
            try { return { minHdcpVersion, status: await keys.getStatusForPolicy({ minHdcpVersion }) }; }
            catch (error) { return { minHdcpVersion, error: `${error.name}: ${error.message}` }; }
          }));
          window.policyProbe.samples.push({ phase, started, ended: performance.now(), policies });
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })();
    });
    await page.waitForTimeout(500);
    let streamSettings;
    if (mode === 'tab') {
      await page.evaluate(title => { document.title = title; }, title);
      streamSettings = await page.evaluate(async () => {
        window.controlStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
        window.policyProbe.phase = 'tab-share';
        return window.controlStream.getVideoTracks()[0].getSettings();
      });
      if (streamSettings.displaySurface !== 'browser') throw new Error('Positive control did not capture a browser tab');
      await page.waitForTimeout(3000);
      await page.evaluate(() => window.controlStream.getTracks().forEach(track => track.stop()));
    } else {
      await page.evaluate(() => { window.policyProbe.phase = 'capture-series'; });
      const client = await page.context().newCDPSession(page);
      for (let capture = 0; capture < 10; capture++) {
        const screenshot = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
        if (capture === 0) await writeFile(`artifacts/hdcp-capture/${repetition}.png`, Buffer.from(screenshot.data, 'base64'));
      }
    }
    await page.evaluate(() => { window.policyProbe.phase = 'after'; });
    await page.waitForTimeout(500);
    const probe = await page.evaluate(async () => {
      window.policyProbe.running = false; await window.policyProbeTask; return window.policyProbe;
    });
    const after = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    results.push({ repetition, mode, before, after, probe, streamSettings, captureCount: mode === 'cdp' ? 10 : 0, enforcedLicenseChanged: false });
  } catch (error) { results.push({ repetition, failed: error.message }); }
  finally { await close(); }
}
await writeFile(mode === 'cdp' ? 'docs/hdcp-capture-results.json' : 'docs/hdcp-tab-control-results.json', JSON.stringify({ browser: version, mode, results }, null, 2));
console.log(JSON.stringify(results.map(result => ({ repetition: result.repetition, failed: result.failed, available: result.probe?.available, samples: result.probe?.samples.length, statuses: [...new Set(result.probe?.samples.flatMap(s => s.policies.map(p => `${p.minHdcpVersion}:${p.status || p.error}`)))] }))));
if (results.some(result => result.failed)) throw new Error('One or more policy-probe cases did not complete');
