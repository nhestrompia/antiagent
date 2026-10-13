import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { launchChromeWithoutOverrides } from './chrome-no-overrides.mjs';

await mkdir('artifacts/drm-pip', { recursive: true });
const results = [];
let version;
for (const source of ['clear', 'encrypted']) for (let repetition = 0; repetition < 3; repetition++) {
  const { browser, close } = await launchChromeWithoutOverrides();
  try {
    version = browser.version();
    const context = browser.contexts()[0], page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/protected-ui.html');
    await page.selectOption('#source', source);
    await page.evaluate(() => window.protectedUIExperiment.start());
    await page.waitForFunction(() => {
      const { activeSource, drm } = window.protectedUIExperiment.snapshot();
      return drm.error || (activeSource === 'encrypted' ? drm.protectedPlayback : drm.playbackVerified);
    }, null, { timeout: 20000 });
    const before = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    if (before.drm.error) { results.push({ source, repetition, before, skipped: 'Playback unavailable' }); continue; }
    await page.evaluate(() => {
      const button = document.createElement('button'); button.id = 'pip'; button.textContent = 'Open test surface';
      button.addEventListener('click', async () => {
        try {
          const video = document.querySelector('video');
          const pip = await documentPictureInPicture.requestWindow({ width: 760, height: 520 });
          pip.document.body.append(video); video.style.width = '720px';
          await video.play(); window.pipTestReady = true;
        } catch (error) { window.pipTestError = error.message; }
      }); document.body.prepend(button);
    });
    await page.locator('#pip').click();
    await page.waitForFunction(() => window.pipTestReady || window.pipTestError);
    const pipError = await page.evaluate(() => window.pipTestError);
    if (pipError) { results.push({ source, repetition, before, skipped: pipError }); continue; }
    const pip = context.pages().find(candidate => candidate !== page);
    await pip.bringToFront();
    await pip.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const during = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    const client = await context.newCDPSession(pip);
    const capture = await client.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    const bytes = Buffer.from(capture.data, 'base64');
    await writeFile(`artifacts/drm-pip/${source}-${repetition}-pip.png`, bytes);
    const copy = await page.evaluate(() => {
      const video = documentPictureInPicture.window.document.querySelector('video');
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0); return canvas.toDataURL();
    });
    const copyBytes = Buffer.from(copy.split(',')[1], 'base64');
    await writeFile(`artifacts/drm-pip/${source}-${repetition}-copy.png`, copyBytes);
    await page.evaluate(() => {
      const video = documentPictureInPicture.window.document.querySelector('video');
      document.querySelector('.media-surface').append(video); return video.play();
    });
    await page.bringToFront();
    await page.waitForFunction(() => window.protectedUIExperiment.snapshot().drm.playbackVerified, null, { timeout: 10000 });
    const sourceClient = await context.newCDPSession(page);
    const restored = await sourceClient.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
    const restoredBytes = Buffer.from(restored.data, 'base64');
    await writeFile(`artifacts/drm-pip/${source}-${repetition}-restored.png`, restoredBytes);
    const after = await page.evaluate(() => window.protectedUIExperiment.snapshot());
    const copyImage = PNG.sync.read(copyBytes);
    let copyNonBlack = 0;
    for (let offset = 0; offset < copyImage.data.length; offset += 4) if (copyImage.data[offset] > 30 || copyImage.data[offset + 1] > 30 || copyImage.data[offset + 2] > 30) copyNonBlack++;
    results.push({ source, repetition, before, during, after, copyNonBlack, captureVerdict: 'Inspect paired images; static noninteractive media experiment', nativeHumanVisibility: 'Not tested' });
  } catch (error) { results.push({ source, repetition, failed: error.message, captureVerdict: 'No successful protection result' }); }
  finally { await close(); }
}
await writeFile('docs/drm-pip-results.json', JSON.stringify({ browser: version, results }, null, 2));
console.log(JSON.stringify(results.map(({ source, repetition, skipped, failed, during, after, copyNonBlack }) => ({ source, repetition, skipped, failed, playingInPip: during?.drm.playbackVerified, playingRestored: after?.drm.playbackVerified, copyNonBlack }))));
