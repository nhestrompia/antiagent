import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const version = process.env.REVISION || 'baseline';
assert.ok(['baseline', 'hardened'].includes(version));
await mkdir('artifacts/debugger-renderer', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const results = [];
try {
  for (let repetition = 0; repetition < 3; repetition++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto('http://127.0.0.1:5173/combined-defense.html?temporal=noise');
    const client = await page.context().newCDPSession(page);
    const global = await client.send('Runtime.evaluate', { expression: '({layouts:typeof layouts,fullFrame:typeof fullFrame})', returnByValue: true });
    assert.deepEqual(global.result.value, { layouts: 'undefined', fullFrame: 'undefined' });
    const scripts = new Map();
    client.on('Debugger.scriptParsed', event => scripts.set(event.scriptId, event.url));
    await client.send('Debugger.enable');
    const reads = [];
    for (let step = 0; step < 3; step++) {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 250, y: 180 });
      await new Promise(resolve => setTimeout(resolve, 100));
      const pending = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Debugger pause timed out')), 5000);
        client.once('Debugger.paused', event => { clearTimeout(timeout); resolve(event); });
      });
      await client.send('Debugger.pause');
      const paused = await pending;
      const frame = paused.callFrames.find(frame => scripts.get(frame.location.scriptId)?.includes('/src/combined-defense.js'));
      assert.ok(frame, 'No renderer call frame');
      const read = await client.send('Debugger.evaluateOnCallFrame', {
        callFrameId: frame.callFrameId,
        expression: '({step:state.step,targetSlot:layouts[state.step].indexOf(tasks[state.step][1][0]),bitmapAvailable:typeof fullFrame!=="undefined"&&fullFrame!==null})',
        returnByValue: true,
      });
      assert.equal(read.exceptionDetails, undefined);
      assert.equal(read.result.value.step, step);
      const value = read.result.value;
      assert.equal(value.bitmapAvailable, version === 'baseline');
      if (value.bitmapAvailable) {
        const copy = await client.send('Debugger.evaluateOnCallFrame', {
          callFrameId: frame.callFrameId,
          expression: '(()=>{const copy=document.createElement("canvas");copy.width=720;copy.height=480;copy.getContext("2d").drawImage(fullFrame,0,0);return copy.toDataURL()})()',
          returnByValue: true,
        });
        assert.equal(copy.exceptionDetails, undefined);
        assert.ok(copy.result.value.startsWith('data:image/png;base64,'));
        await writeFile(`artifacts/debugger-renderer/${version}-${repetition}-${step}.png`, Buffer.from(copy.result.value.split(',')[1], 'base64'));
      }
      await client.send('Debugger.resume');
      reads.push(value);
      const point = { x: 190 + 130 + value.targetSlot * 230, y: 361 };
      for (let sample = 0; sample < 8; sample++) {
        await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x - 70 + sample * 10, y: point.y - 70 + sample * 10 });
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      await new Promise(resolve => setTimeout(resolve, 180));
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
    }
    const state = await page.evaluate(() => JSON.parse(document.querySelector('#status').textContent));
    assert.equal(state.completed, true); assert.equal(state.clicks, 3); assert.equal(state.blocked, false);
    results.push({ repetition, global: global.result.value, reads, state });
    await page.close();
  }
  await writeFile(`docs/debugger-renderer-${version}-results.json`, JSON.stringify({ browser: browser.version(), playwright: '1.64.0', results }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
