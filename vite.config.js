import { defineConfig } from 'vite';

export default defineConfig({
  build: { rolldownOptions: { input: { experiment: 'index.html', protectedUI: 'protected-ui.html' } } },
});
