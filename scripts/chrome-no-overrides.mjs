import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

export async function launchChromeWithoutOverrides() {
  const profile = await mkdtemp(join(tmpdir(), 'antiagent-hidden-'));
  const process = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', 'about:blank',
  ], { stdio: 'ignore' });
  let browser;
  async function close() {
    if (browser) {
      try { const session = await browser.newBrowserCDPSession(); await session.send('Browser.close'); } catch {}
      await browser.close().catch(() => {});
    }
    if (process.exitCode === null && process.signalCode === null) {
      const exited = new Promise(resolve => process.once('exit', resolve));
      process.kill('SIGTERM');
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2000))]);
    }
    if (process.exitCode !== null || process.signalCode !== null) await rm(profile, {recursive:true,force:true});
  }
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch {}
      if (process.exitCode !== null || process.signalCode !== null) throw new Error('Isolated Chrome exited before opening CDP');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!port) throw new Error('Isolated Chrome did not open CDP within five seconds');
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true });
    return {browser,close};
  } catch (error) { await close(); throw error; }
}
