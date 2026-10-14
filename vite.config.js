import { defineConfig } from 'vite';

export default defineConfig({
  build: { rolldownOptions: { input: { experiment: 'index.html', combinedDefense: 'combined-defense.html', protectedUI: 'protected-ui.html', automationLab: 'automation-lab.html', randomizedCanvas: 'randomized-canvas.html', stackProbe: 'stack-probe.html', decoyLab: 'decoy-lab.html', shadowLab: 'shadow-lab.html', workerLab: 'worker-lab.html', hardeningLab: 'hardening-lab.html', tamperLab: 'tamper-lab.html', captureSignals: 'capture-signals.html', captureTiming: 'capture-timing.html', captureCover: 'capture-cover.html', webgpuCapture: 'webgpu-capture.html' } } },
});
