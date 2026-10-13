import { defineConfig } from 'vite';

export default defineConfig({
  build: { rolldownOptions: { input: { experiment: 'index.html', protectedUI: 'protected-ui.html', automationLab: 'automation-lab.html', randomizedCanvas: 'randomized-canvas.html', stackProbe: 'stack-probe.html', decoyLab: 'decoy-lab.html' } } },
});
