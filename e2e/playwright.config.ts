import { defineConfig, devices } from '@playwright/test';

/**
 * Mini Mall E2E configuration.
 *
 * Backend targets a dedicated mini_mall_e2e database (see backend/scripts/
 * seed-e2e.ts). The `pretest` npm hook seeds that database before Playwright
 * starts the web servers, so the backend can authenticate on boot.
 *
 * Frontend runs its normal Vite dev server; requests to /api proxy through
 * to the backend exactly as they do in development.
 */
export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run e2e:dev',
      cwd: '../backend',
      url: 'http://localhost:3001/api/products',
      // Always start our own backend/frontend so E2E runs against the
      // mini_mall_e2e DB — reusing a dev server that points at a different
      // database is a silent footgun.
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      // Always start our own backend/frontend so E2E runs against the
      // mini_mall_e2e DB — reusing a dev server that points at a different
      // database is a silent footgun.
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
