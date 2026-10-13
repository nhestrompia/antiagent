import shaka from 'shaka-player/dist/shaka-player.compiled.js';

export const publicAsset = {
  name: 'Anti-Agent solid-color development asset',
  manifestUrl: new URL('/drm/encrypted-video.mpd', location.origin).href,
  licenseServerUrl: 'https://proxy.uat.widevine.com/proxy',
  source: 'https://shaka-project.github.io/shaka-packager/html/tutorials/widevine.html',
  tinyAsset: true,
  encryptedStart: 0,
};
export const sintelAsset = {
  name: 'Shaka Sintel Widevine baseline',
  manifestUrl: 'https://storage.googleapis.com/shaka-demo-assets/sintel-widevine/dash.mpd',
  licenseServerUrl: 'https://cwip-shaka-proxy.appspot.com/no_auth',
  source: 'https://shaka-project.github.io/shaka-player/docs/api/tutorial-license-server-auth.html',
  tinyAsset: false,
  encryptedStart: 12,
};

export function validateConfig(config) {
  for (const key of ['manifestUrl', 'licenseServerUrl']) {
    const url = new URL(config[key]);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error(`${key} must use HTTPS or localhost.`);
  }
  if (!config.headers || Array.isArray(config.headers) || typeof config.headers !== 'object' || Object.values(config.headers).some(value => typeof value !== 'string')) throw new Error('License headers must be a JSON object with string values.');
  if (!Number.isFinite(config.encryptedStart) || config.encryptedStart < 0) throw new Error('Encrypted start time must be a non-negative number.');
}

export class DRMRuntime {
  constructor(video, onChange) {
    this.video = video;
    this.onChange = onChange;
    this.player = null;
    this.frames = 0;
    this.lastTime = 0;
    this.lastAdvance = 0;
    this.encryptedStart = 0;
    this.operation = 0;
    this.state = { supported: null, phase: 'idle', playing: false, encrypted: false, usableKeys: false, protectedPlayback: false, captureProtectionVerified: null, error: null };
    for (const event of ['playing', 'pause', 'waiting', 'error', 'ended', 'timeupdate']) video.addEventListener(event, () => this.sample());
    this.monitor = setInterval(() => this.sample(), 500);
  }

  update(patch) { Object.assign(this.state, patch); this.onChange(this.state); }

  sample() {
    const video = this.video;
    const advancing = !video.paused && video.currentTime !== this.lastTime && video.readyState >= 2;
    if (advancing) { this.frames++; this.lastAdvance = performance.now(); }
    this.lastTime = video.currentTime;
    const keySystem = this.player?.keySystem() || null;
    const statuses = this.player?.getKeyStatuses() || {};
    const usableKeys = Object.values(statuses).includes('usable');
    const encrypted = Boolean(video.mediaKeys && keySystem === 'com.widevine.alpha');
    const playing = video.isConnected && !video.paused && video.readyState >= 2;
    this.update({ playing, encrypted, usableKeys, keySystem, currentTime: video.currentTime, dimensions: [video.videoWidth, video.videoHeight], protectedPlayback: playing && this.frames > 0 && performance.now() - this.lastAdvance < 1500 && encrypted && usableKeys && video.currentTime >= this.encryptedStart,
      ...(!video.isConnected ? { phase: 'removed', error: 'Protected media element was removed. Reload to restore it.' } : {}),
    });
  }

  async start(config) {
    validateConfig(config);
    await this.stop();
    const operation = this.operation;
    this.encryptedStart = config.encryptedStart;
    this.update({ phase: 'initializing', error: null, supported: null });
    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported() || !navigator.requestMediaKeySystemAccess) { this.update({ supported: false, phase: 'unsupported', error: 'Media Source Extensions or encrypted media is unavailable.' }); return; }
    try {
      const support = await shaka.Player.probeSupport();
      if (operation !== this.operation) return;
      const available = Boolean(support.drm['com.widevine.alpha']);
      this.update({ supported: available });
      if (!available) { this.update({ phase: 'unsupported', error: 'Widevine is unavailable in this browser. Use installed Chrome.' }); return; }
      const player = new shaka.Player();
      this.player = player;
      await player.attach(this.video);
      if (operation !== this.operation) return;
      player.addEventListener('error', event => this.update({ phase: 'error', error: `Shaka error ${event.detail.code}`, protectedPlayback: false }));
      player.configure({ drm: { servers: { 'com.widevine.alpha': config.licenseServerUrl }, preferredKeySystems: ['com.widevine.alpha'], advanced: { 'com.widevine.alpha': { headers: config.headers } } }, abr: { enabled: false }, restrictions: { maxHeight: 240 }, streaming: { bufferingGoal: 5, rebufferingGoal: 2 }, manifest: { disableAudio: true, disableText: true } });
      await player.load(config.manifestUrl, config.encryptedStart);
      if (operation !== this.operation) return;
      await this.video.play();
      this.update({ phase: 'playing' });
    } catch (error) { if (operation === this.operation) this.update({ phase: 'error', error: error.code ? `Shaka error ${error.code}` : `${error.name}: ${error.message}`, protectedPlayback: false }); }
  }

  async stop() {
    this.operation++;
    this.video.pause();
    if (this.player) { const player = this.player; this.player = null; await player.destroy(); }
    this.frames = 0;
    this.lastTime = 0;
    this.lastAdvance = 0;
    this.update({ phase: 'idle', playing: false, encrypted: false, usableKeys: false, protectedPlayback: false, error: null });
  }

  stats() { return this.player?.getStats() || null; }
}
