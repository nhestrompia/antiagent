import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const packager = process.env.PACKAGER;
if (!packager) throw new Error('Set PACKAGER to the official Shaka Packager executable. See README.md.');
const output = resolve('public/drm');
const temporary = mkdtempSync(join(tmpdir(), 'anti-agent-media-'));
mkdirSync(output, { recursive: true });
try {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=16x16:r=1', '-t', '2', '-an', '-c:v', 'libx264', '-profile:v', 'baseline', '-pix_fmt', 'yuv420p', '-g', '1', '-movflags', '+faststart', join(temporary, 'solid.mp4')], { stdio: 'inherit' });
  // These are PUBLIC DEVELOPMENT credentials published in Shaka Packager's tutorial.
  // They are not application secrets and must never be used for production media.
  execFileSync(packager, [
    `in=${join(temporary, 'solid.mp4')},stream=video,output=encrypted-video.mp4`,
    '--enable_widevine_encryption', '--key_server_url', 'https://license.uat.widevine.com/cenc/getcontentkey/widevine_test',
    '--content_id', Buffer.from('anti-agent-solid-16-v1').toString('hex'), '--signer', 'widevine_test',
    '--aes_signing_key', '1ae8ccd0e7985cc0b6203a55855a1034afc252980e970ca90e5202689f947ab9',
    '--aes_signing_iv', 'd58ce954203b7c9a9a9d467f59839249', '--clear_lead', '0', '--mpd_output', 'encrypted-video.mpd',
  ], { cwd: output, stdio: 'inherit' });
  writeFileSync(join(output, 'asset.json'), JSON.stringify({ resolution: [16, 16], durationSeconds: 2, frameRate: 1, audio: false, clearLeadSeconds: 0, encryption: 'Widevine CENC', licenseServerUrl: 'https://proxy.uat.widevine.com/proxy', generationSource: 'https://shaka-project.github.io/shaka-packager/html/tutorials/widevine.html', packagerVersion: '3.9.3', bytes: readFileSync(join(output, 'encrypted-video.mp4')).length, productionUse: false }, null, 2) + '\n');
} finally { rmSync(temporary, { recursive: true, force: true }); }
