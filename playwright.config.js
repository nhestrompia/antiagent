import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chrome', viewport: { width: 1280, height: 900 }, launchOptions: { ignoreDefaultArgs: ['--disable-component-update', '--disable-component-extensions-with-background-pages', '--disable-background-networking', '--no-sandbox'] } },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
