import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('baseline canvas is readable without exposing business controls in DOM', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Anti-Agent capture experiment' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm reference transfer', exact: true })).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toContain('ALPHA-729');
  expect(await page.locator('body').ariaSnapshot()).not.toContain('Confirm reference transfer');
  const result = await page.evaluate(() => window.antiAgentExperiment.readback());
  expect(result.ok).toBe(true); expect(result.checksum).toBeGreaterThan(0);
  expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  await page.screenshot({ path: 'test-results/reference-baseline.png' });
});

test('experiment configurations preserve separate surfaces and unknown protection', async ({ page }) => {
  for (const mode of ['native', 'transparent', 'opaque', 'composition']) {
    await page.selectOption('#mode', mode);
    const state = await page.evaluate(() => ({ ...window.antiAgentExperiment.snapshot(), pointerEvents: getComputedStyle(document.querySelector('video')).pointerEvents }));
    expect(state.configuration.mode).toBe(mode);
    expect(state.drm.captureProtectionVerified).toBeNull();
    expect(state.drm.protectedPlayback).toBe(false);
    expect(state.pointerEvents).toBe('none');
    expect(state.conclusion).toBe('inconclusive');
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('video')).toBeHidden();
});

test('reports retain human observation and detect straightforward removal', async ({ page }) => {
  await page.selectOption('#human', 'readable');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await page.getByRole('button', { name: 'Remove video', exact: true }).click();
  const state = await page.evaluate(() => window.antiAgentExperiment.snapshot());
  expect(state.observations[0].humanReadability).toBe('readable');
  expect(state.drm.phase).toBe('removed');
  expect(state.drm.protectedPlayback).toBe(false);
});

test('invalid configuration is visible and cannot establish protected playback', async ({ page }) => {
  await page.fill('#headers', '[]');
  await page.getByRole('button', { name: 'Start protected playback', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('JSON object');
  const state = await page.evaluate(() => window.antiAgentExperiment.snapshot());
  expect(state.drm.protectedPlayback).toBe(false);
  expect(state.drm.captureProtectionVerified).toBeNull();
});

test('composition before media readiness records a failure rather than protection', async ({ page }) => {
  const result = await page.evaluate(() => window.antiAgentExperiment.compose());
  expect(result.drawSucceeded).toBe(false);
  expect(await page.evaluate(() => window.antiAgentExperiment.snapshot().drm.captureProtectionVerified)).toBeNull();
});

test('controls remain usable at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Read canvas pixels', exact: true }).click();
  await expect(page.locator('#message')).toContainText('readable by JavaScript');
});

test('Stop cancels an in-progress media load and permits another start', async ({ page }) => {
  await page.route('**/drm/encrypted-video.mpd', () => {});
  const requested = page.waitForRequest('**/drm/encrypted-video.mpd');
  await page.getByRole('button', { name: 'Start protected playback', exact: true }).click();
  await requested;
  await page.getByRole('button', { name: 'Stop / reveal page', exact: true }).click();
  await expect(page.locator('#status')).toContainText('idle');
  await expect(page.getByRole('button', { name: 'Start protected playback', exact: true })).toBeEnabled();
});

test('unsupported hardware security is reported without media loading or software fallback', async ({ page }) => {
  const support = await page.evaluate(() => window.antiAgentExperiment.probe());
  test.skip(support.find(result => result.robustness === 'HW_SECURE_ALL').supported, 'This environment supports hardware output; run the capture experiment to validate it.');
  let requestedMedia = false;
  await page.route('**/drm/encrypted-video.mpd', route => { requestedMedia = true; return route.abort(); });
  await page.selectOption('#robustness', 'HW_SECURE_ALL');
  await page.getByRole('button', { name: 'Start protected playback', exact: true }).click();
  await expect(page.locator('#status')).toContainText('unsupported');
  await expect(page.locator('#message')).toContainText('no software fallback');
  const state = await page.evaluate(() => window.antiAgentExperiment.snapshot().drm);
  expect(state.requestedSecuritySupported).toBe(false);
  expect(state.selectedRobustness).toBeNull();
  expect(state.protectedPlayback).toBe(false);
  expect(requestedMedia).toBe(false);
});
