import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { chromium } from '@playwright/test';

const packager = process.env.PACKAGER;
if (!packager) throw new Error('Set PACKAGER to the official Shaka Packager executable. See README.md.');
const control = process.env.ASSET_KIND === 'control';
const interfaceVideo = process.env.ASSET_KIND === 'interface';
const size = interfaceVideo ? 720 : control ? 64 : 16;
const height = interfaceVideo ? 480 : size;
const output = resolve(interfaceVideo ? 'public/drm-ui' : control ? 'public/drm-control' : 'public/drm');
const filter = control ? 'color=c=yellow:s=64x64:r=1,drawbox=x=0:y=0:w=32:h=32:color=red:t=fill,drawbox=x=32:y=0:w=32:h=32:color=lime:t=fill,drawbox=x=0:y=32:w=32:h=32:color=blue:t=fill' : 'color=c=black:s=16x16:r=1';
const temporary = mkdtempSync(join(tmpdir(), 'anti-agent-media-'));
mkdirSync(output, { recursive: true });
try {
  let input = ['-f', 'lavfi', '-i', filter];
  if (interfaceVideo) {
    const browser = await chromium.launch({ channel: 'chrome' });
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      await page.goto(process.env.EXPERIMENT_URL || 'http://127.0.0.1:5173');
      const dataUrl = await page.evaluate(() => window.antiAgentExperiment.readback().dataUrl);
      writeFileSync(join(temporary, 'reference.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
      input = ['-loop', '1', '-framerate', '1', '-i', join(temporary, 'reference.png')];
    } finally { await browser.close(); }
  }
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...input, '-t', '2', '-an', '-c:v', 'libx264', '-profile:v', 'baseline', '-pix_fmt', 'yuv420p', '-g', '1', '-movflags', '+faststart', join(temporary, 'solid.mp4')], { stdio: 'inherit' });
  if (control || interfaceVideo) copyFileSync(join(temporary, 'solid.mp4'), join(output, 'clear-video.mp4'));
  // These are PUBLIC DEVELOPMENT credentials published in Shaka Packager's tutorial.
  // They are not application secrets and must never be used for production media.
  execFileSync(packager, [
    `in=${join(temporary, 'solid.mp4')},stream=video,output=encrypted-video.mp4`,
    '--enable_widevine_encryption', '--key_server_url', 'https://license.uat.widevine.com/cenc/getcontentkey/widevine_test',
    '--content_id', Buffer.from(interfaceVideo ? 'anti-agent-reference-ui-v1' : control ? 'anti-agent-quadrants-64-v1' : 'anti-agent-solid-16-v1').toString('hex'), '--signer', 'widevine_test',
    '--aes_signing_key', '1ae8ccd0e7985cc0b6203a55855a1034afc252980e970ca90e5202689f947ab9',
    '--aes_signing_iv', 'd58ce954203b7c9a9a9d467f59839249', '--clear_lead', '0', '--mpd_output', 'encrypted-video.mpd',
  ], { cwd: output, stdio: 'inherit' });
  writeFileSync(join(output, 'asset.json'), JSON.stringify({ resolution: [size, height], pattern: interfaceVideo ? 'reference-interface' : control ? 'red-green-blue-yellow-quadrants' : 'black', durationSeconds: 2, frameRate: 1, audio: false, clearLeadSeconds: 0, encryption: 'Widevine CENC', licenseServerUrl: 'https://proxy.uat.widevine.com/proxy', generationSource: 'https://shaka-project.github.io/shaka-packager/html/tutorials/widevine.html', packagerVersion: '3.9.3', bytes: readFileSync(join(output, 'encrypted-video.mp4')).length, productionUse: false }, null, 2) + '\n');
} finally { rmSync(temporary, { recursive: true, force: true }); }
