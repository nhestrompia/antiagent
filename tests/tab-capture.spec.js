import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import { captureExperimentTab } from '../scripts/tab-capture.mjs';

test.use({ headless: false, launchOptions: { ignoreDefaultArgs: ['--disable-component-update', '--disable-component-extensions-with-background-pages', '--disable-background-networking', '--no-sandbox'], args: ['--auto-select-tab-capture-source-by-title=Anti-Agent capture experiment', '--auto-accept-this-tab-capture'] } });

test('a static baseline produces its first frame and a recording', async ({ page }) => {
  await page.goto('/');
  await page.bringToFront();
  const capture = await captureExperimentTab(page);
  expect(capture.available, capture.error).toBe(true);
  expect(capture.settings.displaySurface).toBe('browser');
  expect(capture.frameDataUrl).toMatch(/^data:image\/png;base64,/);
  expect(capture.recordingDataUrl).toMatch(/^data:video\/webm/);
  expect(capture.snapshot.drm.protectedPlayback).toBe(false);
  const image = PNG.sync.read(Buffer.from(capture.frameDataUrl.split(',')[1], 'base64'));
  const bounds = capture.snapshot.referenceRegion;
  expect((bounds.y + bounds.height) * image.width / capture.snapshot.environment.viewport.width).toBeLessThanOrEqual(image.height);
});
