import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const directory = resolve(process.env.CAPTURE_DIR || `artifacts/randomized-canvas-${Date.now()}`);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const runs = [];
const repetitions = 30;
try {
  for (const strategy of ['fixed-replay', 'render-instrumentation']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    if (strategy === 'render-instrumentation') await context.addInitScript(() => {
      window.canvasTextCalls = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...rest) {
        window.canvasTextCalls.push({ text, x, y });
        return original.call(this, text, x, y, ...rest);
      };
    });
    const page = await context.newPage();
    for (const layout of ['fixed', 'randomized']) {
      for (let repetition = 0; repetition < repetitions; repetition++) {
        const started = performance.now();
        await page.goto(`http://127.0.0.1:5173/randomized-canvas.html?layout=${layout}`);
        const semantics = await page.locator('body').ariaSnapshot();
        assert.equal(semantics.includes('Harbor Research'), false);
        const canvas = page.locator('canvas');
        for (const label of ['Harbor Research', '125 EUR', 'Confirm transfer']) {
          const point = strategy === 'fixed-replay' ? { x: 130, y: 235 } : await page.evaluate(label => {
            const call = window.canvasTextCalls.findLast(call => call.text === label && call.y === 240);
            return { x: call.x + 80, y: 235 };
          }, label);
          await canvas.click({ position: point });
        }
        const state = await page.evaluate(() => window.randomizedCanvasExperiment.snapshot());
        runs.push({ strategy, layout, repetition, ...state, elapsedMs: performance.now() - started });
        if (repetition === 0) await page.screenshot({ path: `${directory}/${strategy}-${layout}.png` });
      }
    }
    await context.close();
  }
  const summary = ['fixed-replay', 'render-instrumentation'].flatMap(strategy => ['fixed', 'randomized'].map(layout => {
    const subset = runs.filter(run => run.strategy === strategy && run.layout === layout);
    return { strategy, layout, attempts: subset.length, completed: subset.filter(run => run.completed).length, meanClicks: subset.reduce((sum, run) => sum + run.clicks, 0) / subset.length };
  }));
  assert.equal(summary.find(row => row.strategy === 'fixed-replay' && row.layout === 'fixed').completed, repetitions);
  assert.equal(summary.find(row => row.strategy === 'render-instrumentation' && row.layout === 'randomized').completed, repetitions);
  await writeFile(`${directory}/report.json`, JSON.stringify({ browser: browser.version(), repetitions, summary, runs, screenshotOnlyAgent: 'tested separately through collaborative preview' }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally { await browser.close(); }
