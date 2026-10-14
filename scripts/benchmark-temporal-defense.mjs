import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
const execute = promisify(execFile);
const headed = process.env.HEADED === '1';
const noise = process.env.NOISE === '1';
const directory = `artifacts/temporal-defense-${noise ? 'noise-' : ''}${headed ? 'headed' : 'headless'}`;
await mkdir(directory, { recursive: true });
function textDistance(a, b) {
  const left = a.toLowerCase().replace(/[^a-z0-9]/g, ''), right = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  let row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const next = [i];
    for (let j = 1; j <= right.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    row = next;
  }
  return row[right.length];
}
const browser = await chromium.launch({ channel: 'chrome', headless: !headed, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
const selectedStrategy = process.env.STRATEGY;
if (selectedStrategy && !['single-frame', 'frame-union', 'frame-median', 'frame-mean'].includes(selectedStrategy)) throw new Error('Unknown strategy');
try {
  for (const strategy of (selectedStrategy ? [selectedStrategy] : noise ? ['frame-union', 'frame-median'] : headed ? ['frame-union'] : ['single-frame', 'frame-union'])) for (let repetition = 0; repetition < 3; repetition++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`http://127.0.0.1:5173/combined-defense.html?temporal=${noise ? 'noise' : 'on'}`);
    const client = await page.context().newCDPSession(page);
    const observations = [];
    for (const label of ['Harbor Research', '125 EUR', 'Confirm transfer']) {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 250, y: 180 });
      await new Promise(resolve => setTimeout(resolve, 100));
      let combined;
      const frames = [];
      const frameCount = strategy === 'single-frame' ? 1 : ['frame-median', 'frame-mean'].includes(strategy) ? 64 : 16;
      for (let frame = 0; frame < frameCount; frame++) {
        const capture = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
        const image = PNG.sync.read(Buffer.from(capture.data, 'base64'));
        if (frame === 0) await writeFile(`${directory}/${strategy}-${repetition}-${observations.length}-first.png`, PNG.sync.write(image));
        if (['frame-median', 'frame-mean'].includes(strategy)) frames.push(image);
        if (!combined) { combined = new PNG({width:image.width,height:image.height}); combined.data.set(image.data); }
        else for (let pixel = 0; pixel < image.data.length; pixel++) combined.data[pixel] = Math.max(combined.data[pixel], image.data[pixel]);
        await new Promise(resolve => setTimeout(resolve, 19));
      }
      if (['frame-median', 'frame-mean'].includes(strategy)) {
        const scale = combined.width / 1280;
        const samples = new Uint8Array(frameCount);
        for (let y = Math.round(300 * scale); y < Math.round(410 * scale); y++) for (let x = Math.round(220 * scale); x < Math.round(890 * scale); x++) {
          const offset = (y * combined.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            for (let frame = 0; frame < frameCount; frame++) samples[frame] = frames[frame].data[offset + channel];
            if (strategy === 'frame-median') { samples.sort(); combined.data[offset + channel] = samples[frameCount / 2]; }
            else {
              const mean = samples.reduce((sum, value) => sum + value, 0) / frameCount;
              combined.data[offset + channel] = Math.max(0, Math.min(255, Math.round(mean * 2 - 127.5)));
            }
          }
        }
      }
      const path = `${directory}/${strategy}-${repetition}-${observations.length}-union.png`;
      await writeFile(path, PNG.sync.write(combined));
      const rawOCR = await execute('/private/tmp/anti-agent-ocr', [path]);
      // Restore contrast after fractional pixel scaling spreads each revealed stripe.
      for (let pixel = 0; pixel < combined.data.length; pixel += 4) {
        const r = combined.data[pixel], g = combined.data[pixel + 1], b = combined.data[pixel + 2];
        const alpha = (r - 17) / 238;
        if (r > 30 && Math.abs(g - (100 + 155 * alpha)) < 20 && Math.abs(b - (86 + 169 * alpha)) < 20) {
          combined.data[pixel] = combined.data[pixel + 1] = combined.data[pixel + 2] = 255;
        }
      }
      const contrastPath = path.replace('-union.png', '-contrast.png');
      await writeFile(contrastPath, PNG.sync.write(combined));
      const { stdout } = await execute('/private/tmp/anti-agent-ocr', [contrastPath]);
      const text = [...JSON.parse(rawOCR.stdout).map(item => ({...item, source:'raw'})), ...JSON.parse(stdout).map(item => ({...item, source:'contrast'}))];
      const target = text.map(item => ({ ...item, distance: textDistance(item.text, label) })).filter(item => item.distance <= Math.max(2, Math.ceil(label.replace(/[^a-z0-9]/gi, '').length * 0.3))).sort((a, b) => a.distance - b.distance)[0];
      observations.push({ label, frameCount, text, target: target ?? null });
      if (!target) break;
      const point = { x: target.x * 1280, y: target.y * 900 };
      for (let sample = 0; sample < 8; sample++) {
        await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x - 70 + sample * 10, y: point.y - 70 + sample * 10 });
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      await new Promise(resolve => setTimeout(resolve, 180));
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
    }
    const state = await page.evaluate(() => JSON.parse(document.querySelector('#status').textContent));
    console.log(JSON.stringify({strategy,repetition,state,labels:observations.map(o=>({label:o.label,target:o.target}))}));
    
    if (state.completed) { assert.equal(state.step, 3); assert.equal(state.clicks, 3); assert.equal(state.blocked, false); }
    results.push({ strategy, repetition, state, observations });
    await page.close();
  }
  await writeFile(noise ? `docs/temporal-noise-${selectedStrategy ? selectedStrategy + '-' : ''}${headed ? 'headed' : 'headless'}-results.json` : headed ? 'docs/temporal-defense-headed-results.json' : 'docs/temporal-defense-results.json', JSON.stringify({ headed, noise, browser: browser.version(), playwright: '1.64.0', results }, null, 2));
  console.log(JSON.stringify(results.map(({ strategy, repetition, state }) => ({ strategy, repetition, state }))));
} finally { await browser.close(); }
