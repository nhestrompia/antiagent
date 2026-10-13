import { chromium } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';

// Keep browser copy-output and tab capture out of the native positive control.
const directory = resolve(process.env.CAPTURE_DIR || `artifacts/native-control-${Date.now()}`);
await mkdir(directory, { recursive: true });
const profile = await mkdtemp(resolve(tmpdir(), 'anti-agent-native-'));
const launchArgs = [`--user-data-dir=${profile}`, '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check'];
const browser = await chromium.launch({ channel: 'chrome', headless: false, ignoreDefaultArgs: true, args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const mediaEvents = [];
const client = await page.context().newCDPSession(page);
for (const event of ['playerPropertiesChanged', 'playerErrorsRaised', 'playerEventsAdded']) {
  client.on(`Media.${event}`, data => mediaEvents.push({ event, data }));
}
await client.send('Media.enable');
const browserClient = await browser.newBrowserCDPSession();
const graphics = await browserClient.send('SystemInfo.getInfo');
const asset = process.env.ASSET || 'control';
try {
  await page.goto(process.env.EXPERIMENT_URL || 'http://127.0.0.1:5173');
  await page.selectOption('#asset', asset);
  await page.evaluate(() => window.antiAgentExperiment.setMode('opaque'));
  await page.evaluate(() => window.antiAgentExperiment.start());
  await page.waitForFunction(() => window.antiAgentExperiment.snapshot().drm.protectedPlayback, null, { timeout: 60000 });
  await page.evaluate(() => { document.title = 'Anti-Agent native positive control'; });
  await page.bringToFront();
  async function save(label) {
    const snapshot = await page.evaluate(() => window.antiAgentExperiment.snapshot());
    await writeFile(`${directory}/${label}.json`, JSON.stringify({ browser: browser.version(), asset, launchArgs, graphics, mediaEvents, snapshot, browserCaptureRequested: false, nativeCaptureVerdict: 'requires native observation and human confirmation' }, null, 2));
    console.log(JSON.stringify({ directory, label, drm: snapshot.drm }));
  }
  await save('initial');
  console.log('Ready for native computer-use observation. Commands: native, opaque, transparent, baseline, status, stop.');
  const input = createInterface({ input: process.stdin });
  for await (const command of input) {
    if (command === 'stop') break;
    if (['native', 'opaque', 'transparent', 'baseline'].includes(command)) await page.evaluate(mode => window.antiAgentExperiment.setMode(mode), command);
    if (command === 'status' || ['native', 'opaque', 'transparent', 'baseline'].includes(command)) await save(command);
  }
  input.close();
  process.stdin.pause();
  process.stdin.unref?.();
} finally {
  await browser.close();
  await rm(profile, { recursive: true, force: true });
}
