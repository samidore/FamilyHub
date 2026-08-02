import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
  },
  webServer: {
    command: 'node ./node_modules/astro/astro.js preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
