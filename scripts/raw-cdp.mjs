import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function launchRawCDP({ headless = true } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'antiagent-raw-'));
  const child = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled', ...(headless ? ['--headless=new'] : []), 'about:blank',
  ], { stdio: 'ignore' });
  let socket;
  const pending = new Map();
  const listeners = new Map();
  const commands = [];
  let nextId = 0;
  async function close() {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('CDP session closed')); }
    pending.clear();
    listeners.clear();
    socket?.close();
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill('SIGTERM');
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2000))]);
    }
    if (child.exitCode !== null || child.signalCode !== null) await rm(profile, { recursive: true, force: true });
  }
  try {
    let endpoint;
    for (let i = 0; i < 100; i++) {
      try {
        const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
        endpoint = `ws://127.0.0.1:${port}${path}`; break;
      } catch {}
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Chrome exited before opening CDP');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!endpoint) throw new Error('Chrome did not open CDP');
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method) {
        for (const listener of listeners.get(`${message.sessionId || ''}:${message.method}`) || []) listener(message.params);
        return;
      }
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    });
    function send(method, params = {}, sessionId) {
      commands.push(method);
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    }
    function onEvent(method, sessionId, listener) {
      const key = `${sessionId || ''}:${method}`;
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(listener);
      return () => { listeners.get(key)?.delete(listener); if (!listeners.get(key)?.size) listeners.delete(key); };
    }
    return { send, commands, close, onEvent };
  } catch (error) { await close(); throw error; }
}
