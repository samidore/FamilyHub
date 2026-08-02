import { defineConfig, devices } from '@playwright/test';

const environment = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};
const repository = (environment.GITHUB_REPOSITORY ?? '').split('/')[1];
const projectSite = repository && !repository.endsWith('.github.io');
const basePath = environment.GITHUB_ACTIONS === 'true' && projectSite ? `/${repository}/` : '/';
const previewUrl = `http://127.0.0.1:4321${basePath}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: previewUrl,
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
  },
  webServer: {
    command: 'node ./node_modules/astro/astro.js preview --host 127.0.0.1 --port 4321',
    url: previewUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
